import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, asc, gte, inArray, lt, lte, sql } from "drizzle-orm";
import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/db";
import { dividas, entradas, saidas, users } from "@/db/schema";
import { buscarIdsDoPlano, buscarPlanoId } from "@/lib/plano";
import { Atalho, CartaoCredito } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Indicador } from "@/components/ui/Indicador";
import { CelulaTabela, LinhaTabela, TabelaTransacoes } from "@/components/ui/TabelaTransacoes";
import { formatarData, formatarMoeda, mesAtual } from "@/lib/utils";

export const metadata: Metadata = { title: "Painel — ControleFácil" };

type CardMembro = {
  uid: string;
  email: string;
  nome: string | null;
  gastos: number;
  receitas: number;
  saldo: number;
};

async function buscarDadosDashboard(userId: string) {
  const { inicio, fim, ano, mes } = mesAtual();
  const hoje = new Date().toISOString().slice(0, 10);
  const em30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const memberIds = await buscarIdsDoPlano(userId);
  const planoId = await buscarPlanoId(userId);
  const emPlano = memberIds.length > 1;

  const [saidasMes, dividasMes, entradasMes, proximasDividas,
    saidasPorMembro, dividasPorMembro, entradasPorMembro, infos] = await Promise.all([
    db.select({ valor: saidas.valor }).from(saidas)
      .where(and(inArray(saidas.usuarioId, memberIds), gte(saidas.data, inicio), lt(saidas.data, fim))),

    db.select({ valorParcela: dividas.valorParcela }).from(dividas)
      .where(and(inArray(dividas.usuarioId, memberIds), gte(dividas.proximoVencimento, inicio), lt(dividas.proximoVencimento, fim))),

    db.select({ valor: entradas.valor }).from(entradas)
      .where(and(inArray(entradas.usuarioId, memberIds), gte(entradas.data, inicio), lt(entradas.data, fim))),

    db.select().from(dividas)
      .where(and(inArray(dividas.usuarioId, memberIds), gte(dividas.proximoVencimento, hoje), lte(dividas.proximoVencimento, em30dias)))
      .orderBy(asc(dividas.proximoVencimento)).limit(10),

    emPlano
      ? db.select({ uid: saidas.usuarioId, total: sql<string>`sum(${saidas.valor})` })
          .from(saidas)
          .where(and(inArray(saidas.usuarioId, memberIds), gte(saidas.data, inicio), lt(saidas.data, fim)))
          .groupBy(saidas.usuarioId)
      : Promise.resolve([]),

    emPlano
      ? db.select({ uid: dividas.usuarioId, total: sql<string>`sum(${dividas.valorParcela})` })
          .from(dividas)
          .where(and(inArray(dividas.usuarioId, memberIds), gte(dividas.proximoVencimento, inicio), lt(dividas.proximoVencimento, fim)))
          .groupBy(dividas.usuarioId)
      : Promise.resolve([]),

    emPlano
      ? db.select({ uid: entradas.usuarioId, total: sql<string>`sum(${entradas.valor})` })
          .from(entradas)
          .where(and(inArray(entradas.usuarioId, memberIds), gte(entradas.data, inicio), lt(entradas.data, fim)))
          .groupBy(entradas.usuarioId)
      : Promise.resolve([]),

    emPlano
      ? db.select({ id: users.id, email: users.email, nome: users.name })
          .from(users).where(inArray(users.id, memberIds))
      : Promise.resolve([]),
  ]);

  const totalEntradas = entradasMes.reduce((acc, e) => acc + Number(e.valor), 0);
  const totalSaidas = saidasMes.reduce((acc, s) => acc + Number(s.valor), 0);
  const totalParcelas = dividasMes.reduce((acc, d) => acc + Number(d.valorParcela), 0);
  const saldo = totalEntradas - totalSaidas - totalParcelas;
  const nomeMes = new Date(ano, mes - 1, 1).toLocaleString("pt-BR", { month: "long" });

  const cardsMembers: CardMembro[] = emPlano
    ? memberIds.map((uid) => {
        const info = infos.find((i) => i.id === uid);
        const gastos =
          Number(saidasPorMembro.find((r) => r.uid === uid)?.total ?? 0) +
          Number(dividasPorMembro.find((r) => r.uid === uid)?.total ?? 0);
        const receitas = Number(entradasPorMembro.find((r) => r.uid === uid)?.total ?? 0);
        return { uid, email: info?.email ?? uid, nome: info?.nome ?? null, gastos, receitas, saldo: receitas - gastos };
      })
    : [];

  return { saldo, totalEntradas, totalSaidas: totalSaidas + totalParcelas, nomeMes, ano, proximasDividas, emPlano, cardsMembers };
}

const GRADIENTES = [
  "from-[#0ea5e9] to-[#0c4a6e]",
  "from-[#a855f7] to-[#6d28d9]",
  "from-[#f97316] to-[#b45309]",
  "from-[#16a34a] to-[#065f46]",
];

