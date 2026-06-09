import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CartaoAuth } from "@/components/auth/CartaoAuth";
import { FormularioGoogle } from "@/components/auth/FormularioGoogle";
import { auth } from "@/auth";

import { entrarComGoogle } from "./actions";
import { FormularioCadastro } from "./FormularioCadastro";

export const metadata: Metadata = {
  title: "Criar conta — ControleFácil",
};

export default async function PaginaCadastro() {
  const sessao = await auth();
  if (sessao?.user) redirect("/dashboard");

  return (
    <CartaoAuth
      titulo="Criar conta"
      descricao="Preencha os dados abaixo para começar a usar o ControleFácil."
      rodapeTexto="Já tem conta?"
      rodapeLinkTexto="Entrar"
      rodapeLinkHref="/login"
    >
      <FormularioCadastro />

      <div className="my-5 flex items-center gap-3 text-sm text-cinza-claro">
        <span className="h-px flex-1 bg-borda" />
        ou
        <span className="h-px flex-1 bg-borda" />
      </div>

      <FormularioGoogle action={entrarComGoogle} />
    </CartaoAuth>
  );
}
