"use server";

import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { dividas, entradas, eventos, saidas, users } from "@/db/schema";
import { buscarIdsDoPlano, buscarPlanoId } from "@/lib/plano";

export type EstadoEvento = { erro?: string; sucesso?: true } | null;

export async function adicionarEvento(
  _estadoAnterior: EstadoEvento,
  formData: FormData,
): Promise<EstadoEvento> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const titulo = (formData.get("titulo") as string).trim();
  const descricao = (formData.get("descricao") as string | null)?.trim() || null;
  const data = formData.get("data") as string;
  const etiqueta = (formData.get("etiqueta") as string) || "pessoal";

  if (!titulo || !data) return { erro: "Informe o título e a data." };

  const planoId = await buscarPlanoId(userId);

  await db.insert(eventos).values({ criadorId: userId, planoId, titulo, descricao, data, etiqueta });

  revalidatePath("/calendario");
  return { sucesso: true };
}

export async function excluirEvento(id: string): Promise<void> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  await db.delete(eventos).where(and(eq(eventos.id, id), eq(eventos.criadorId, sessao.user.id)));
  revalidatePath("/calendario");
}

export async function buscarDadosCalendario(userId: string, ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const proximoMes = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

  const planoId = await buscarPlanoId(userId);
  const memberIds = await buscarIdsDoPlano(userId);

  const [eventosDoMes, saidasDoMes, dividasDoMes, entradasDoMes] = await Promise.all([
    planoId
      ? db
          .select({
            id: eventos.id,
            data: eventos.data,
            titulo: eventos.titulo,
            descricao: eventos.descricao,
            etiqueta: eventos.etiqueta,
            criadorId: eventos.criadorId,
            criadorEmail: users.email,
            criadorNome: users.name,
          })
          .from(eventos)
          .leftJoin(users, eq(eventos.criadorId, users.id))
          .where(and(eq(eventos.planoId, planoId), gte(eventos.data, inicio), lt(eventos.data, proximoMes)))
      : db
          .select({
            id: eventos.id,
            data: eventos.data,
            titulo: eventos.titulo,
            descricao: eventos.descricao,
            etiqueta: eventos.etiqueta,
            criadorId: eventos.criadorId,
            criadorEmail: users.email,
            criadorNome: users.name,
          })
          .from(eventos)
          .leftJoin(users, eq(eventos.criadorId, users.id))
          .where(and(eq(eventos.criadorId, userId), gte(eventos.data, inicio), lt(eventos.data, proximoMes))),
    db
      .select({ id: saidas.id, data: saidas.data, descricao: saidas.descricao, valor: saidas.valor })
      .from(saidas)
      .where(and(inArray(saidas.usuarioId, memberIds), gte(saidas.data, inicio), lt(saidas.data, proximoMes))),
    db
      .select({
        id: dividas.id,
        data: dividas.proximoVencimento,
        descricao: dividas.descricao,
        valor: dividas.valorParcela,
      })
      .from(dividas)
      .where(
        and(
          inArray(dividas.usuarioId, memberIds),
          gte(dividas.proximoVencimento, inicio),
          lt(dividas.proximoVencimento, proximoMes),
        ),
      ),
    db
      .select({ id: entradas.id, data: entradas.data, descricao: entradas.descricao, valor: entradas.valor })
      .from(entradas)
      .where(and(inArray(entradas.usuarioId, memberIds), gte(entradas.data, inicio), lt(entradas.data, proximoMes))),
  ]);

  return { eventosDoMes, saidasDoMes, dividasDoMes, entradasDoMes };
}
