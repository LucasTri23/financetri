"use client";

import { useTransition } from "react";

function IconeLixeira() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="2,3.5 2,12.5 12,12.5 12,3.5" />
      <line x1="0.5" y1="3.5" x2="13.5" y2="3.5" />
      <line x1="4.5" y1="3.5" x2="4.5" y2="1.5" />
      <line x1="9.5" y1="3.5" x2="9.5" y2="1.5" />
      <line x1="4.5" y1="1.5" x2="9.5" y2="1.5" />
      <line x1="5.5" y1="6" x2="5.5" y2="10.5" />
      <line x1="8.5" y1="6" x2="8.5" y2="10.5" />
    </svg>
  );
}

export function BotaoExcluir({
  acao,
  mensagem = "Excluir este item? Esta ação não pode ser desfeita.",
  titulo = "Excluir",
}: {
  acao: () => Promise<void>;
  mensagem?: string;
  titulo?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(mensagem)) return;
    startTransition(async () => { await acao(); });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      title={titulo}
      aria-label={titulo}
      className="flex items-center justify-center rounded-lg p-1.5 text-cinza-claro transition hover:bg-vermelho-suave hover:text-vermelho-texto disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <IconeLixeira />
      )}
    </button>
  );
}
