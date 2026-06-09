"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { cartoes, faturas } from "@/db/schema";

export type EstadoCartao = { erro?: string; sucesso?: true } | null;

export async function criarCartao(
  _estadoAnterior: EstadoCartao,
  formData: FormData,
): Promise<EstadoCartao> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  const nome = (formData.get("nome") as string).trim();
  const bandeira = (formData.get("bandeira") as string) || "visa";
  const diaFechamento = Number(formData.get("diaFechamento"));
  const diaVencimento = Number(formData.get("diaVencimento"));
  const cor = (formData.get("cor") as string) || "#8b5cf6";

  if (!nome) return { erro: "Informe o nome do cartão." };
  if (!diaFechamento || diaFechamento < 1 || diaFechamento > 28)
    return { erro: "Dia de fechamento inválido (1–28)." };
  if (!diaVencimento || diaVencimento < 1 || diaVencimento > 28)
    return { erro: "Dia de vencimento inválido (1–28)." };

  await db.insert(cartoes).values({
    usuarioId: sessao.user.id,
    nome,
    bandeira,
    diaFechamento,
    diaVencimento,
    cor,
  });

  revalidatePath("/cartoes");
  return { sucesso: true };
}

export async function excluirCartao(id: string): Promise<void> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  await db
    .delete(cartoes)
    .where(and(eq(cartoes.id, id), eq(cartoes.usuarioId, sessao.user.id)));

  revalidatePath("/cartoes");
}

export type EstadoFatura = { erro?: string; sucesso?: true } | null;

export async function pagarFatura(
  _estadoAnterior: EstadoFatura,
  formData: FormData,
): Promise<EstadoFatura> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  const cartaoId = formData.get("cartaoId") as string;
  const mesReferencia = formData.get("mesReferencia") as string;

  if (!cartaoId || !mesReferencia) return { erro: "Dados inválidos." };

  const [cartao] = await db
    .select({ id: cartoes.id })
    .from(cartoes)
    .where(and(eq(cartoes.id, cartaoId), eq(cartoes.usuarioId, sessao.user.id)));

  if (!cartao) return { erro: "Cartão não encontrado." };

  const hoje = new Date().toISOString().slice(0, 10);

  await db
    .insert(faturas)
    .values({ cartaoId, mesReferencia, pago: true, dataPagamento: hoje })
    .onConflictDoUpdate({
      target: [faturas.cartaoId, faturas.mesReferencia],
      set: { pago: true, dataPagamento: hoje },
    });

  revalidatePath(`/cartoes/${cartaoId}`);
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
  return { sucesso: true };
}
