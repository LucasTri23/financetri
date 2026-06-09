"use client";

import { useActionState, useEffect, useRef } from "react";

import { BotaoEnviar } from "@/components/auth/BotaoEnviar";
import { StatusFormulario } from "@/components/ui/StatusFormulario";
import { hojeISO } from "@/lib/utils";

import { adicionarEntrada, type EstadoEntrada } from "./actions";

const TIPOS = [
  { chave: "salario", rotulo: "💰 Salário" },
  { chave: "freelance", rotulo: "💻 Freelance" },
  { chave: "investimento", rotulo: "📈 Investimento" },
  { chave: "presente", rotulo: "🎁 Presente" },
  { chave: "reembolso", rotulo: "↩ Reembolso" },
  { chave: "outro", rotulo: "📦 Outro" },
];

export function FormularioEntrada({
  membros,
}: {
  membros: { id: string; email: string }[];
}) {
  const [estado, acao] = useActionState<EstadoEntrada, FormData>(adicionarEntrada, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.sucesso) {
      formRef.current?.reset();
      const campoData = formRef.current?.querySelector<HTMLInputElement>('[name="data"]');
      if (campoData) campoData.value = hojeISO();
    }
  }, [estado]);

  const inputClass =
    "w-full rounded-xl border border-borda bg-white px-4 py-2.5 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave";
  const labelClass = "text-sm font-medium text-texto";

  return (
    <form ref={formRef} action={acao} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="descricao" className={labelClass}>Descrição</label>
          <input type="text" id="descricao" name="descricao" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="valor" className={labelClass}>Valor (R$)</label>
          <input type="number" id="valor" name="valor" required min="0.01" step="0.01" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="data" className={labelClass}>Data</label>
          <input type="date" id="data" name="data" required defaultValue={hojeISO()} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipo" className={labelClass}>Tipo</label>
          <select id="tipo" name="tipo" className={inputClass}>
            {TIPOS.map((t) => (
              <option key={t.chave} value={t.chave}>{t.rotulo}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipoLancamento" className={labelClass}>Lançamento</label>
          <select
            id="tipoLancamento"
            name="tipoLancamento"
            className={inputClass}
            onChange={(e) => {
              const bloco = document.getElementById("blocoFrequencia");
              if (bloco) bloco.hidden = e.target.value !== "recorrente";
            }}
          >
            <option value="unico">Único</option>
            <option value="recorrente">Recorrente</option>
          </select>
        </div>

        {membros.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recebedorId" className={labelClass}>Recebido por</label>
            <select id="recebedorId" name="recebedorId" className={inputClass}>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>{m.email}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div id="blocoFrequencia" hidden className="flex flex-col gap-1.5 border-l-4 border-verde pl-4">
        <label htmlFor="frequencia" className={labelClass}>Frequência</label>
        <select id="frequencia" name="frequencia" className={inputClass}>
          <option value="mensal">Mensal</option>
          <option value="semanal">Semanal</option>
          <option value="anual">Anual</option>
        </select>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <BotaoEnviar texto="Salvar entrada" textoEnviando="Salvando…" />
        <StatusFormulario variante={estado?.sucesso ? "sucesso" : estado?.erro ? "erro" : "neutro"}>
          {estado?.sucesso ? "Entrada salva com sucesso!" : estado?.erro}
        </StatusFormulario>
      </div>
    </form>
  );
}
