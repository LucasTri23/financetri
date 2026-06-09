// Portado 1:1 de legacy-static/js/pdfParser.js — mesma lógica de parsing,
// tipagem TypeScript adicionada sem alterar o comportamento.

const MESES: Record<string, number> = {
  JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5,
  JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11,
};

const TOLERANCIA_Y = 4;
const LIMIAR_ESPACO_X = 0.6;

export type Transacao = {
  data: Date;
  dataTexto: string;
  descricao: string;
  valor: number;
  parcelaAtual: number | null;
  totalParcelas: number | null;
  ehParcelado: boolean;
  ehEntradaNegativa: boolean;
  bruto: string;
  tipo?: string;
  categoria?: string;
};

type Item = { texto: string; x: number; y: number; largura: number };
type Linha = { y: number; itens: Item[] };
type Segmento = { texto: string; valorBruto: string };
type Contexto = { anoFatura?: number; anoReferencia: number; mesFechamentoProxima?: number | null; mesReferencia?: number | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfjsLib = any;

function juntarTextoDosItens(itens: Item[]): string {
  let resultado = "";
  let fimAnterior: number | null = null;
  for (const item of itens) {
    if (fimAnterior !== null && item.x - fimAnterior > LIMIAR_ESPACO_X) {
      resultado += " ";
    }
    resultado += item.texto;
    fimAnterior = item.x + (item.largura || 0);
  }
  return resultado.replace(/\s+/g, " ").trim();
}

function normalizarValor(bruto: string): number {
  const negativo = bruto.includes("−") || bruto.trim().startsWith("-");
  const numero = bruto.replace(/[−R$\s-]/g, "").replace(/\./g, "").replace(",", ".");
  const valor = parseFloat(numero);
  return negativo ? -Math.abs(valor) : Math.abs(valor);
}

function montarLinhasDaPagina(textContent: { items: { str: string; transform: number[]; width: number }[] }): Linha[] {
  const itens: Item[] = textContent.items
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({ texto: item.str, x: item.transform[4], y: item.transform[5], largura: item.width }));

  const linhas: Linha[] = [];
  for (const item of itens) {
    let linha = linhas.find((l) => Math.abs(l.y - item.y) <= TOLERANCIA_Y);
    if (!linha) {
      linha = { y: item.y, itens: [] };
      linhas.push(linha);
    }
    linha.itens.push(item);
  }

  linhas.sort((a, b) => b.y - a.y);
  for (const linha of linhas) {
    linha.itens.sort((a, b) => a.x - b.x);
  }
  return linhas;
}

