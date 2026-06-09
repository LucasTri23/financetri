import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { dividas, entradas, saidas, users } from "@/db/schema";
import { ROTULO_POR_CATEGORIA } from "@/lib/categorias";
import { buscarIdsDoPlano } from "@/lib/plano";
import { formatarMoeda, mesAtual } from "@/lib/utils";

import { FiltroAnalises } from "./FiltroAnalises";

export const metadata: Metadata = { title: "Análises — ControleFácil" };

type Params = { periodo?: string; mes?: string; inicio?: string; fim?: string };

function calcularIntervalo(p: Params): { inicio: string; fim: string; rotulo: string } {
  // Range livre
  if (p.inicio && p.fim && p.inicio <= p.fim) {
    return { inicio: p.inicio, fim: p.fim, rotulo: `${p.inicio} → ${p.fim}` };
  }
  // Mês específico
  if (p.mes && /^\d{4}-\d{2}$/.test(p.mes)) {
    const [ano, mes] = p.mes.split("-").map(Number);
    const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const fim = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
    const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });
    return { inicio, fim, rotulo: nomeMes };
  }
  // Períodos rápidos
  const hoje = new Date();
  if (p.periodo === "semana") {
    const offset = (hoje.getDay() + 6) % 7;
    const segunda = new Date(hoje); segunda.setDate(hoje.getDate() - offset);
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
    return { inicio: segunda.toISOString().slice(0, 10), fim: amanha.toISOString().slice(0, 10), rotulo: "Esta semana" };
  }
  if (p.periodo === "ano") {
    const ano = hoje.getFullYear();
    return { inicio: `${ano}-01-01`, fim: `${ano + 1}-01-01`, rotulo: String(ano) };
  }
  const { inicio, fim } = mesAtual();
  return { inicio, fim, rotulo: "Este mês" };
}

