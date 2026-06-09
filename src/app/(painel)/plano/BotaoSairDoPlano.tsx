"use client";

import { useTransition } from "react";
import { sairDoPlano } from "./actions";

export function BotaoSairDoPlano({ ehDono }: { ehDono: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const msg = ehDono
      ? `Você criou este plano. Ao sair, ele será excluído para todos os membros. Tem certeza?`
      : "Deseja sair do plano compartilhado?";
    if (!confirm(msg)) return;
    startTransition(() => sairDoPlano());
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-xl border border-vermelho-texto/30 bg-vermelho-suave px-4 py-2 text-sm font-semibold text-vermelho-texto transition hover:bg-vermelho-texto hover:text-white disabled:opacity-50"
    >
      {pending ? "Saindo…" : ehDono ? "Excluir plano" : "Sair do plano"}
    </button>
  );
}
