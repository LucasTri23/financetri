"use client";

import { useTransition } from "react";
import { excluirFatura } from "../actions";

export function BotaoExcluirFatura({
  cartaoId,
  mesReferencia,
}: {
  cartaoId: string;
  mesReferencia: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Excluir TODOS os lançamentos desta fatura? Esta ação não pode ser desfeita.")) return;
    startTransition(async () => { await excluirFatura(cartaoId, mesReferencia); });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="rounded-xl border border-vermelho-texto/40 px-4 py-2 text-sm font-semibold text-vermelho-texto transition hover:bg-vermelho-suave disabled:opacity-50"
    >
      {pending ? "Excluindo…" : "Excluir fatura"}
    </button>
  );
}
