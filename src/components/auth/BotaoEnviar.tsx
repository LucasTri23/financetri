"use client";

import { useFormStatus } from "react-dom";

export function BotaoEnviar({
  texto,
  textoEnviando,
}: {
  texto: string;
  textoEnviando: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-gradient-to-r from-azul to-azul-escuro px-6 py-3 font-semibold text-white shadow-cartao transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
    >
      {pending ? textoEnviando : texto}
    </button>
  );
}
