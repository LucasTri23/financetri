import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cartoes, planoMembros, users } from "@/db/schema";
import { Cartao } from "@/components/ui/Cartao";

import { FormularioSaida } from "../FormularioSaida";

export const metadata: Metadata = { title: "Nova saída — ControleFácil" };

async function buscarMembros(userId: string, fallbackEmail: string) {
  const membroRow = await db.select({ planoId: planoMembros.planoId }).from(planoMembros).where(eq(planoMembros.usuarioId, userId)).limit(1);
  if (membroRow.length === 0) return [{ id: userId, email: fallbackEmail }];
  const membros = await db.select({ id: users.id, email: users.email }).from(planoMembros).innerJoin(users, eq(planoMembros.usuarioId, users.id)).where(eq(planoMembros.planoId, membroRow[0].planoId));
  return membros.map((m) => ({ id: m.id, email: m.email! }));
}

export default async function PaginaNovaSaida() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  const [membros, meusCartoes] = await Promise.all([
    buscarMembros(sessao.user.id, sessao.user.email!),
    db.select({ id: cartoes.id, nome: cartoes.nome }).from(cartoes).where(eq(cartoes.usuarioId, sessao.user.id)),
  ]);

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/saidas" className="rounded-xl border border-borda bg-cartao px-3 py-2 text-sm font-semibold text-cinza hover:bg-azul-suave transition">
          ← Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Nova saída</h1>
          <p className="mt-0.5 text-sm text-cinza">Registre um gasto, parcela ou recorrência.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Cartao titulo="Dados da saída">
          <FormularioSaida
            membrosDoPlanoPlan={membros}
            cartoesDisponiveis={meusCartoes}
            redirecionarParaLista
          />
        </Cartao>
      </div>
    </>
  );
}
