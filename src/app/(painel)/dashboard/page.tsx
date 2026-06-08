import type { Metadata } from "next";

import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Painel — Controle Financeiro",
};

export default async function PaginaDashboard() {
  const sessao = await auth();

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Visão geral</h1>
          <p className="mt-1 text-sm text-cinza">Seu painel financeiro num relance.</p>
        </div>
      </div>

      <section className="rounded-[18px] border border-borda bg-white p-7 shadow-cartao">
        <p className="text-sm text-cinza">
          Olá, {sessao?.user?.name ?? sessao?.user?.email}! O painel completo (saldo do mês,
          indicadores, próximos vencimentos) ainda está sendo construído.
        </p>
      </section>
    </>
  );
}
