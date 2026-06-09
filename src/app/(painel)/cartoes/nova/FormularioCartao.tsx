"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BotaoEnviar } from "@/components/auth/BotaoEnviar";
import { StatusFormulario } from "@/components/ui/StatusFormulario";
import { BANDEIRAS, CORES_CARTAO } from "@/lib/cartoes";

import { criarCartao, type EstadoCartao } from "../actions";

export function FormularioCartao() {
  const [estado, acao] = useActionState<EstadoCartao, FormData>(criarCartao, null);
  const router = useRouter();

  useEffect(() => {
    if (estado?.sucesso && estado.cartaoId) {
      router.push(`/cartoes/${estado.cartaoId}?novo=1`);
    }
  }, [estado, router]);

  const inputClass =
    "w-full rounded-xl border border-borda bg-white px-4 py-2.5 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave";
  const labelClass = "text-sm font-medium text-texto";

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nome" className={labelClass}>Nome do cartão</label>
          <input
            type="text"
            id="nome"
            name="nome"
            required
            placeholder="Ex: Nubank, Inter, C6"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bandeira" className={labelClass}>Bandeira</label>
          <select id="bandeira" name="bandeira" className={inputClass}>
            {BANDEIRAS.map((b) => (
              <option key={b.chave} value={b.chave}>{b.rotulo}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="diaFechamento" className={labelClass}>Dia de fechamento</label>
          <input
            type="number"
            id="diaFechamento"
            name="diaFechamento"
            required
            min={1}
            max={28}
            placeholder="Ex: 15"
            className={inputClass}
          />
          <p className="text-xs text-cinza">Dia em que a fatura fecha (1–28).</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="diaVencimento" className={labelClass}>Dia de vencimento</label>
          <input
            type="number"
            id="diaVencimento"
            name="diaVencimento"
            required
            min={1}
            max={28}
            placeholder="Ex: 10"
            className={inputClass}
          />
          <p className="text-xs text-cinza">Dia em que a fatura vence (1–28).</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Cor do cartão</span>
        <div className="flex flex-wrap gap-2.5">
          {CORES_CARTAO.map((cor, i) => (
            <label key={cor} className="cursor-pointer">
              <input
                type="radio"
                name="cor"
                value={cor}
                defaultChecked={i === 0}
                className="sr-only"
              />
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-transparent ring-2 ring-transparent transition hover:scale-110 has-[:checked]:border-white has-[:checked]:ring-offset-1"
                style={{ backgroundColor: cor }}
                aria-label={cor}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <BotaoEnviar texto="Salvar cartão" textoEnviando="Salvando…" />
        <StatusFormulario variante={estado?.sucesso ? "sucesso" : estado?.erro ? "erro" : "neutro"}>
          {estado?.sucesso ? "Cartão salvo!" : estado?.erro}
        </StatusFormulario>
      </div>
    </form>
  );
}
