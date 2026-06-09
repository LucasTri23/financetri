"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { BotaoEnviar } from "@/components/auth/BotaoEnviar";
import { StatusFormulario } from "@/components/ui/StatusFormulario";
import { CATEGORIAS } from "@/lib/categorias";
import { hojeISO } from "@/lib/utils";

import { adicionarSaida, type EstadoSaida } from "./actions";

export function FormularioSaida({
  membrosDoPlanoPlan,
  cartoesDisponiveis = [],
  redirecionarParaLista = false,
}: {
  membrosDoPlanoPlan: { id: string; email: string }[];
  cartoesDisponiveis?: { id: string; nome: string }[];
  redirecionarParaLista?: boolean;
}) {
  const [estado, acao] = useActionState<EstadoSaida, FormData>(adicionarSaida, null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [metodo, setMetodo] = useState("");
  const [tipoLancamento, setTipoLancamento] = useState("unico");

  useEffect(() => {
    if (estado?.sucesso) {
      if (redirecionarParaLista) {
        router.push("/saidas");
      } else {
        formRef.current?.reset();
        setMetodo("");
        setTipoLancamento("unico");
        const campoData = formRef.current?.querySelector<HTMLInputElement>('[name="data"]');
        if (campoData) campoData.value = hojeISO();
      }
    }
  }, [estado, redirecionarParaLista, router]);

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
          <label htmlFor="categoria" className={labelClass}>Categoria</label>
          <select id="categoria" name="categoria" className={inputClass}>
            {CATEGORIAS.map((c) => (
              <option key={c.chave} value={c.chave}>{c.rotulo}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="metodo" className={labelClass}>Método de pagamento</label>
          <select
            id="metodo"
            name="metodo"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            className={inputClass}
          >
            <option value="">— Selecione —</option>
            <option value="cartao_credito">Cartão de crédito</option>
            <option value="cartao_debito">Cartão de débito</option>
            <option value="pix">Pix</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="boleto">Boleto</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tipoLancamento" className={labelClass}>Tipo de lançamento</label>
          <select
            id="tipoLancamento"
            name="tipoLancamento"
            value={tipoLancamento}
            onChange={(e) => setTipoLancamento(e.target.value)}
            className={inputClass}
          >
            <option value="unico">Único</option>
            <option value="parcelado">Parcelado</option>
            <option value="recorrente">Recorrente</option>
          </select>
        </div>
      </div>

      {/* Seletor de cartão — só aparece quando método for crédito */}
      {metodo === "cartao_credito" && (
        <div className="flex flex-col gap-1.5 rounded-xl border-l-4 border-[#8b5cf6] bg-[#8b5cf6]/5 pl-4 py-3 pr-3">
          <label htmlFor="cartaoId" className={labelClass}>Cartão</label>
          {cartoesDisponiveis.length > 0 ? (
            <select id="cartaoId" name="cartaoId" className={inputClass}>
              <option value="">— Sem vínculo —</option>
              {cartoesDisponiveis.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-cinza">
              Nenhum cartão cadastrado.{" "}
              <a href="/cartoes/nova" className="font-semibold text-azul-texto hover:underline">
                Adicionar cartão →
              </a>
            </p>
          )}
        </div>
      )}

      {tipoLancamento === "parcelado" && (
        <div className="flex flex-col gap-1.5 border-l-4 border-azul-claro pl-4">
          <label htmlFor="totalParcelas" className={labelClass}>Número de parcelas</label>
          <input type="number" id="totalParcelas" name="totalParcelas" min="2" className={inputClass} />
        </div>
      )}

      {tipoLancamento === "recorrente" && (
        <div className="flex flex-col gap-1.5 border-l-4 border-azul-claro pl-4">
          <label htmlFor="frequencia" className={labelClass}>Frequência</label>
          <select id="frequencia" name="frequencia" className={inputClass}>
            <option value="mensal">Mensal</option>
            <option value="semanal">Semanal</option>
            <option value="anual">Anual</option>
          </select>
        </div>
      )}

      {membrosDoPlanoPlan.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pagadorId" className={labelClass}>Pago por</label>
          <select id="pagadorId" name="pagadorId" className={inputClass}>
            {membrosDoPlanoPlan.map((m) => (
              <option key={m.id} value={m.id}>{m.email}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <BotaoEnviar texto="Salvar saída" textoEnviando="Salvando…" />
        <StatusFormulario variante={estado?.sucesso ? "sucesso" : estado?.erro ? "erro" : "neutro"}>
          {estado?.sucesso ? "Saída salva com sucesso!" : estado?.erro}
        </StatusFormulario>
      </div>
    </form>
  );
}
