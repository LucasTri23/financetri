export const ETIQUETAS_EVENTO = [
  { chave: "pessoal",    rotulo: "Pessoal",    cor: "#64748b" },
  { chave: "trabalho",   rotulo: "Trabalho",   cor: "#0ea5e9" },
  { chave: "financeiro", rotulo: "Financeiro", cor: "#dc2626" },
  { chave: "saude",      rotulo: "Saúde",      cor: "#16a34a" },
  { chave: "familia",    rotulo: "Família",    cor: "#a855f7" },
  { chave: "lazer",      rotulo: "Lazer",      cor: "#f97316" },
] as const;

export type ChaveEtiqueta = (typeof ETIQUETAS_EVENTO)[number]["chave"];

export const ETIQUETA_POR_CHAVE = Object.fromEntries(
  ETIQUETAS_EVENTO.map((e) => [e.chave, e]),
) as Record<string, (typeof ETIQUETAS_EVENTO)[number]>;
