import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, asc, eq, gte, lt, lte } from "drizzle-orm";
import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/db";
import { dividas, entradas, saidas } from "@/db/schema";
import { Atalho, CartaoCredito } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Indicador } from "@/components/ui/Indicador";
import { CelulaTabela, LinhaTabela, TabelaTransacoes } from "@/components/ui/TabelaTransacoes";
import { formatarData, formatarMoeda, mesAtual } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Painel — Controle Financeiro",
};

async function buscarDadosDashboard(userId: string) {
  const { inicio, fim, ano, mes } = mesAtual();
  const hoje = new Date().toISOString().slice(0, 10);
  // próximos 30 dias
  const em30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [saidasMes, dividasMes, entradasMes, proximasDividas] = await Promise.all([
    db
      .select({ valor: saidas.valor })
      .from(saidas)
      .where(and(eq(saidas.usuarioId, userId), gte(saidas.data, inicio), lt(saidas.data, fim))),
    db
      .select({ valorParcela: dividas.valorParcela })
      .from(dividas)
      .where(
        and(
          eq(dividas.usuarioId, userId),
          gte(dividas.proximoVencimento, inicio),
          lt(dividas.proximoVencimento, fim),
        ),
      ),
    db
      .select({ valor: entradas.valor })
      .from(entradas)
      .where(and(eq(entradas.usuarioId, userId), gte(entradas.data, inicio), lt(entradas.data, fim))),
    db
      .select()
      .from(dividas)
      .where(
        and(eq(dividas.usuarioId, userId), gte(dividas.proximoVencimento, hoje), lte(dividas.proximoVencimento, em30dias)),
      )
      .orderBy(asc(dividas.proximoVencimento))
      .limit(10),
  ]);

  const totalEntradas = entradasMes.reduce((acc, e) => acc + Number(e.valor), 0);
  const totalSaidas = saidasMes.reduce((acc, s) => acc + Number(s.valor), 0);
  const totalParcelas = dividasMes.reduce((acc, d) => acc + Number(d.valorParcela), 0);
  const saldo = totalEntradas - totalSaidas - totalParcelas;

  const nomeMes = new Date(ano, mes - 1, 1).toLocaleString("pt-BR", { month: "long" });

  return { saldo, totalEntradas, totalSaidas: totalSaidas + totalParcelas, nomeMes, ano, proximasDividas };
}

export default async function PaginaDashboard() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  const { saldo, totalEntradas, totalSaidas, nomeMes, ano, proximasDividas } =
    await buscarDadosDashboard(sessao.user.id);

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Visão geral</h1>
          <p className="mt-1 text-sm text-cinza capitalize">{nomeMes} de {ano}</p>
        </div>
      </div>

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

      <section className="mb-[22px] rounded-[18px] border border-borda bg-white px-7 py-6 shadow-cartao">
        <h2 className="mb-4 text-[1.15rem] font-bold text-texto">Acesso rápido</h2>
        <div className="flex flex-wrap gap-3.5">
          <Atalho variante="saida" icone="↘" titulo="Nova saída" descricao="Pix, débito, parcelado ou recorrente" href="/saidas" />
          <Atalho variante="entrada" icone="↗" titulo="Nova entrada" descricao="Salário ou outras receitas" href="/entradas" />
          <Atalho variante="membros" icone="👥" titulo="Plano compartilhado" descricao="Convide alguém para juntar as finanças" href="/plano" />
        </div>
      </section>

      <section className="rounded-[18px] border border-borda bg-white px-7 py-6 shadow-cartao">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-[1.15rem] font-bold text-texto">Próximas parcelas</h2>
          <Link href="/saidas" className="text-sm font-semibold text-azul-texto hover:underline">
            Ver todas as saídas →
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
