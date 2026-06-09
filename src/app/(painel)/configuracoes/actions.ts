"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export type EstadoNome = { erro?: string; sucesso?: true } | null;

export async function atualizarNome(
  _anterior: EstadoNome,
  formData: FormData,
): Promise<EstadoNome> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  const nome = (formData.get("nome") as string ?? "").trim();
  if (nome.length < 2) return { erro: "Nome deve ter ao menos 2 caracteres." };
  if (nome.length > 60) return { erro: "Nome muito longo (máx. 60 caracteres)." };

  await db.update(users).set({ name: nome }).where(eq(users.id, sessao.user.id));
  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  return { sucesso: true };
}

export type EstadoFoto = { erro?: string; sucesso?: true; url?: string } | null;

export async function uploadFotoPerfil(formData: FormData): Promise<EstadoFoto> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  const file = formData.get("foto") as File | null;
  if (!file || file.size === 0) return { erro: "Selecione uma foto." };
  if (!file.type.startsWith("image/")) return { erro: "Arquivo deve ser uma imagem (JPG, PNG, WebP)." };
  if (file.size > 5 * 1024 * 1024) return { erro: "Foto muito grande — máximo 5 MB." };

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const caminho = `avatars/${sessao.user.id}.${ext}`;

  const blob = await put(caminho, file, { access: "public", addRandomSuffix: false });

  await db.update(users).set({ image: blob.url }).where(eq(users.id, sessao.user.id));
  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  return { sucesso: true, url: blob.url };
}
