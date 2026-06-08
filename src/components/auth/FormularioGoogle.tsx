"use client";

import { useFormStatus } from "react-dom";

function BotaoGoogle() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-borda bg-white px-6 py-3 font-semibold text-texto transition hover:bg-fundo disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span aria-hidden="true">🔐</span>
      {pending ? "Abrindo login do Google…" : "Continuar com Google"}
    </button>
  );
}

export function FormularioGoogle({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <BotaoGoogle />
    </form>
  );
}
