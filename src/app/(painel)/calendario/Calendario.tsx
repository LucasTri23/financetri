"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { ETIQUETAS_EVENTO, ETIQUETA_POR_CHAVE } from "@/lib/etiquetas";
import { formatarMoeda } from "@/lib/utils";
import { adicionarEvento, excluirEvento, type EstadoEvento } from "./actions";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type Evento = {
  id: string; data: string; titulo: string; descricao: string | null;
  etiqueta: string; criadorId: string; criadorEmail: string | null; criadorNome: string | null;
};
type ItemFin = { id: string; data: string; descricao: string; valor: string | number };

type Props = {
  ano: number; mes: number; userId: string;
  eventos: Evento[]; saidas: ItemFin[]; dividas: ItemFin[]; entradas: ItemFin[];
};

function gerarDias(ano: number, mes: number) {
  const offset = (new Date(ano, mes - 1, 1).getDay() + 6) % 7;
  const total = new Date(ano, mes, 0).getDate();
  const dias: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= total; d++) dias.push(d);
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

function Etiqueta({ chave, pequena = false }: { chave: string; pequena?: boolean }) {
  const etiqueta = ETIQUETA_POR_CHAVE[chave] ?? ETIQUETA_POR_CHAVE["pessoal"];
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${pequena ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"}`}
      style={{ backgroundColor: etiqueta.cor + "22", color: etiqueta.cor, border: `1px solid ${etiqueta.cor}44` }}
    >
      {etiqueta.rotulo}
    </span>
  );
}

