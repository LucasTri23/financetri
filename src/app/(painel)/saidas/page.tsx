import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { planoMembros, users } from "@/db/schema";
import { Cartao } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { CelulaTabela, LinhaTabela, TabelaTransacoes } from "@/components/ui/TabelaTransacoes";
import { ROTULO_POR_CATEGORIA } from "@/lib/categorias";
import { formatarData, formatarMoeda, mesAtual } from "@/lib/utils";

import { buscarGastosDoMes } from "./actions";
import { FormularioSaida } from "./FormularioSaida";

export const metadata: Metadata = {
  title: "Saídas — Controle Financeiro",
};

async function buscarMembrosDoPlano(userId: string, fallbackEmail: string) {
  const membroRow = await db
    .select({ planoId: planoMembros.planoId })
    .from(planoMembros)
    .where(eq(planoMembros.usuarioId, userId))
    .limit(1);

  if (membroRow.length === 0) return [{ id: userId, email: fallbackEmail }];

  const membros = await db
    .select({ id: users.id, email: users.email })
    .from(planoMembros)
    .innerJoin(users, eq(planoMembros.usuarioId, users.id))
    .where(eq(planoMembros.planoId, membroRow[0].planoId));

  return membros.map((m) => ({ id: m.id, email: m.email! }));
}

export default async function PaginaSaidas() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const { mes, ano } = mesAtual();
  const nomeMes = new Date(ano, mes - 1, 1).toLocaleString("pt-BR", { month: "long" });

  const [itens, membros] = await Promise.all([
    buscarGastosDoMes(userId),
    buscarMembrosDoPlano(userId, sessao.user.email!),
  ]);

  const totalMes = itens.reduce((acc, i) => acc + i.valor, 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Saídas</h1>
          <p className="mt-1 text-sm text-cinza capitalize">
            {nomeMes} de {ano} — {itens.length} lançamento{itens.length !== 1 ? "s" : ""}
          </p>
        </div>
        <span className="text-lg font-extrabold text-vermelho-texto">{formatarMoeda(totalMes)}</span>
      </div>

      <Cartao titulo="Lançamentos do mês">
        {itens.length === 0 ? (
          <EstadoVazio>Nenhuma saída cadastrada neste mês ainda.</EstadoVazio>
        ) : (
          <TabelaTransacoes colunas={["Data", "Descrição", "Categoria", "Parcela", "Valor"]}>
            {itens.map((item) => (
              <LinhaTabela key={item.id}>
                <CelulaTabela className="text-cinza">{formatarData(item.data)}</CelulaTabela>
                <CelulaTabela>{item.descricao}</CelulaTabela>
                <CelulaTabela className="text-xs text-cinza">
                  {ROTULO_POR_CATEGORIA[item.categoria] ?? ROTULO_POR_CATEGORIA.outros}
                </CelulaTabela>
                <CelulaTabela className="text-cinza">{item.parcela ?? "—"}</CelulaTabela>
                <CelulaTabela className="font-semibold text-vermelho-texto">
                  {formatarMoeda(item.valor)}
                </CelulaTabela>
              </LinhaTabela>
            ))}
          </TabelaTransacoes>
        )}
      </Cartao>

      <Cartao titulo="Adicionar saída" estreito>
        <FormularioSaida membrosDoPlanoPlan={membros} />
      </Cartao>
    </>
  );
}