export default async function PaginaDashboard() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const { saldo, totalEntradas, totalSaidas, nomeMes, ano, proximasDividas, emPlano, cardsMembers } =
    await buscarDadosDashboard(userId);

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Visão geral</h1>
          <p className="mt-1 text-sm text-cinza capitalize">{nomeMes} de {ano}</p>
        </div>
      </div>

      {/* Cards por membro — só aparece quando há plano compartilhado */}
      {emPlano && cardsMembers.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-cinza">Membros do plano</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
            {cardsMembers.map((membro, i) => {
              const inicial = (membro.nome ?? membro.email).charAt(0).toUpperCase();
              const nomeExibido = membro.uid === userId
                ? "Você"
                : (membro.nome ?? membro.email.split("@")[0]);

              return (
                <div
                  key={membro.uid}
                  className={`relative overflow-hidden rounded-[20px] bg-gradient-to-br ${GRADIENTES[i % GRADIENTES.length]} p-5 text-white shadow-cartao`}
                >
                  <span className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
                  <span className="pointer-events-none absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-white/[0.08]" />

                  <div className="relative mb-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-extrabold backdrop-blur-sm">
                      {inicial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold leading-5">{nomeExibido}</p>
                      <p className="truncate text-xs text-white/70">{membro.email}</p>
                    </div>
                    {membro.uid === userId && (
                      <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        você
                      </span>
                    )}
                  </div>

                  <div className="relative grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Entradas</p>
                      <p className="mt-0.5 text-sm font-extrabold">{formatarMoeda(membro.receitas)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Gastos</p>
                      <p className="mt-0.5 text-sm font-extrabold">{formatarMoeda(membro.gastos)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Saldo</p>
                      <p className={`mt-0.5 text-sm font-extrabold ${membro.saldo < 0 ? "text-red-300" : "text-green-300"}`}>
                        {formatarMoeda(membro.saldo)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {emPlano && (
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-cinza">Total do plano</h2>
      )}

      <section className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[18px]">
        <CartaoCredito
          rotulo="Saldo do mês"
          icone={<span aria-hidden="true">💳</span>}
          numero={formatarMoeda(saldo)}
          legendaEsquerda="Entradas − saídas − parcelas"
        />
        <Indicador
          variante="entrada"
          icone={<span aria-hidden="true">↗</span>}
          rotulo="Total de entradas"
          valor={formatarMoeda(totalEntradas)}
          tendencia="Cadastradas neste mês"
        />
        <Indicador
          variante="saida"
          icone={<span aria-hidden="true">↘</span>}
          rotulo="Total de saídas e parcelas"
          valor={formatarMoeda(totalSaidas)}
          tendencia="A pagar neste mês"
        />
      </section>

      <section className="mb-[22px] rounded-[18px] border border-borda bg-cartao px-7 py-6 shadow-cartao">
        <h2 className="mb-4 text-[1.15rem] font-bold text-texto">Acesso rápido</h2>
        <div className="flex flex-wrap gap-3.5">
          <Atalho variante="saida" icone="↘" titulo="Nova saída" descricao="Pix, débito, parcelado ou recorrente" href="/saidas/nova" />
          <Atalho variante="entrada" icone="↗" titulo="Nova entrada" descricao="Salário ou outras receitas" href="/entradas" />
          <Atalho variante="membros" icone="👥" titulo="Plano compartilhado" descricao="Convide alguém para juntar as finanças" href="/plano" />
        </div>
      </section>

      <section className="rounded-[18px] border border-borda bg-cartao px-7 py-6 shadow-cartao">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-[1.15rem] font-bold text-texto">Próximas parcelas</h2>
          <Link href="/saidas" className="text-sm font-semibold text-azul-texto hover:underline">
            Ver todas →
          </Link>
        </div>

        {proximasDividas.length === 0 ? (
          <EstadoVazio>Nenhuma parcela nos próximos 30 dias.</EstadoVazio>
        ) : (
          <TabelaTransacoes colunas={["Vencimento", "Descrição", "Parcela", "Valor"]}>
            {proximasDividas.map((d) => (
              <LinhaTabela key={d.id}>
                <CelulaTabela className="text-cinza">{formatarData(d.proximoVencimento)}</CelulaTabela>
                <CelulaTabela>{d.descricao}</CelulaTabela>
                <CelulaTabela className="text-cinza">
                  {Math.min(d.parcelaAtual + 1, d.totalParcelas)}/{d.totalParcelas}
                </CelulaTabela>
                <CelulaTabela className="font-semibold text-vermelho-texto">
                  {formatarMoeda(Number(d.valorParcela))}
                </CelulaTabela>
              </LinhaTabela>
            ))}
          </TabelaTransacoes>
        )}
      </section>
    </>
  );
}
