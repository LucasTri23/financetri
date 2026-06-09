"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { planoMembros, planos, users } from "@/db/schema";

export type EstadoPlano = { erro?: string; sucesso?: string } | null;

function gerarCodigoConvite(): string {
  const parte = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${parte()}-${parte()}`;
}

export async function criarPlano(
  _estadoAnterior: EstadoPlano,
  formData: FormData,
): Promise<EstadoPlano> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  // Já tem plano?
  const jaExiste = await db
    .select({ id: planoMembros.planoId })
    .from(planoMembros)
    .where(eq(planoMembros.usuarioId, userId))
    .limit(1);
  if (jaExiste.length > 0) return { erro: "Você já faz parte de um plano compartilhado." };

  const nome = ((formData.get("nome") as string) ?? "").trim() || "Meu plano";
  const codigoConvite = gerarCodigoConvite();

  const [plano] = await db
    .insert(planos)
    .values({ nome, donoId: userId, codigoConvite })
    .returning({ id: planos.id });

  await db.insert(planoMembros).values({ planoId: plano.id, usuarioId: userId });

  revalidatePath("/plano");
  return { sucesso: "Plano criado com sucesso!" };
}

export async function entrarComCodigo(
  _estadoAnterior: EstadoPlano,
  formData: FormData,
): Promise<EstadoPlano> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const codigo = ((formData.get("codigo") as string) ?? "").trim().toUpperCase();
  if (!codigo) return { erro: "Informe um código de convite." };

  const plano = await db
    .select({ id: planos.id, nome: planos.nome })
    .from(planos)
    .where(eq(planos.codigoConvite, codigo))
    .limit(1);

  if (plano.length === 0) return { erro: "Código de convite inválido ou expirado." };

  const planoId = plano[0].id;

  // Já é membro?
  const jaMembro = await db
    .select()
    .from(planoMembros)
    .where(and(eq(planoMembros.planoId, planoId), eq(planoMembros.usuarioId, userId)))
    .limit(1);

  if (jaMembro.length > 0) return { sucesso: "Você já fazia parte deste plano!" };

  await db.insert(planoMembros).values({ planoId, usuarioId: userId });

  revalidatePath("/plano");
  return { sucesso: `Você entrou no plano "${plano[0].nome}"!` };
}

export async function buscarPlano(userId: string) {
  const membroRow = await db
    .select({ planoId: planoMembros.planoId })
    .from(planoMembros)
    .where(eq(planoMembros.usuarioId, userId))
    .limit(1);

  if (membroRow.length === 0) return null;

  const planoId = membroRow[0].planoId;

  const [planoInfo] = await db
    .select()
    .from(planos)
    .where(eq(planos.id, planoId))
    .limit(1);

  const membros = await db
    .select({ id: users.id, email: users.email, nome: users.name })
    .from(planoMembros)
    .innerJoin(users, eq(planoMembros.usuarioId, users.id))
    .where(eq(planoMembros.planoId, planoId));

  return { ...planoInfo, membros: membros.map((m) => ({ id: m.id, email: m.email!, nome: m.nome })) };
}

export async function sairDoPlano(): Promise<void> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const [membroRow] = await db
    .select({ planoId: planoMembros.planoId })
    .from(planoMembros)
    .where(eq(planoMembros.usuarioId, userId))
    .limit(1);

  if (!membroRow) redirect("/plano");

  const [plano] = await db.select().from(planos).where(eq(planos.id, membroRow.planoId));

  if (plano?.donoId === userId) {
    await db.delete(planos).where(eq(planos.id, membroRow.planoId));
  } else {
    await db.delete(planoMembros).where(
      and(eq(planoMembros.planoId, membroRow.planoId), eq(planoMembros.usuarioId, userId)),
    );
  }

  revalidatePath("/plano");
  revalidatePath("/dashboard");
  redirect("/plano");
}
