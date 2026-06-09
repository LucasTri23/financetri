import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CartaoAuth } from "@/components/auth/CartaoAuth";
import { FormularioGoogle } from "@/components/auth/FormularioGoogle";
import { auth } from "@/auth";

import { entrarComGoogle } from "./actions";
import { FormularioLogin } from "./FormularioLogin";

export const metadata: Metadata = {
  title: "Entrar — ControleFácil",
};

export default async function PaginaLogin() {
  const sessao = await auth();
  if (sessao?.user) redirect("/dashboard");

  return (
    <CartaoAuth
      titulo="Bem-vindo de volta"
      descricao="Entre com seu e-mail e senha para acessar seu painel."
      rodapeTexto="Ainda não tem conta?"
      rodapeLinkTexto="Criar conta"
      rodapeLinkHref="/cadastro"
    >
      <FormularioLogin />

      <div className="my-5 flex items-center gap-3 text-sm text-cinza-claro">
        <span className="h-px flex-1 bg-borda" />
        ou
        <span className="h-px flex-1 bg-borda" />
      </div>

      <FormularioGoogle action={entrarComGoogle} />
    </CartaoAuth>
  );
}
