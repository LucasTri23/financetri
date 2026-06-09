"use client";

import { useActionState } from "react";

import { BotaoEnviar } from "@/components/auth/BotaoEnviar";
import { StatusFormulario } from "@/components/ui/StatusFormulario";

import { criarPlano, entrarComCodigo, type EstadoPlano } from "./actions";

export function FormularioCriarPlano() {
  const [estado, acao] = useActionState<EstadoPlano, FormData>(criarPlano, null);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className="text-sm font-medium text-texto">
          Nome do plano (opcional)
        </label>
        <input
          type="text"
          id="nome"
          name="nome"
          placeholder="Ex: Casal, Família, República…"
          className="w-full rounded-xl border border-borda bg-white px-4 py-2.5 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
        />
      </div>

      <div className="flex items-center gap-4">
        <BotaoEnviar texto="Criar plano" textoEnviando="Criando…" />
        <StatusFormulario variante={estado?.sucesso ? "sucesso" : estado?.erro ? "erro" : "neutro"}>
          {estado?.sucesso ?? estado?.erro}
        </StatusFormulario>
      </div>
    </form>
  );
}

export function FormularioEntrarComCodigo() {
  const [estado, acao] = useActionState<EstadoPlano, FormData>(entrarComCodigo, null);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="codigo" className="text-sm font-medium text-texto">
          Código de convite
        </label>
        <input
          type="text"
          id="codigo"
          name="codigo"
          placeholder="XXXX-XXXX"
          required
          className="w-full rounded-xl border border-borda bg-white px-4 py-2.5 text-sm font-mono uppercase tracking-widest text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
        />
      </div>

      <div className="flex items-center gap-4">
        <BotaoEnviar texto="Entrar no plano" textoEnviando="Entrando…" />
        <StatusFormulario variante={estado?.sucesso ? "sucesso" : estado?.erro ? "erro" : "neutro"}>
          {estado?.sucesso ?? estado?.erro}
        </StatusFormulario>
      </div>
    </form>
  );
}

export function BotaoCopiar({ codigo }: { codigo: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(codigo)}
      className="ml-2 rounded-lg border border-borda bg-white px-3 py-1 text-xs font-semibold text-azul-texto transition hover:bg-azul-suave"
    >
      Copiar
    </button>
  );
}
