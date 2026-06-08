// Parser de faturas em PDF (formato Nubank). Extrai o texto com pdf.js,
// reconstrói as linhas pela posição (x, y) dos itens e aplica regras para
// reconhecer transações, valores e parcelamentos.
// O resultado é heurístico — a tela de revisão permite corrigir antes de salvar.

const MESES = {
  JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5,
  JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11,
};

const RE_DATA_INICIO = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\b\s*/i;
const RE_VALOR = /^[−-]?R\$\s*-?[\d.]+,\d{2}$/;
const RE_PARCELA = /Parcela\s+(\d{1,2})\s*\/\s*(\d{1,2})/i;
const RE_CARTAO = /^[•·]{2,4}\s*\d{4}\s*/;
const RE_ANO_FATURA = /FATURA\s+\d{2}\s+[A-Z]{3}\s+(\d{4})/i;
const RE_FECHAMENTO = /Fechamento da pr[oó]xima fatura\s+\d{2}\s+([A-Z]{3})\s+(\d{4})/i;

const TOLERANCIA_Y = 4; // px de diferença de baseline considerados a mesma linha

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

// Recebe uma linha (itens ordenados por x) e separa o "valor" (item mais à
// direita que parece um valor monetário) do restante do texto da linha.
function separarValorDaLinha(linha) {
  const itens = linha.itens;
  if (itens.length === 0) return null;

  const ultimo = itens[itens.length - 1];
  if (!RE_VALOR.test(ultimo.texto.trim())) return null;

  const texto = itens
    .slice(0, -1)
    .map((i) => i.texto)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { texto, valorBruto: ultimo.texto.trim() };
}

function inferirAno(mesTransacao, anoFatura, mesFechamentoProxima) {
  if (mesFechamentoProxima !== null && mesTransacao > mesFechamentoProxima) {
    return anoFatura - 1;
  }
  return anoFatura;
}

function interpretarLinhaDeTransacao(texto, valorBruto, contexto) {
  const matchData = texto.match(RE_DATA_INICIO);
  if (!matchData) return null;

  const dia = parseInt(matchData[1], 10);
  const mes = MESES[matchData[2].toUpperCase()];
  let resto = texto.slice(matchData[0].length);

  resto = resto.replace(RE_CARTAO, '').trim();

  const matchParcela = resto.match(RE_PARCELA);
  const parcelaAtual = matchParcela ? parseInt(matchParcela[1], 10) : null;
  const totalParcelas = matchParcela ? parseInt(matchParcela[2], 10) : null;

  const descricao = resto
    .replace(RE_PARCELA, '')
    .replace(/\s*-\s*$/, '')
    .replace(/["“”]/g, '')
    .trim();

  const ano = inferirAno(mes, contexto.anoFatura, contexto.mesFechamentoProxima);
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

function extrairContexto(todasAsLinhasDeTexto) {
  const textoCompleto = todasAsLinhasDeTexto.join('\n');

  let anoFatura = new Date().getFullYear();
  const matchAno = textoCompleto.match(RE_ANO_FATURA);
  if (matchAno) anoFatura = parseInt(matchAno[1], 10);

  let mesFechamentoProxima = null;
  const matchFechamento = textoCompleto.match(RE_FECHAMENTO);
  if (matchFechamento) {
    mesFechamentoProxima = MESES[matchFechamento[1].toUpperCase()];
  }

  return { anoFatura, mesFechamentoProxima };
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
    .map((l) => l.itens.map((i) => i.texto).join(' '));
  const contexto = extrairContexto(todosOsTextos);

  const transacoes = [];
  for (const linhas of linhasPorPagina) {
    for (const linha of linhas) {
      const separada = separarValorDaLinha(linha);
      if (!separada) continue;
      if (!RE_DATA_INICIO.test(separada.texto)) continue;

      const transacao = interpretarLinhaDeTransacao(
        separada.texto,
        separada.valorBruto,
        contexto,
      );
      if (transacao) transacoes.push(transacao);
    }
  }

  return { transacoes, anoFaturaDetectado: contexto.anoFatura };
}
