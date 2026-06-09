import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/db";
import { dividas, entradas, planoMembros, saidas, users } from "@/db/schema";
import { ROTULO_POR_CATEGORIA } from "@/lib/categorias";
import { buscarIdsDoPlano } from "@/lib/plano";
import { formatarMoeda, mesAtual } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Análises — Controle Financeiro",
};

type Periodo = "semana" | "mes" | "ano";

function calcularIntervalo(periodo: Periodo) {
  const hoje = new Date();
  if (periodo === "semana") {
    const dia = hoje.getDay();
    const offset = dia === 0 ? 6 : dia - 1;
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() - offset);
    const inicio = segunda.toISOString().slice(0, 10);
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    return { inicio, fim: amanha.toISOString().slice(0, 10) };
  }
  if (periodo === "ano") {
    const ano = hoje.getFullYear();
    return { inicio: `${ano}-01-01`, fim: `${ano + 1}-01-01` };
  }
  const { inicio, fim } = mesAtual();
  return { inicio, fim };
}

const ROTULO_PERIODO: Record<Periodo, string> = {
  semana: "Esta semana",
  mes: "Este mês",
  ano: "Este ano",
};

export default async function PaginaAnalises({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const { periodo: periodoParam = "mes" } = await searchParams;
  const periodo = (["semana", "mes", "ano"].includes(periodoParam) ? periodoParam : "mes") as Periodo;
  const { inicio, fim } = calcularIntervalo(periodo);
  const memberIds = await buscarIdsDoPlano(userId);

  const emPlano = memberIds.length > 1;

  const [gastosPorCategoriaSaidas, gastosPorCategoriaDividas, totalEntradas, gastosPorMembro, entradasPorMembro] =
    await Promise.all([
      db
        .select({
          categoria: saidas.categoria,
          total: sql<string>`sum(${saidas.valor})`,
        })
        .from(saidas)
        .where(and(inArray(saidas.usuarioId, memberIds), gte(saidas.data, inicio), lt(saidas.data, fim)))
        .groupBy(saidas.categoria)
        .orderBy(sql`sum(${saidas.valor}) desc`),
      db
        .select({
          categoria: dividas.categoria,
          total: sql<string>`sum(${dividas.valorParcela})`,
        })
        .from(dividas)
        .where(
          and(
            inArray(dividas.usuarioId, memberIds),
            gte(dividas.proximoVencimento, inicio),
            lt(dividas.proximoVencimento, fim),
          ),
        )
        .groupBy(dividas.categoria)
        .orderBy(sql`sum(${dividas.valorParcela}) desc`),
      db
        .select({ total: sql<string>`sum(${entradas.valor})` })
        .from(entradas)
        .where(and(inArray(entradas.usuarioId, memberIds), gte(entradas.data, inicio), lt(entradas.data, fim))),
      emPlano
        ? db
            .select({
              usuarioId: saidas.usuarioId,
              email: users.email,
              nome: users.name,
              total: sql<string>`sum(${saidas.valor})`,
            })
            .from(saidas)
            .leftJoin(users, eq(saidas.usuarioId, users.id))
            .where(and(inArray(saidas.usuarioId, memberIds), gte(saidas.data, inicio), lt(saidas.data, fim)))
            .groupBy(saidas.usuarioId, users.email, users.name)
            .orderBy(sql`sum(${saidas.valor}) desc`)
        : Promise.resolve([]),
      emPlano
        ? db
            .select({
              usuarioId: entradas.usuarioId,
              email: users.email,
              nome: users.name,
              total: sql<string>`sum(${entradas.valor})`,
            })
            .from(entradas)
            .leftJoin(users, eq(entradas.usuarioId, users.id))
            .where(and(inArray(entradas.usuarioId, memberIds), gte(entradas.data, inicio), lt(entradas.data, fim)))
            .groupBy(entradas.usuarioId, users.email, users.name)
            .orderBy(sql`sum(${entradas.valor}) desc`)
        : Promise.resolve([]),
    ]);

  // Mesclar categorias saídas + dívidas
  const mapaCategoria = new Map<string, number>();
  for (const row of gastosPorCategoriaSaidas) {
    mapaCategoria.set(row.categoria, (mapaCategoria.get(row.categoria) ?? 0) + Number(row.total));
  }
  for (const row of gastosPorCategoriaDividas) {
    mapaCategoria.set(row.categoria, (mapaCategoria.get(row.categoria) ?? 0) + Number(row.total));
  }
  const categorias = [...mapaCategoria.entries()]
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);

  const totalGasto = categorias.reduce((acc, c) => acc + c.total, 0);
  const totalRecebido = Number(totalEntradas[0]?.total ?? 0);
  const saldo = totalRecebido - totalGasto;
  const maxCategoria = categorias[0]?.total ?? 1;

  function labelPessoa(uid: string, email: string | null, nome: string | null) {
    return uid === userId ? "Você" : (nome ?? email?.split("@")[0] ?? "Outro");
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Análises</h1>
          <p className="mt-1 text-sm text-cinza">{ROTULO_PERIODO[periodo]}</p>
        </div>
        <nav className="flex gap-2">
          {(["semana", "mes", "ano"] as Periodo[]).map((p) => (
            <Link
              key={p}
              href={`/analises?periodo=${p}`}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                periodo === p
                  ? "bg-gradient-to-r from-azul-claro to-azul-escuro text-white shadow"
                  : "border border-borda bg-white text-texto hover:bg-azul-suave"
              }`}
            >
              {ROTULO_PERIODO[p]}
            </Link>
          ))}
        </nav>
      </div>

      {/* Resumo */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { rotulo: "Total gasto", valor: totalGasto, cor: "text-vermelho-texto" },
          { rotulo: "Total recebido", valor: totalRecebido, cor: "text-verde-texto" },
          { rotulo: "Saldo", valor: saldo, cor: saldo >= 0 ? "text-verde-texto" : "text-vermelho-texto" },
        ].map(({ rotulo, valor, cor }) => (
          <div key={rotulo} className="rounded-[18px] border border-borda bg-white px-6 py-5 shadow-cartao">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-cinza">{rotulo}</p>
            <p className={`text-2xl font-extrabold ${cor}`}>{formatarMoeda(valor)}</p>
          </div>
        ))}
      </div>

      {/* Gastos por categoria */}
      <div className="mb-6 rounded-[18px] border border-borda bg-white px-7 py-6 shadow-cartao">
        <h2 className="mb-5 text-[1.05rem] font-bold text-texto">Gastos por categoria</h2>
        {categorias.length === 0 ? (
          <p className="text-sm italic text-cinza">Nenhum gasto registrado neste período.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {categorias.map(({ categoria, total }) => (
              <div key={categoria}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-texto">
                    {ROTULO_POR_CATEGORIA[categoria] ?? ROTULO_POR_CATEGORIA.outros}
                  </span>
                  <span className="text-sm font-bold text-vermelho-texto">{formatarMoeda(total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#fee2e2]">
                  <div
                    className="h-full rounded-full bg-vermelho-texto transition-all"
                    style={{ width: `${(total / maxCategoria) * 100}%` }}
                  />
                </div>
                <p className="mt-0.5 text-right text-xs text-cinza">
                  {totalGasto > 0 ? ((total / totalGasto) * 100).toFixed(1) : 0}% do total
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Por pessoa (só se tiver plano) */}
      {emPlano && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-[18px] border border-borda bg-white px-7 py-6 shadow-cartao">
            <h2 className="mb-4 text-[1.05rem] font-bold text-texto">Gastos por pessoa</h2>
            {gastosPorMembro.length === 0 ? (
              <p className="text-sm italic text-cinza">Sem dados.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {gastosPorMembro.map((m) => (
                  <div key={m.usuarioId} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-azul-suave text-xs font-bold text-azul-texto">
                        {labelPessoa(m.usuarioId, m.email, m.nome).charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-texto">
                        {labelPessoa(m.usuarioId, m.email, m.nome)}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-vermelho-texto">
                      {formatarMoeda(Number(m.total))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[18px] border border-borda bg-white px-7 py-6 shadow-cartao">
            <h2 className="mb-4 text-[1.05rem] font-bold text-texto">Entradas por pessoa</h2>
            {entradasPorMembro.length === 0 ? (
              <p className="text-sm italic text-cinza">Sem dados.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {entradasPorMembro.map((m) => (
                  <div key={m.usuarioId} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-xs font-bold text-verde-texto">
                        {labelPessoa(m.usuarioId, m.email, m.nome).charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-texto">
                        {labelPessoa(m.usuarioId, m.email, m.nome)}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-verde-texto">
                      {formatarMoeda(Number(m.total))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