export function Calendario({ ano, mes, userId, eventos, saidas, dividas, entradas }: Props) {
  const [diaAtivo, setDiaAtivo] = useState<number | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [estadoEvento, acaoEvento, isPending] = useActionState<EstadoEvento, FormData>(adicionarEvento, null);

  const hoje = new Date();
  const diaHoje = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes ? hoje.getDate() : null;
  const diasGrade = gerarDias(ano, mes);

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
    : new Date().toISOString().slice(0, 10);

  function labelPessoa(e: Evento) {
    return e.criadorId === userId ? "Você" : (e.criadorNome ?? e.criadorEmail?.split("@")[0] ?? "Outro");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Grade */}
      <div className="rounded-[18px] border border-borda bg-cartao p-5 shadow-cartao">
        <div className="mb-2 grid grid-cols-7 text-center">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-1 text-[0.7rem] font-bold uppercase tracking-wider text-cinza">{d}</div>
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
                className={`relative flex flex-col items-center rounded-xl p-1.5 pb-2 transition-all ${
                  eAtivo
                    ? "bg-gradient-to-br from-azul-claro to-azul-escuro text-white shadow"
                    : eHoje
                    ? "border-2 border-azul bg-azul-suave text-azul-escuro"
                    : "hover:bg-azul-suave text-texto"
                }`}
              >
                <span className="text-sm font-semibold leading-6">{dia}</span>
                {temItens && (
                  <div className="flex gap-0.5 mt-0.5">
                    {evs.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${eAtivo ? "bg-white" : "bg-azul"}`} />}
                    {(sas.length + dvs.length) > 0 && <span className={`h-1.5 w-1.5 rounded-full ${eAtivo ? "bg-white" : "bg-vermelho-texto"}`} />}
                    {ens.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${eAtivo ? "bg-white" : "bg-verde-texto"}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-borda pt-3">
          <span className="flex items-center gap-1.5 text-xs text-cinza"><span className="h-2 w-2 rounded-full bg-azul" /> Eventos</span>
          <span className="flex items-center gap-1.5 text-xs text-cinza"><span className="h-2 w-2 rounded-full bg-vermelho-texto" /> Saídas / parcelas</span>
          <span className="flex items-center gap-1.5 text-xs text-cinza"><span className="h-2 w-2 rounded-full bg-verde-texto" /> Entradas</span>
        </div>
      </div>

      {/* Painel lateral */}
      <div className="flex flex-col gap-4">
        {/* Detalhe do dia */}
        {diaAtivo && diaAtivoItens && (
          <div className="rounded-[18px] border border-borda bg-cartao px-5 py-5 shadow-cartao">
            <h3 className="mb-3 font-bold text-texto">
              {new Date(ano, mes - 1, diaAtivo).toLocaleDateString("pt-BR", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </h3>

            {[...diaAtivoItens.eventos, ...diaAtivoItens.saidas, ...diaAtivoItens.dividas, ...diaAtivoItens.entradas].length === 0 && (
              <p className="text-sm italic text-cinza">Nenhum lançamento neste dia.</p>
            )}

            {diaAtivoItens.eventos.map((e) => (
              <div key={e.id} className="mb-2 rounded-xl border border-borda bg-azul-suave px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-texto">📅 {e.titulo}</p>
                      <Etiqueta chave={e.etiqueta} pequena />
                    </div>
                    {e.descricao && <p className="text-xs text-cinza">{e.descricao}</p>}
                    <p className="text-xs text-cinza mt-0.5">Por {labelPessoa(e)}</p>
                  </div>
                  {e.criadorId === userId && (
                    <form action={async () => { await excluirEvento(e.id); }}>
                      <button type="submit" title="Excluir" className="text-xs text-cinza hover:text-vermelho-texto transition">✕</button>
                    </form>
                  )}
                </div>
              </div>
            ))}

            {diaAtivoItens.saidas.map((s) => (
              <div key={s.id} className="mb-2 rounded-xl border border-vermelho-suave bg-vermelho-suave px-3 py-2">
                <p className="text-sm font-medium text-texto">↘ {s.descricao}</p>
                <p className="text-sm font-bold text-vermelho-texto">{formatarMoeda(Number(s.valor))}</p>
              </div>
            ))}
            {diaAtivoItens.dividas.map((d) => (
              <div key={d.id} className="mb-2 rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-3 py-2">
                <p className="text-sm font-medium text-texto">📋 {d.descricao}</p>
                <p className="text-sm font-bold text-[#c2410c]">{formatarMoeda(Number(d.valor))}</p>
              </div>
            ))}
            {diaAtivoItens.entradas.map((en) => (
              <div key={en.id} className="mb-2 rounded-xl border border-verde-suave bg-verde-suave px-3 py-2">
                <p className="text-sm font-medium text-texto">↗ {en.descricao}</p>
                <p className="text-sm font-bold text-verde-texto">{formatarMoeda(Number(en.valor))}</p>
              </div>
            ))}
          </div>
        )}

        {/* Formulário */}
        <div className="rounded-[18px] border border-borda bg-cartao px-5 py-5 shadow-cartao">
          <button
            type="button"
            onClick={() => setMostrarForm(!mostrarForm)}
            className="flex w-full items-center justify-between text-[0.95rem] font-bold text-texto"
          >
            <span>+ Novo evento</span>
            <span className="text-xs text-cinza">{mostrarForm ? "▲" : "▼"}</span>
          </button>

          {mostrarForm && (
            <form
              className="mt-4 flex flex-col gap-3"
              action={(fd) => {
                acaoEvento(fd);
                if (!isPending) setMostrarForm(false);
              }}
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-texto">Título *</label>
                <input name="titulo" required placeholder="Ex: Pagar aluguel…"
                  className="rounded-xl border border-borda bg-fundo px-3 py-2 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-texto">Data *</label>
                  <input name="data" type="date" required defaultValue={diaAtivoISO}
                    className="rounded-xl border border-borda bg-fundo px-3 py-2 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-texto">Etiqueta</label>
                  <select name="etiqueta"
                    className="rounded-xl border border-borda bg-fundo px-3 py-2 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave">
                    {ETIQUETAS_EVENTO.map((e) => (
                      <option key={e.chave} value={e.chave}>{e.rotulo}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-texto">Descrição</label>
                <input name="descricao" placeholder="Opcional"
                  className="rounded-xl border border-borda bg-fundo px-3 py-2 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave" />
              </div>
              <BotaoEnviar />
              {estadoEvento?.sucesso && <p className="text-center text-xs font-semibold text-verde-texto">Evento adicionado!</p>}
              {estadoEvento?.erro && <p className="text-center text-xs font-semibold text-vermelho-texto">{estadoEvento.erro}</p>}
            </form>
          )}
        </div>

        {/* Etiquetas legend */}
        <div className="rounded-[18px] border border-borda bg-cartao px-5 py-4 shadow-cartao">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-cinza">Etiquetas</p>
          <div className="flex flex-wrap gap-2">
            {ETIQUETAS_EVENTO.map((e) => <Etiqueta key={e.chave} chave={e.chave} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
