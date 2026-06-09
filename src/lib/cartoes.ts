/** Dado a data de uma transação e o dia de fechamento do cartão,
 *  retorna o mês de referência da fatura ("YYYY-MM").
 *
 *  Regra: se o dia da transação for APÓS o fechamento, a despesa cai
 *  na fatura do mês seguinte. Ex: fechamento=15, compra dia 20/mai →
 *  fatura de junho.
 */
export function calcularMesReferencia(dataStr: string, diaFechamento: number): string {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  if (dia > diaFechamento) {
    if (mes === 12) return `${ano + 1}-01`;
    return `${ano}-${String(mes + 1).padStart(2, "0")}`;
  }
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/** Retorna a data de vencimento de uma fatura.
 *  A fatura de "YYYY-MM" vence no mês seguinte no diaVencimento.
 *  Ex: fatura de maio (2026-05) com vencimento dia 10 → 2026-06-10.
 */
export function calcularDataVencimento(mesReferencia: string, diaVencimento: number): string {
  const [ano, mes] = mesReferencia.split("-").map(Number);
  const [anoV, mesV] = mes === 12 ? [ano + 1, 1] : [ano, mes + 1];
  const dia = String(Math.min(diaVencimento, 28)).padStart(2, "0");
  return `${anoV}-${String(mesV).padStart(2, "0")}-${dia}`;
}

/** Mês de referência da fatura que está aberta hoje (acumulando). */
export function mesAberto(hoje: string, diaFechamento: number): string {
  return calcularMesReferencia(hoje, diaFechamento);
}

/** Formata "YYYY-MM" para "Mês/AAAA" (ex: "mai/2026"). */
export function formatarMesReferencia(mesRef: string): string {
  const [ano, mes] = mesRef.split("-").map(Number);
  const nomes = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${nomes[mes - 1]}/${ano}`;
}

export const BANDEIRAS = [
  { chave: "visa",       rotulo: "Visa" },
  { chave: "mastercard", rotulo: "Mastercard" },
  { chave: "elo",        rotulo: "Elo" },
  { chave: "amex",       rotulo: "Amex" },
  { chave: "hipercard",  rotulo: "Hipercard" },
  { chave: "outro",      rotulo: "Outro" },
] as const;

export const CORES_CARTAO = [
  "#8b5cf6", // violeta
  "#0ea5e9", // azul
  "#ec4899", // rosa
  "#f97316", // laranja
  "#16a34a", // verde
  "#dc2626", // vermelho
  "#0891b2", // ciano
  "#854d0e", // marrom
] as const;
