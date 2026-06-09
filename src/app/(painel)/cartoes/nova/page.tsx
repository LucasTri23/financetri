import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { Cartao } from "@/components/ui/Cartao";

import { FormularioCartao } from "./FormularioCartao";

export const metadata: Metadata = { title: "Novo cartão — ControleFácil" };

export default async function PaginaNovoCartao() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/cartoes"
          className="rounded-xl border border-borda bg-cartao px-3 py-2 text-sm font-semibold text-cinza hover:bg-azul-suave transition"
        >
          ← Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Novo cartão</h1>
          <p className="mt-0.5 text-sm text-cinza">Cadastre um cartão de crédito para controlar suas faturas.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Cartao titulo="Dados do cartão">
          <FormularioCartao />
        </Cartao>
      </div>
    </>
  );
}
