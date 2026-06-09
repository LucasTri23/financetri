"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { formatarMoeda } from "@/lib/utils";
import { adicionarEvento, excluirEvento, type EstadoEvento } from "./actions";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type Evento = {
  id: string;
  data: string;
  titulo: string;
  descricao: string | null;
  criadorId: string;
  criadorEmail: string | null;
  criadorNome: string | null;
};
type ItemFinanceiro = { id: string; data: string; descricao: string; valor: string | number };

type Props = {
  ano: number;
  mes: number;
  userId: string;
  eventos: Evento[];
  saidas: ItemFinanceiro[];
  dividas: ItemFinanceiro[];
  entradas: ItemFinanceiro[];
};

function gerarDias(ano: number, mes: number) {
  const primeiro = new Date(ano, mes - 1, 1);
  const ultimo = new Date(ano, mes, 0).getDate();
  const offset = (primeiro.getDay() + 6) % 7; // Segunda = 0
  const dias: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= ultimo; d++) dias.push(d);
  while (dias.length % 7 !== 0) dias.push(null);
  return dias;
}

function BotaoEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-gradient-to-r from-azul-claro to-azul-escuro py-2.5 text-sm font-bold text-white shadow transition disabled:opacity-50"
    >
      {pending ? "Adicionando…" : "Adicionar evento"}
    </button>
  );
}

