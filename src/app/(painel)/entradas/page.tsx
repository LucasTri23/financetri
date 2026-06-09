import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { planoMembros, users } from "@/db/schema";
import { Cartao } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { CelulaTabela, LinhaTabela, TabelaTransacoes } from "@/components/ui/TabelaTransacoes";
import { formatarData, formatarMoeda, mesAtual } from "@/lib/utils";

import { buscarEntradasDoMes } from "./actions";
import { FormularioEntrada } from "./FormularioEntrada";

export const metadata: Metadata = {
  title: "Entradas — Controle Financeiro",
};

const ROTULO_TIPO: Record<string, string> = {
  salario: "💰 Salário",
  freelance: "💻 Freelance",
  investimento: "📈 Investimento",
  presente: "🎁 Presente",
  reembolso: "↩ Reembolso",
  outro: "📦 Outro",
};

async function buscarMembros(userId: string, fallbackEmail: string) {
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

export default async function PaginaEntradas() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const { mes, ano } = mesAtual();
  const nomeMes = new Date(ano, mes - 1, 1).toLocaleString("pt-BR", { month: "long" });

  const [itens, membros] = await Promise.all([
    buscarEntradasDoMes(userId),
    buscarMembros(userId, sessao.user.email!),
  ]);

  const totalMes = itens.reduce((acc, i) => acc + Number(i.valor), 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Entradas</h1>
          <p className="mt-1 text-sm text-cinza capitalize">
            {nomeMes} de {ano} — {itens.length} lançamento{itens.length !== 1 ? "s" : ""}
          </p>
        </div>
        <span className="text-lg font-extrabold text-verde-texto">{formatarMoeda(totalMes)}</span>
      </div>

      <Cartao titulo="Lançamentos do mês">
        {itens.length === 0 ? (
          <EstadoVazio>Nenhuma entrada cadastrada neste mês ainda.</EstadoVazio>
        ) : (
          <TabelaTransacoes colunas={["Data", "Descrição", "Tipo", "Por", "Valor"]}>
            {itens.map((item) => (
              <LinhaTabela key={item.id}>
                <CelulaTabela className="text-cinza">{formatarData(item.data)}</CelulaTabela>
                <CelulaTabela>{item.descricao}</CelulaTabela>
                <CelulaTabela className="text-xs text-cinza">
                  {ROTULO_TIPO[item.tipo] ?? item.tipo}
                </CelulaTabela>
                <CelulaTabela className="text-xs text-cinza">
                  {item.adicionadoPorId === userId ? "Você" : item.adicionadoPorEmail?.split("@")[0] ?? "—"}
                </CelulaTabela>
                <CelulaTabela className="font-semibold text-verde-texto">
                  {formatarMoeda(Number(item.valor))}
                </CelulaTabela>
              </LinhaTabela>
            ))}
          </TabelaTransacoes>
        )}
      </Cartao>

      <Cartao titulo="Adicionar entrada" estreito>
        <FormularioEntrada membros={membros} />
      </Cartao>
    </>
  );
}
