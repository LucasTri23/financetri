"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

type Modo = "rapido" | "mes" | "personalizado";

export function FiltroAnalises({
  periodoAtual,
  mesAtual: mesAtualParam,
  inicioAtual,
  fimAtual,
}: {
  periodoAtual?: string;
  mesAtual?: string;
  inicioAtual?: string;
  fimAtual?: string;
}) {
  const router = useRouter();
  const anoAtual = new Date().getFullYear();

  const modoInicial: Modo = inicioAtual ? "personalizado" : mesAtualParam ? "mes" : "rapido";
  const [modo, setModo] = useState<Modo>(modoInicial);

  // Mes/ano selecionado
  const partes = mesAtualParam?.split("-") ?? [];
  const [anoSel, setAnoSel] = useState(partes[0] ? parseInt(partes[0]) : anoAtual);
  const [mesSel, setMesSel] = useState(partes[1] ? parseInt(partes[1]) : new Date().getMonth() + 1);

  // Range personalizado
  const [inicio, setInicio] = useState(inicioAtual ?? "");
  const [fim, setFim] = useState(fimAtual ?? "");

  function aplicar() {
    if (modo === "mes") {
      router.push(`/analises?mes=${anoSel}-${String(mesSel).padStart(2, "0")}`);
    } else if (modo === "personalizado" && inicio && fim) {
      router.push(`/analises?inicio=${inicio}&fim=${fim}`);
    }
  }

  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 4 + i);

  return (
    <div className="mb-6 rounded-[18px] border border-borda bg-cartao px-5 py-4 shadow-cartao">
      {/* Tabs de modo */}
      <div className="mb-4 flex gap-2 border-b border-borda pb-3">
        {(["rapido", "mes", "personalizado"] as Modo[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              modo === m
                ? "bg-azul text-white"
                : "text-cinza hover:bg-azul-suave hover:text-azul-texto"
            }`}
          >
            {m === "rapido" && "Rápido"}
            {m === "mes" && "Mês específico"}
            {m === "personalizado" && "Período livre"}
          </button>
        ))}
      </div>

      {/* Modo rápido */}
      {modo === "rapido" && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Esta semana", valor: "semana" },
            { label: "Este mês", valor: "mes" },
            { label: "Este ano", valor: "ano" },
          ].map(({ label, valor }) => (
            <button
              key={valor}
              type="button"
              onClick={() => router.push(`/analises?periodo=${valor}`)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                periodoAtual === valor && !mesAtualParam && !inicioAtual
                  ? "bg-gradient-to-r from-azul-claro to-azul-escuro text-white shadow"
                  : "border border-borda bg-fundo text-texto hover:bg-azul-suave"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Mês específico */}
      {modo === "mes" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-cinza">Mês</label>
            <select
              value={mesSel}
              onChange={(e) => setMesSel(parseInt(e.target.value))}
              className="rounded-xl border border-borda bg-fundo px-3 py-2 text-sm text-texto outline-none focus:border-azul"
            >
              {MESES_PT.map((nome, i) => (
                <option key={i} value={i + 1}>{nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-cinza">Ano</label>
            <select
              value={anoSel}
              onChange={(e) => setAnoSel(parseInt(e.target.value))}
              className="rounded-xl border border-borda bg-fundo px-3 py-2 text-sm text-texto outline-none focus:border-azul"
            >
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={aplicar}
            className="rounded-xl bg-gradient-to-r from-azul-claro to-azul-escuro px-5 py-2 text-sm font-bold text-white shadow transition hover:opacity-90"
          >
            Ver
          </button>
        </div>
      )}

      {/* Período livre */}
      {modo === "personalizado" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-cinza">De</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="rounded-xl border border-borda bg-fundo px-3 py-2 text-sm text-texto outline-none focus:border-azul"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-cinza">Até</label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="rounded-xl border border-borda bg-fundo px-3 py-2 text-sm text-texto outline-none focus:border-azul"
            />
          </div>
          <button
            type="button"
            onClick={aplicar}
            disabled={!inicio || !fim}
            className="rounded-xl bg-gradient-to-r from-azul-claro to-azul-escuro px-5 py-2 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-40"
          >
            Ver
          </button>
        </div>
      )}
    </div>
  );
}