export function Calendario({ ano, mes, userId, eventos, saidas, dividas, entradas }: Props) {
  const [diaAtivo, setDiaAtivo] = useState<number | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [estadoEvento, acaoEvento] = useActionState<EstadoEvento, FormData>(adicionarEvento, null);

  const hoje = new Date();
  const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;
  const diaHoje = ehMesAtual ? hoje.getDate() : null;

  const diasGrade = gerarDias(ano, mes);

  function isoParaDia(iso: string) {
    return parseInt(iso.slice(8, 10), 10);
  }

  function itensNoDia(d: number) {
    const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return {
      eventos: eventos.filter((e) => e.data === iso),
      saidas: saidas.filter((s) => s.data === iso),
      dividas: dividas.filter((dv) => dv.data === iso),
      entradas: entradas.filter((en) => en.data === iso),
    };
  }

  const diaAtivoItens = diaAtivo ? itensNoDia(diaAtivo) : null;
  const diaAtivoISO = diaAtivo
    ? `${ano}-${String(mes).padStart(2, "0")}-${String(diaAtivo).padStart(2, "0")}`
    : "";

  function labelPessoa(e: Evento) {
    return e.criadorId === userId ? "Você" : (e.criadorNome ?? e.criadorEmail?.split("@")[0] ?? "Outro");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      {/* Grade do calendário */}
      <div className="rounded-[18px] border border-borda bg-white p-5 shadow-cartao">
        <div className="mb-3 grid grid-cols-7 text-center">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-1 text-[0.72rem] font-bold uppercase tracking-wider text-cinza">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {diasGrade.map((dia, idx) => {
            if (!dia) return <div key={idx} />;
            const { eventos: evs, saidas: sas, dividas: dvs, entradas: ens } = itensNoDia(dia);
            const temItens = evs.length + sas.length + dvs.length + ens.length > 0;
            const eHoje = dia === diaHoje;
            const eAtivo = dia === diaAtivo;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setDiaAtivo(dia === diaAtivo ? null : dia)}
                className={`relative flex flex-col items-center rounded-xl p-1.5 pb-2 transition ${
                  eAtivo
                    ? "bg-gradient-to-br from-azul-claro to-azul-escuro text-white"
                    : eHoje
                    ? "border-2 border-azul bg-azul-suave text-azul-escuro"
                    : "hover:bg-fundo text-texto"
                }`}
              >
                <span className="text-sm font-semibold leading-5">{dia}</span>
                {temItens && (
                  <div className="mt-1 flex gap-0.5">
                    {evs.length > 0 && (
                      <span className={`h-1.5 w-1.5 rounded-full ${eAtivo ? "bg-white" : "bg-azul"}`} />
                    )}
                    {(sas.length > 0 || dvs.length > 0) && (
                      <span className={`h-1.5 w-1.5 rounded-full ${eAtivo ? "bg-white" : "bg-vermelho-texto"}`} />
                    )}
                    {ens.length > 0 && (
                      <span className={`h-1.5 w-1.5 rounded-full ${eAtivo ? "bg-white" : "bg-verde-texto"}`} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel lateral */}
      <div className="flex flex-col gap-4">
        {/* Detalhe do dia */}
        {diaAtivo && diaAtivoItens && (
          <div className="rounded-[18px] border border-borda bg-white px-5 py-5 shadow-cartao">
            <h3 className="mb-3 font-bold text-texto">
              {new Date(ano, mes - 1, diaAtivo).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>

            {diaAtivoItens.eventos.length === 0 &&
              diaAtivoItens.saidas.length === 0 &&
              diaAtivoItens.dividas.length === 0 &&
              diaAtivoItens.entradas.length === 0 && (
                <p className="text-sm italic text-cinza">Nenhum evento ou lançamento.</p>
              )}

            {diaAtivoItens.eventos.map((e) => (
              <div
                key={e.id}
                className="mb-2 flex items-start justify-between gap-2 rounded-xl bg-azul-suave px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-azul-escuro">📅 {e.titulo}</p>
                  {e.descricao && <p className="text-xs text-cinza">{e.descricao}</p>}
                  <p className="text-xs text-cinza">Por {labelPessoa(e)}</p>
                </div>
                {e.criadorId === userId && (
                  <form action={async () => { await excluirEvento(e.id); }}>
                    <button type="submit" className="text-xs text-cinza hover:text-vermelho-texto">✕</button>
                  </form>
                )}
              </div>
            ))}

            {diaAtivoItens.saidas.map((s) => (
              <div key={s.id} className="mb-2 rounded-xl bg-[#fff1f2] px-3 py-2">
                <p className="text-sm font-medium text-texto">↘ {s.descricao}</p>
                <p className="text-sm font-bold text-vermelho-texto">{formatarMoeda(Number(s.valor))}</p>
              </div>
            ))}

            {diaAtivoItens.dividas.map((d) => (
              <div key={d.id} className="mb-2 rounded-xl bg-[#fff7ed] px-3 py-2">
                <p className="text-sm font-medium text-texto">📋 {d.descricao}</p>
                <p className="text-sm font-bold text-[#c2410c]">{formatarMoeda(Number(d.valor))}</p>
              </div>
            ))}

            {diaAtivoItens.entradas.map((en) => (
              <div key={en.id} className="mb-2 rounded-xl bg-[#f0fdf4] px-3 py-2">
                <p className="text-sm font-medium text-texto">↗ {en.descricao}</p>
                <p className="text-sm font-bold text-verde-texto">{formatarMoeda(Number(en.valor))}</p>
              </div>
            ))}
          </div>
        )}

        {/* Formulário de novo evento */}
        <div className="rounded-[18px] border border-borda bg-white px-5 py-5 shadow-cartao">
          <button
            type="button"
            onClick={() => setMostrarForm(!mostrarForm)}
            className="mb-3 flex w-full items-center justify-between text-[1rem] font-bold text-texto"
          >
            <span>+ Novo evento</span>
            <span className="text-cinza text-sm">{mostrarForm ? "▲" : "▼"}</span>
          </button>

          {mostrarForm && (
            <form
              action={(formData) => {
                acaoEvento(formData);
                if (!estadoEvento?.erro) setMostrarForm(false);
              }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-texto">Título *</label>
                <input
                  name="titulo"
                  required
                  placeholder="Ex: Pagar aluguel, Aniversário…"
                  className="rounded-xl border border-borda px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-texto">Data *</label>
                <input
                  name="data"
                  type="date"
                  required
                  defaultValue={diaAtivoISO || new Date().toISOString().slice(0, 10)}
                  className="rounded-xl border border-borda px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-texto">Descrição</label>
                <input
                  name="descricao"
                  placeholder="Opcional"
                  className="rounded-xl border border-borda px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave"
                />
              </div>
              <BotaoEnviar />
              {estadoEvento?.sucesso && (
                <p className="text-center text-xs font-semibold text-verde-texto">Evento adicionado!</p>
              )}
              {estadoEvento?.erro && (
                <p className="text-center text-xs font-semibold text-vermelho-texto">{estadoEvento.erro}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
