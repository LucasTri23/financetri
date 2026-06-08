"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export type EstadoCadastro = { erro: string } | null;

export async function criarConta(
  _estadoAnterior: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha." };
  }
  if (senha.length < 6) {
    return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (senha !== confirmarSenha) {
    return { erro: "As senhas não conferem. Confira e tente novamente." };
  }

  const [existente] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existente) {
    return { erro: "Já existe uma conta com esse e-mail." };
  }

  const passwordHash = await bcrypt.hash(senha, 10);
  await db.insert(users).values({ email, passwordHash });

  try {
    await signIn("credentials", { email, senha, redirectTo: "/dashboard" });
    return null;
  } catch (erro) {
    if (erro instanceof AuthError) {
      return {
        erro: "Conta criada, mas não foi possível entrar automaticamente. Tente fazer login.",
      };
    }
    throw erro;
  }
}

export async function entrarComGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}