export default async function PaginaAnalises({ searchParams }: { searchParams: Promise<Params> }) {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const params = await searchParams;
  const { inicio, fim, rotulo } = calcularIntervalo(params);
  const memberIds = await buscarIdsDoPlano(userId);
  const emPlano = memberIds.length > 1;

  const [catSaidas, catDividas, totalEntr, gastosPorMembro, entradasPorMembro] = await Promise.all([
    db.select({ categoria: saidas.categoria, total: sql<string>`sum(${saidas.valor})` })
      .from(saidas)
      .where(and(inArray(saidas.usuarioId, memberIds), gte(saidas.data, inicio), lt(saidas.data, fim)))
      .groupBy(saidas.categoria).orderBy(sql`sum(${saidas.valor}) desc`),
    db.select({ categoria: dividas.categoria, total: sql<string>`sum(${dividas.valorParcela})` })
      .from(dividas)
      .where(and(inArray(dividas.usuarioId, memberIds), gte(dividas.proximoVencimento, inicio), lt(dividas.proximoVencimento, fim)))
      .groupBy(dividas.categoria).orderBy(sql`sum(${dividas.valorParcela}) desc`),
    db.select({ total: sql<string>`sum(${entradas.valor})` })
      .from(entradas)
      .where(and(inArray(entradas.usuarioId, memberIds), gte(entradas.data, inicio), lt(entradas.data, fim))),
    emPlano
      ? db.select({ usuarioId: saidas.usuarioId, email: users.email, nome: users.name, total: sql<string>`sum(${saidas.valor})` })
          .from(saidas).leftJoin(users, eq(saidas.usuarioId, users.id))
          .where(and(inArray(saidas.usuarioId, memberIds), gte(saidas.data, inicio), lt(saidas.data, fim)))
          .groupBy(saidas.usuarioId, users.email, users.name).orderBy(sql`sum(${saidas.valor}) desc`)
      : Promise.resolve([]),
    emPlano
      ? db.select({ usuarioId: entradas.usuarioId, email: users.email, nome: users.name, total: sql<string>`sum(${entradas.valor})` })
          .from(entradas).leftJoin(users, eq(entradas.usuarioId, users.id))
          .where(and(inArray(entradas.usuarioId, memberIds), gte(entradas.data, inicio), lt(entradas.data, fim)))
          .groupBy(entradas.usuarioId, users.email, users.name).orderBy(sql`sum(${entradas.valor}) desc`)
      : Promise.resolve([]),
  ]);

  const mapaCategoria = new Map<string, number>();
  for (const r of catSaidas) mapaCategoria.set(r.categoria, (mapaCategoria.get(r.categoria) ?? 0) + Number(r.total));
  for (const r of catDividas) mapaCategoria.set(r.categoria, (mapaCategoria.get(r.categoria) ?? 0) + Number(r.total));
  const categorias = [...mapaCategoria.entries()].map(([c, t]) => ({ categoria: c, total: t })).sort((a, b) => b.total - a.total);

  const totalGasto = categorias.reduce((acc, c) => acc + c.total, 0);
  const totalRecebido = Number(totalEntr[0]?.total ?? 0);
  const maxCategoria = categorias[0]?.total ?? 1;

  function labelPessoa(uid: string, email: string | null, nome: string | null) {
    return uid === userId ? "Você" : (nome ?? email?.split("@")[0] ?? "Outro");
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-texto">Análises</h1>
        <p className="mt-1 text-sm text-cinza">{rotulo}</p>
      </div>

      <FiltroAnalises
        periodoAtual={params.periodo}
        mesAtual={params.mes}
        inicioAtual={params.inicio}
        fimAtual={params.fim}
      />

      {/* Resumo */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { rotulo: "Total gasto", valor: totalGasto, cor: "text-vermelho-texto" },
          { rotulo: "Total recebido", valor: totalRecebido, cor: "text-verde-texto" },
          { rotulo: "Saldo", valor: totalRecebido - totalGasto, cor: totalRecebido - totalGasto >= 0 ? "text-verde-texto" : "text-vermelho-texto" },
        ].map(({ rotulo: r, valor, cor }) => (
          <div key={r} className="rounded-[18px] border border-borda bg-cartao px-6 py-5 shadow-cartao">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-cinza">{r}</p>
            <p className={`text-2xl font-extrabold ${cor}`}>{formatarMoeda(valor)}</p>
          </div>
        ))}
      </div>

      {/* Por categoria */}
      <div className="mb-6 rounded-[18px] border border-borda bg-cartao px-7 py-6 shadow-cartao">
        <h2 className="mb-5 font-bold text-texto">Gastos por categoria</h2>
        {categorias.length === 0 ? (
          <p className="text-sm italic text-cinza">Nenhum gasto no período selecionado.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {categorias.map(({ categoria, total }) => (
              <div key={categoria}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-texto">{ROTULO_POR_CATEGORIA[categoria] ?? ROTULO_POR_CATEGORIA.outros}</span>
                  <span className="text-sm font-bold text-vermelho-texto">{formatarMoeda(total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-vermelho-suave">
                  <div className="h-full rounded-full bg-vermelho-texto transition-all" style={{ width: `${(total / maxCategoria) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-right text-xs text-cinza">{totalGasto > 0 ? ((total / totalGasto) * 100).toFixed(1) : 0}%</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Por pessoa */}
      {emPlano && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[
            { titulo: "Gastos por pessoa", dados: gastosPorMembro, cor: "text-vermelho-texto", bgAvatar: "bg-vermelho-suave" },
            { titulo: "Entradas por pessoa", dados: entradasPorMembro, cor: "text-verde-texto", bgAvatar: "bg-verde-suave" },
          ].map(({ titulo, dados, cor, bgAvatar }) => (
            <div key={titulo} className="rounded-[18px] border border-borda bg-cartao px-7 py-6 shadow-cartao">
              <h2 className="mb-4 font-bold text-texto">{titulo}</h2>
              {dados.length === 0 ? <p className="text-sm italic text-cinza">Sem dados.</p> : (
                <div className="flex flex-col gap-3">
                  {dados.map((m) => (
                    <div key={m.usuarioId} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bgAvatar} text-xs font-bold ${cor}`}>
                          {labelPessoa(m.usuarioId, m.email, m.nome).charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-texto">{labelPessoa(m.usuarioId, m.email, m.nome)}</span>
                      </div>
                      <span className={`text-sm font-bold ${cor}`}>{formatarMoeda(Number(m.total))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
