"use server";

import { and, eq, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { entradas } from "@/db/schema";
import { mesAtual } from "@/lib/utils";

export type EstadoEntrada = { erro?: string; sucesso?: true } | null;

export async function adicionarEntrada(
  _estadoAnterior: EstadoEntrada,
  formData: FormData,
): Promise<EstadoEntrada> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const descricao = (formData.get("descricao") as string).trim();
  const valor = Number(formData.get("valor"));
  const data = formData.get("data") as string;
  const tipo = (formData.get("tipo") as string) || "outro";
  const tipoLancamento = formData.get("tipoLancamento") as string;
  const recebedorId = (formData.get("recebedorId") as string) || null;

  if (!descricao || !valor || isNaN(valor) || !data) {
    return { erro: "Preencha todos os campos obrigatórios." };
  }

  await db.insert(entradas).values({
    usuarioId: userId,
    descricao,
    tipo,
    valor: String(valor),
    data,
    recorrente: tipoLancamento === "recorrente",
    frequencia:
      tipoLancamento === "recorrente" ? (formData.get("frequencia") as string) || null : null,
    recebedorId,
    origem: "manual",
  });

  revalidatePath("/entradas");
  return { sucesso: true };
}

export async function buscarEntradasDoMes(userId: string) {
  const { inicio, fim } = mesAtual();

  return db
    .select()
    .from(entradas)
    .where(
      and(eq(entradas.usuarioId, userId), gte(entradas.data, inicio), lt(entradas.data, fim)),
    )
    .orderBy(entradas.data);
}
