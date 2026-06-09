export function formatarMoeda(valor: number | string | null | undefined): string {
  const num = Number(valor ?? 0);
  return (isNaN(num) ? 0 : num).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(data: string | null | undefined): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function mesAtual(): { inicio: string; fim: string; ano: number; mes: number } {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fim = new Date(ano, mes, 1).toISOString().slice(0, 10);
  return { inicio, fim, ano, mes };
}

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function calcularProximoVencimento(dataCompra: string): string {
  const data = new Date(`${dataCompra}T00:00:00`);
  data.setMonth(data.getMonth() + 1);
  return data.toISOString().slice(0, 10);
}