function separarValorDaLinha(linha: Linha, regexValor: RegExp): Segmento[] {
  const itens = linha.itens;
  if (itens.length === 0) return [];

  const segmentos: Segmento[] = [];
  let acumulado: Item[] = [];
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

// ── Nubank ───────────────────────────────────────────────────────────────────

const RE_DATA_NUBANK = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\b\s*/i;
const RE_VALOR_NUBANK = /^[−-]?R\$\s*-?[\d.]+,\d{2}$/;
const RE_PARCELA_NUBANK = /Parcela\s+(\d{1,2})\s*\/\s*(\d{1,2})/i;
const RE_CARTAO_NUBANK = /^[•·]{2,4}\s*\d{4}\s*/;
const RE_ANO_FATURA_NUBANK = /FATURA\s+\d{2}\s+[A-Z]{3}\s+(\d{4})/i;
const RE_FECHAMENTO_NUBANK = /Fechamento da pr[oó]xima fatura\s+\d{2}\s+([A-Z]{3})\s+(\d{4})/i;

function inferirAnoNubank(mesTransacao: number, contexto: Contexto): number {
  if (contexto.mesFechamentoProxima != null && mesTransacao > contexto.mesFechamentoProxima) {
    return (contexto.anoFatura ?? contexto.anoReferencia) - 1;
  }
  return contexto.anoFatura ?? contexto.anoReferencia;
}

function interpretarNubank(texto: string, valorBruto: string, contexto: Contexto): Transacao | null {
  const matchData = texto.match(RE_DATA_NUBANK);
  if (!matchData) return null;

  const dia = parseInt(matchData[1], 10);
  const mes = MESES[matchData[2].toUpperCase()];
  let resto = texto.slice(matchData[0].length);
  resto = resto.replace(RE_CARTAO_NUBANK, "").trim();

  const matchParcela = resto.match(RE_PARCELA_NUBANK);
  const parcelaAtual = matchParcela ? parseInt(matchParcela[1], 10) : null;
  const totalParcelas = matchParcela ? parseInt(matchParcela[2], 10) : null;
  const descricao = resto.replace(RE_PARCELA_NUBANK, "").replace(/\s*-\s*$/, "").replace(/["""]/g, "").trim();

  const ano = inferirAnoNubank(mes, contexto);
  const data = new Date(ano, mes, dia);
  const valor = normalizarValor(valorBruto);

  return {
    data, dataTexto: data.toISOString().slice(0, 10),
    descricao: descricao || resto, valor,
    parcelaAtual, totalParcelas, ehParcelado: parcelaAtual !== null && totalParcelas !== null,
    ehEntradaNegativa: valor < 0, bruto: texto,
  };
}

function extrairContextoNubank(textoCompleto: string): Contexto {
  let anoFatura = new Date().getFullYear();
  const matchAno = textoCompleto.match(RE_ANO_FATURA_NUBANK);
  if (matchAno) anoFatura = parseInt(matchAno[1], 10);

  let mesFechamentoProxima: number | null = null;
  const matchFechamento = textoCompleto.match(RE_FECHAMENTO_NUBANK);
  if (matchFechamento) mesFechamentoProxima = MESES[matchFechamento[1].toUpperCase()];

  return { anoFatura, anoReferencia: anoFatura, mesFechamentoProxima };
}

// ── Itaú ─────────────────────────────────────────────────────────────────────

const RE_DATA_ITAU = /^(\d{2})\/(\d{2})\s+/;
const RE_VALOR_ITAU = /^-?[\d.]+,\d{2}$/;
const RE_PARCELA_ITAU = /(\d{1,2})\/(\d{1,2})\s*$/;
const RE_EMISSAO_ITAU = /Emiss[ãa]o:\s*\d{2}\/(\d{2})\/(\d{4})/i;
const RE_PARAR_COLETA_ITAU = /Compras parceladas|Total dos lan[cç]amentos atuais/i;

function inferirAnoItau(mesTransacao: number, contexto: Contexto): number {
  if (contexto.mesReferencia != null && mesTransacao > contexto.mesReferencia) {
    return contexto.anoReferencia - 1;
  }
  return contexto.anoReferencia;
}

function interpretarItau(texto: string, valorBruto: string, contexto: Contexto): Transacao | null {
  const matchData = texto.match(RE_DATA_ITAU);
  if (!matchData) return null;

  const dia = parseInt(matchData[1], 10);
  const mes = parseInt(matchData[2], 10) - 1;
  const resto = texto.slice(matchData[0].length).trim();

  const matchParcela = resto.match(RE_PARCELA_ITAU);
  const parcelaAtual = matchParcela ? parseInt(matchParcela[1], 10) : null;
  const totalParcelas = matchParcela ? parseInt(matchParcela[2], 10) : null;
  const descricao = (matchParcela ? resto.slice(0, matchParcela.index) : resto)
    .replace(/\s+/g, " ").replace(/["""]/g, "").trim();

  const ano = inferirAnoItau(mes, contexto);
  const data = new Date(ano, mes, dia);
  const valor = normalizarValor(valorBruto);

  return {
    data, dataTexto: data.toISOString().slice(0, 10),
    descricao: descricao || resto, valor,
    parcelaAtual, totalParcelas, ehParcelado: parcelaAtual !== null && totalParcelas !== null,
    ehEntradaNegativa: valor < 0, bruto: texto,
  };
}

function extrairContextoItau(textoCompleto: string): Contexto {
  let anoReferencia = new Date().getFullYear();
  let mesReferencia: number | null = null;
  const matchEmissao = textoCompleto.match(RE_EMISSAO_ITAU);
  if (matchEmissao) {
    mesReferencia = parseInt(matchEmissao[1], 10) - 1;
    anoReferencia = parseInt(matchEmissao[2], 10);
  }
  return { anoReferencia, mesReferencia };
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

const FORMATOS = {
  nubank: { regexValor: RE_VALOR_NUBANK, regexData: RE_DATA_NUBANK, extrairContexto: extrairContextoNubank, interpretarLinha: interpretarNubank, regexPararColeta: null as RegExp | null },
  itau:   { regexValor: RE_VALOR_ITAU,   regexData: RE_DATA_ITAU,   extrairContexto: extrairContextoItau,   interpretarLinha: interpretarItau,   regexPararColeta: RE_PARAR_COLETA_ITAU },
};

function detectarFormato(textoCompleto: string) {
  return /ita[uú]/i.test(textoCompleto) ? FORMATOS.itau : FORMATOS.nubank;
}

export async function parseFaturaPdf(
  pdfjsLib: PdfjsLib,
  arrayBuffer: ArrayBuffer,
): Promise<{ transacoes: Transacao[]; anoFaturaDetectado: number }> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const linhasPorPagina: Linha[][] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n);
    const textContent = await pagina.getTextContent();
    linhasPorPagina.push(montarLinhasDaPagina(textContent));
  }

  const textoCompleto = linhasPorPagina
    .flat()
    .map((l) => juntarTextoDosItens(l.itens))
    .join("\n");

  const formato = detectarFormato(textoCompleto);
  const contexto = formato.extrairContexto(textoCompleto);

  const transacoes: Transacao[] = [];
  let pararColeta = false;
  for (const linhas of linhasPorPagina) {
    for (const linha of linhas) {
      if (formato.regexPararColeta) {
        if (formato.regexPararColeta.test(juntarTextoDosItens(linha.itens))) pararColeta = true;
      }
      if (pararColeta) continue;

      for (const segmento of separarValorDaLinha(linha, formato.regexValor)) {
        if (!formato.regexData.test(segmento.texto)) continue;
        const t = formato.interpretarLinha(segmento.texto, segmento.valorBruto, contexto);
        if (t) transacoes.push(t);
      }
    }
  }

  return { transacoes, anoFaturaDetectado: contexto.anoReferencia };
}
