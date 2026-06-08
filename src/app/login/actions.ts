"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

const MENSAGENS_ERRO: Record<string, string> = {
  CredentialsSignin: "E-mail ou senha incorretos.",
};

export type EstadoLogin = { erro: string } | null;

export async function entrarComCredenciais(
  _estadoAnterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      senha: formData.get("senha"),
      redirectTo: "/dashboard",
    });
    return null;
  } catch (erro) {
    if (erro instanceof AuthError) {
      return { erro: MENSAGENS_ERRO[erro.type] ?? "Não foi possível entrar. Tente novamente." };
    }
    throw erro;
  }
}

export async function entrarComGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}
