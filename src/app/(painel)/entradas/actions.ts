"use server";

import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { entradas, users } from "@/db/schema";
import { buscarIdsDoPlano } from "@/lib/plano";
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
    usuarioId: recebedorId ?? userId,
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
  revalidatePath("/dashboard");
  return { sucesso: true };
}

export async function buscarEntradasDoMes(userId: string) {
  const { inicio, fim } = mesAtual();
  const memberIds = await buscarIdsDoPlano(userId);

  return db
    .select({
      id: entradas.id,
      data: entradas.data,
      descricao: entradas.descricao,
      tipo: entradas.tipo,
      valor: entradas.valor,
      adicionadoPorId: entradas.usuarioId,
      adicionadoPorEmail: users.email,
      adicionadoPorNome: users.name,
    })
    .from(entradas)
    .leftJoin(users, eq(entradas.usuarioId, users.id))
    .where(
      and(inArray(entradas.usuarioId, memberIds), gte(entradas.data, inicio), lt(entradas.data, fim)),
    )
    .orderBy(entradas.data);
}
