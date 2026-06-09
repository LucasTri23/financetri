"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { pagarFatura, type EstadoFatura } from "../actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-gradient-to-r from-verde-texto to-[#15803d] px-5 py-2.5 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Registrando…" : "✓ Marcar como paga"}
    </button>
  );
}

export function BotaoPagarFatura({
  cartaoId,
  mesReferencia,
}: {
  cartaoId: string;
  mesReferencia: string;
}) {
  const [estado, acao] = useActionState<EstadoFatura, FormData>(pagarFatura, null);

  return (
    <form action={acao} className="flex flex-col items-end gap-1">
      <input type="hidden" name="cartaoId" value={cartaoId} />
      <input type="hidden" name="mesReferencia" value={mesReferencia} />
      <Botao />
      {estado?.erro && <p className="text-xs text-vermelho-texto">{estado.erro}</p>}
    </form>
  );
}
