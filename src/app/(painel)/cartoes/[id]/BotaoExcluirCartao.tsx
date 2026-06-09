"use client";

import { useTransition } from "react";
import { excluirCartao } from "../actions";

export function BotaoExcluirCartao({ cartaoId, nomeCartao }: { cartaoId: string; nomeCartao: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Excluir o cartão "${nomeCartao}" e todos os seus lançamentos? Esta ação não pode ser desfeita.`)) return;
    startTransition(() => excluirCartao(cartaoId));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-xl border border-vermelho-texto/30 bg-vermelho-suave px-4 py-2 text-sm font-semibold text-vermelho-texto transition hover:bg-vermelho-texto hover:text-white disabled:opacity-50"
    >
      {pending ? "Excluindo…" : "Excluir cartão"}
    </button>
  );
}
