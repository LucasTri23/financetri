// Parser de faturas em PDF. Extrai o texto com pdf.js, reconstrói as linhas
// pela posição (x, y) dos itens e aplica regras para reconhecer transações,
// valores e parcelamentos. Suporta dois layouts conhecidos — Nubank e Itaú —
// detectados automaticamente a partir do texto da fatura.
// O resultado é heurístico — a tela de revisão permite corrigir antes de salvar.

const MESES = {
  JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5,
  JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11,
};

const TOLERANCIA_Y = 4; // px de diferença de baseline considerados a mesma linha
const LIMIAR_ESPACO_X = 0.6; // lacuna horizontal mínima para considerar uma palavra separada

// Junta os textos de uma sequência de itens (já ordenados da esquerda para a
// direita) em uma única string, inserindo espaço só onde existe uma lacuna
// horizontal real entre os itens. Necessário porque alguns extratores de PDF
// (ex.: o pdf.js usado no navegador, para esta fatura) quebram palavras
// acentuadas em itens separados sem espaço real entre eles — juntar tudo com
// um espaço fixo produziria "Ita ú" em vez de "Itaú".
function juntarTextoDosItens(itens) {
  let resultado = '';
  let fimAnterior = null;
  for (const item of itens) {
    if (fimAnterior !== null && item.x - fimAnterior > LIMIAR_ESPACO_X) {
      resultado += ' ';
    }
    resultado += item.texto;
    fimAnterior = item.x + (item.largura || 0);
  }
  return resultado.replace(/\s+/g, ' ').trim();
}

