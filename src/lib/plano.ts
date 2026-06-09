import { eq } from "drizzle-orm";
import { db } from "@/db";
import { planoMembros } from "@/db/schema";

export async function buscarIdsDoPlano(userId: string): Promise<string[]> {
  const membroRow = await db
    .select({ planoId: planoMembros.planoId })
    .from(planoMembros)
    .where(eq(planoMembros.usuarioId, userId))
    .limit(1);

  if (membroRow.length === 0) return [userId];

  const membros = await db
    .select({ usuarioId: planoMembros.usuarioId })
    .from(planoMembros)
    .where(eq(planoMembros.planoId, membroRow[0].planoId));

  return membros.map((m) => m.usuarioId);
}

export async function buscarPlanoId(userId: string): Promise<string | null> {
  const row = await db
    .select({ planoId: planoMembros.planoId })
    .from(planoMembros)
    .where(eq(planoMembros.usuarioId, userId))
    .limit(1);
  return row[0]?.planoId ?? null;
}
