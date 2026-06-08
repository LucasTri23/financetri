import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";

export const metadata: Metadata = {
  title: "Painel — Controle Financeiro",
};

export default async function PaginaDashboard() {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-fundo px-6 text-center">
      <span className="rounded-full bg-azul-suave px-4 py-1 text-sm font-semibold text-azul-texto">
        Painel
      </span>
      <h1 className="text-2xl font-bold text-texto">
        Olá, {sessao.user.name ?? sessao.user.email}
      </h1>
      <p className="max-w-md text-sm text-cinza">
        O painel completo (saldo do mês, indicadores, próximos vencimentos)
        ainda está sendo construído.
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded-full border border-azul px-6 py-2.5 font-semibold text-azul-texto transition hover:bg-azul-suave"
        >
          Sair
        </button>
      </form>
    </main>
  );
}