function normalizarValor(bruto) {
  const negativo = bruto.includes('−') || bruto.trim().startsWith('-');
  const numero = bruto
    .replace(/[−R$\s-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const valor = parseFloat(numero);
  return negativo ? -Math.abs(valor) : Math.abs(valor);
}

// Agrupa os itens de texto de uma página em linhas, com base na posição vertical,
// e ordena cada linha da esquerda para a direita.
function montarLinhasDaPagina(textContent) {
  const itens = textContent.items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({
      texto: item.str,
      x: item.transform[4],
      y: item.transform[5],
      largura: item.width,
    }));

  const linhas = [];
  for (const item of itens) {
    let linha = linhas.find((l) => Math.abs(l.y - item.y) <= TOLERANCIA_Y);
    if (!linha) {
      linha = { y: item.y, itens: [] };
      linhas.push(linha);
    }
    linha.itens.push(item);
  }

  // pdf.js mede y de baixo para cima; ordenar do topo para a base da página
  linhas.sort((a, b) => b.y - a.y);
  for (const linha of linhas) {
    linha.itens.sort((a, b) => a.x - b.x);
  }
  return linhas;
}

// Recebe uma linha (itens ordenados por x) e a divide em segmentos
// "texto + valor" sempre que encontra um item que casa com o regex de valor.
// Necessário porque algumas faturas (ex.: Itaú) têm layout em colunas e duas
// transações distintas acabam na mesma linha de texto reconstruída.
function separarValorDaLinha(linha, regexValor) {
  const itens = linha.itens;
  if (itens.length === 0) return [];

  const segmentos = [];
  let acumulado = [];
  for (const item of itens) {
    const textoItem = item.texto.trim();
    if (regexValor.test(textoItem)) {
      const texto = juntarTextoDosItens(acumulado);
      segmentos.push({ texto, valorBruto: textoItem });
      acumulado = [];
    } else {
      acumulado.push(item);
    }
  }
  return segmentos;
}

// ---------------------------------------------------------------------------
// Layout Nubank: datas como "08 ABR", valores "R$ 123,45", parcela "Parcela 3/12"
// ---------------------------------------------------------------------------

const RE_DATA_NUBANK = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\b\s*/i;
const RE_VALOR_NUBANK = /^[−-]?R\$\s*-?[\d.]+,\d{2}$/;
const RE_PARCELA_NUBANK = /Parcela\s+(\d{1,2})\s*\/\s*(\d{1,2})/i;
const RE_CARTAO_NUBANK = /^[•·]{2,4}\s*\d{4}\s*/;
const RE_ANO_FATURA_NUBANK = /FATURA\s+\d{2}\s+[A-Z]{3}\s+(\d{4})/i;
const RE_FECHAMENTO_NUBANK = /Fechamento da pr[oó]xima fatura\s+\d{2}\s+([A-Z]{3})\s+(\d{4})/i;

function inferirAnoNubank(mesTransacao, contexto) {
  if (contexto.mesFechamentoProxima !== null && mesTransacao > contexto.mesFechamentoProxima) {
    return contexto.anoFatura - 1;
  }
  return contexto.anoFatura;
}

function interpretarLinhaDeTransacaoNubank(texto, valorBruto, contexto) {
  const matchData = texto.match(RE_DATA_NUBANK);
  if (!matchData) return null;

  const dia = parseInt(matchData[1], 10);
  const mes = MESES[matchData[2].toUpperCase()];
  let resto = texto.slice(matchData[0].length);

  resto = resto.replace(RE_CARTAO_NUBANK, '').trim();

  const matchParcela = resto.match(RE_PARCELA_NUBANK);
  const parcelaAtual = matchParcela ? parseInt(matchParcela[1], 10) : null;
  const totalParcelas = matchParcela ? parseInt(matchParcela[2], 10) : null;

  const descricao = resto
    .replace(RE_PARCELA_NUBANK, '')
    .replace(/\s*-\s*$/, '')
    .replace(/["“”]/g, '')
    .trim();

  const ano = inferirAnoNubank(mes, contexto);
  const data = new Date(ano, mes, dia);
  const valor = normalizarValor(valorBruto);

  return {
    data,
    dataTexto: data.toISOString().slice(0, 10),
    descricao: descricao || resto,
    valor,
    parcelaAtual,
    totalParcelas,
    ehParcelado: parcelaAtual !== null && totalParcelas !== null,
    ehEntradaNegativa: valor < 0, // pagamentos/estornos aparecem com valor negativo
    bruto: texto,
  };
}

function extrairContextoNubank(textoCompleto) {
  let anoFatura = new Date().getFullYear();
  const matchAno = textoCompleto.match(RE_ANO_FATURA_NUBANK);
  if (matchAno) anoFatura = parseInt(matchAno[1], 10);

  let mesFechamentoProxima = null;
  const matchFechamento = textoCompleto.match(RE_FECHAMENTO_NUBANK);
  if (matchFechamento) {
    mesFechamentoProxima = MESES[matchFechamento[1].toUpperCase()];
  }

  return { anoFatura, mesFechamentoProxima, anoReferencia: anoFatura };
}

// ---------------------------------------------------------------------------
// Layout Itaú: datas como "08/04", valores simples "123,45" (sem "R$"),
// parcela embutida na descrição como "01/02" logo antes do valor.
// A fatura também lista, no fim, uma prévia das parcelas futuras de compras
// já lançadas ("Compras parceladas - próximas faturas") — essas linhas têm
// o mesmo formato de uma transação, mas não são novos lançamentos, então
// paramos de coletar ao encontrar essa seção.
// ---------------------------------------------------------------------------

const RE_DATA_ITAU = /^(\d{2})\/(\d{2})\s+/;
const RE_VALOR_ITAU = /^-?[\d.]+,\d{2}$/;
const RE_PARCELA_ITAU = /(\d{1,2})\/(\d{1,2})\s*$/;
const RE_EMISSAO_ITAU = /Emiss[ãa]o:\s*\d{2}\/(\d{2})\/(\d{4})/i;
const RE_PARAR_COLETA_ITAU = /Compras parceladas|Total dos lan[cç]amentos atuais/i;

function inferirAnoItau(mesTransacao, contexto) {
  if (contexto.mesReferencia !== null && mesTransacao > contexto.mesReferencia) {
    return contexto.anoReferencia - 1;
  }
  return contexto.anoReferencia;
}

function interpretarLinhaDeTransacaoItau(texto, valorBruto, contexto) {
  const matchData = texto.match(RE_DATA_ITAU);
  if (!matchData) return null;

  const dia = parseInt(matchData[1], 10);
  const mes = parseInt(matchData[2], 10) - 1;
  const resto = texto.slice(matchData[0].length).trim();

  const matchParcela = resto.match(RE_PARCELA_ITAU);
  const parcelaAtual = matchParcela ? parseInt(matchParcela[1], 10) : null;
  const totalParcelas = matchParcela ? parseInt(matchParcela[2], 10) : null;

  const descricao = (matchParcela ? resto.slice(0, matchParcela.index) : resto)
    .replace(/\s+/g, ' ')
    .replace(/["“”]/g, '')
    .trim();

  const ano = inferirAnoItau(mes, contexto);
  const data = new Date(ano, mes, dia);
  const valor = normalizarValor(valorBruto);

  return {
    data,
    dataTexto: data.toISOString().slice(0, 10),
    descricao: descricao || resto,
    valor,
    parcelaAtual,
    totalParcelas,
    ehParcelado: parcelaAtual !== null && totalParcelas !== null,
    ehEntradaNegativa: valor < 0, // pagamentos da fatura aparecem com valor negativo
    bruto: texto,
  };
}

function extrairContextoItau(textoCompleto) {
  let anoReferencia = new Date().getFullYear();
  let mesReferencia = null;

  const matchEmissao = textoCompleto.match(RE_EMISSAO_ITAU);
  if (matchEmissao) {
    mesReferencia = parseInt(matchEmissao[1], 10) - 1;
    anoReferencia = parseInt(matchEmissao[2], 10);
  }

  return { anoReferencia, mesReferencia };
}

// ---------------------------------------------------------------------------

const FORMATOS = {
  nubank: {
    regexValor: RE_VALOR_NUBANK,
    regexData: RE_DATA_NUBANK,
    extrairContexto: extrairContextoNubank,
    interpretarLinha: interpretarLinhaDeTransacaoNubank,
    regexPararColeta: null,
  },
  itau: {
    regexValor: RE_VALOR_ITAU,
    regexData: RE_DATA_ITAU,
    extrairContexto: extrairContextoItau,
    interpretarLinha: interpretarLinhaDeTransacaoItau,
    regexPararColeta: RE_PARAR_COLETA_ITAU,
  },
};

function detectarFormato(textoCompleto) {
  if (/ita[uú]/i.test(textoCompleto)) return FORMATOS.itau;
  return FORMATOS.nubank;
}

// Recebe a biblioteca pdf.js já carregada (módulo ES) e um ArrayBuffer com o
// conteúdo do PDF, e devolve a lista de transações detectadas.
export async function parseFaturaPdf(pdfjsLib, arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const linhasPorPagina = [];
  for (let n = 1; n <= pdf.numPages; n += 1) {
    const pagina = await pdf.getPage(n);
    const textContent = await pagina.getTextContent();
    linhasPorPagina.push(montarLinhasDaPagina(textContent));
  }

  const todosOsTextos = linhasPorPagina
    .flat()
    .map((l) => juntarTextoDosItens(l.itens));
  const textoCompleto = todosOsTextos.join('\n');

  const formato = detectarFormato(textoCompleto);
  const contexto = formato.extrairContexto(textoCompleto);

  const transacoes = [];
  let pararColeta = false;
  for (const linhas of linhasPorPagina) {
    for (const linha of linhas) {
      if (formato.regexPararColeta) {
        const textoLinha = juntarTextoDosItens(linha.itens);
        if (formato.regexPararColeta.test(textoLinha)) pararColeta = true;
      }
      if (pararColeta) continue;

      const segmentos = separarValorDaLinha(linha, formato.regexValor);
      for (const segmento of segmentos) {
        if (!formato.regexData.test(segmento.texto)) continue;

        const transacao = formato.interpretarLinha(segmento.texto, segmento.valorBruto, contexto);
        if (transacao) transacoes.push(transacao);
      }
    }
  }

  return { transacoes, anoFaturaDetectado: contexto.anoReferencia };
}
