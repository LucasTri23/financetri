"use client";

import { useActionState } from "react";

import { BotaoEnviar } from "@/components/auth/BotaoEnviar";

import { criarConta, type EstadoCadastro } from "./actions";

export function FormularioCadastro() {
  const [estado, acao] = useActionState<EstadoCadastro, FormData>(criarConta, null);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-texto">
          E-mail
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="w-full rounded-xl border border-borda px-4 py-2.5 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className="text-sm font-medium text-texto">
          Senha
        </label>
        <input
          type="password"
          id="senha"
          name="senha"
          required
          minLength={6}
          className="w-full rounded-xl border border-borda px-4 py-2.5 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmarSenha" className="text-sm font-medium text-texto">
          Confirmar senha
        </label>
        <input
          type="password"
          id="confirmarSenha"
          name="confirmarSenha"
          required
          minLength={6}
          className="w-full rounded-xl border border-borda px-4 py-2.5 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
        />
      </div>

      <BotaoEnviar texto="Criar conta" textoEnviando="Criando conta…" />

      <p className="min-h-[1.2em] text-sm text-vermelho-texto" role="status">
        {estado?.erro}
      </p>
    </form>
  );
}
