import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { Cartao } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { CelulaTabela, LinhaTabela, TabelaTransacoes } from "@/components/ui/TabelaTransacoes";
import { ROTULO_POR_CATEGORIA } from "@/lib/categorias";
import { formatarData, formatarMoeda } from "@/lib/utils";

import { buscarGastosDoMes } from "./actions";

export const metadata: Metadata = { title: "Saídas — ControleFácil" };

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function calcularMes(mesParam?: string): { ano: number; mes: number; inicio: string; fim: string } {
  const hoje = new Date();
  let ano = hoje.getFullYear();
  let mes = hoje.getMonth() + 1;
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [a, m] = mesParam.split("-").map(Number);
    if (m >= 1 && m <= 12) { ano = a; mes = m; }
  }
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fim = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  return { ano, mes, inicio, fim };
}

export default async function PaginaSaidas({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const { mes: mesParam } = await searchParams;
  const { ano, mes, inicio, fim } = calcularMes(mesParam);

  const mesAnteriorStr = mes === 1
    ? `${ano - 1}-12`
    : `${ano}-${String(mes - 1).padStart(2, "0")}`;
  const mesSeguinteStr = mes === 12
    ? `${ano + 1}-01`
    : `${ano}-${String(mes + 1).padStart(2, "0")}`;

  const itens = await buscarGastosDoMes(userId, inicio, fim);
  const totalMes = itens.reduce((acc, i) => acc + i.valor, 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Saídas</h1>
          <p className="mt-1 text-sm text-cinza">
            {itens.length} lançamento{itens.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/saidas?mes=${mesAnteriorStr}`} className="rounded-xl border border-borda bg-cartao px-3 py-2 text-sm font-semibold text-texto hover:bg-azul-suave transition">←</Link>
          <span className="min-w-[140px] text-center font-bold text-texto">{MESES_PT[mes - 1]} {ano}</span>
          <Link href={`/saidas?mes=${mesSeguinteStr}`} className="rounded-xl border border-borda bg-cartao px-3 py-2 text-sm font-semibold text-texto hover:bg-azul-suave transition">→</Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-extrabold text-vermelho-texto">{formatarMoeda(totalMes)}</span>
          <Link
            href="/saidas/nova"
            className="rounded-xl bg-gradient-to-r from-azul-claro to-azul-escuro px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
          >
            + Nova saída
          </Link>
        </div>
      </div>

      <Cartao titulo="Lançamentos">
        {itens.length === 0 ? (
          <EstadoVazio>Nenhuma saída cadastrada neste mês. <Link href="/saidas/nova" className="font-semibold text-azul-texto hover:underline">Adicionar →</Link></EstadoVazio>
        ) : (
          <TabelaTransacoes colunas={["Data", "Descrição", "Categoria", "Parcela", "Por", "Valor"]}>
            {itens.map((item) => (
              <LinhaTabela key={item.id}>
                <CelulaTabela className="text-cinza">{formatarData(item.data)}</CelulaTabela>
                <CelulaTabela>{item.descricao}</CelulaTabela>
                <CelulaTabela className="text-xs text-cinza">
                  {ROTULO_POR_CATEGORIA[item.categoria] ?? ROTULO_POR_CATEGORIA.outros}
                </CelulaTabela>
                <CelulaTabela className="text-cinza">{item.parcela ?? "—"}</CelulaTabela>
                <CelulaTabela className="text-xs text-cinza">
                  {item.adicionadoPorId === userId ? "Você" : item.adicionadoPor.split("@")[0]}
                </CelulaTabela>
                <CelulaTabela className="font-semibold text-vermelho-texto">
                  {formatarMoeda(item.valor)}
                </CelulaTabela>
              </LinhaTabela>
            ))}
          </TabelaTransacoes>
        )}
      </Cartao>
    </>
  );
}
