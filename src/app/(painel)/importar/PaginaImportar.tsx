"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { CATEGORIAS, sugerirCategoria } from "@/lib/categorias";
import { formatarData, formatarMoeda } from "@/lib/utils";
import type { Transacao } from "@/lib/pdfParser";

import { salvarTransacoesImportadas, type EstadoImportar, type TransacaoImportada } from "./actions";

// ── Sub-botão de envio ────────────────────────────────────────────────────────

function BotaoSalvar({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || total === 0}
      className="rounded-xl bg-gradient-to-r from-azul-claro to-azul-escuro px-6 py-2.5 text-sm font-bold text-white shadow transition disabled:opacity-50"
    >
      {pending ? "Salvando…" : `Salvar ${total} transaç${total === 1 ? "ão" : "ões"}`}
    </button>
  );
}

// ── Linha editável da tabela ──────────────────────────────────────────────────

type LinhaProps = {
  transacao: TransacaoImportada;
  idx: number;
  onChange: (idx: number, patch: Partial<TransacaoImportada>) => void;
};

function LinhaTransacao({ transacao: t, idx, onChange }: LinhaProps) {
  return (
    <tr className={`border-b border-borda text-sm transition ${t.incluir ? "" : "opacity-40"}`}>
      <td className="py-2.5 pl-4 pr-2">
        <input
          type="checkbox"
          checked={t.incluir}
          onChange={(e) => onChange(idx, { incluir: e.target.checked })}
          className="h-4 w-4 accent-azul cursor-pointer"
        />
      </td>
      <td className="py-2.5 px-2 text-cinza whitespace-nowrap">{formatarData(t.dataTexto)}</td>
      <td className="py-2.5 px-2">
        <input
          type="text"
          value={t.descricao}
          onChange={(e) => onChange(idx, { descricao: e.target.value })}
          className="w-full min-w-[180px] rounded-lg border border-borda bg-white px-2 py-1 text-sm text-texto outline-none focus:border-azul focus:ring-1 focus:ring-azul-suave"
        />
      </td>
      <td className="py-2.5 px-2 text-cinza whitespace-nowrap text-center">
        {t.ehParcelado && t.parcelaAtual != null && t.totalParcelas != null
          ? `${t.parcelaAtual}/${t.totalParcelas}`
          : "—"}
      </td>
      <td className="py-2.5 px-2">
        <select
          value={t.categoria}
          onChange={(e) => onChange(idx, { categoria: e.target.value })}
          className="rounded-lg border border-borda bg-white px-2 py-1 text-sm text-texto outline-none focus:border-azul focus:ring-1 focus:ring-azul-suave"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.chave} value={c.chave}>
              {c.rotulo}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2.5 px-2">
        <select
          value={t.tipo}
          onChange={(e) => onChange(idx, { tipo: e.target.value as TransacaoImportada["tipo"] })}
          className="rounded-lg border border-borda bg-white px-2 py-1 text-sm text-texto outline-none focus:border-azul focus:ring-1 focus:ring-azul-suave"
        >
          <option value="saida">Saída</option>
          <option value="divida">Parcelado</option>
          <option value="entrada">Entrada</option>
        </select>
      </td>
      <td
        className={`py-2.5 pr-4 pl-2 text-right font-semibold whitespace-nowrap ${t.ehEntrada ? "text-verde-texto" : "text-vermelho-texto"}`}
      >
        {t.ehEntrada ? "+" : "−"} {formatarMoeda(Math.abs(t.valor))}
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function PaginaImportar() {
  const [processando, setProcessando] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [transacoes, setTransacoes] = useState<TransacaoImportada[]>([]);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [estadoSalvar, acaoSalvar] = useActionState<EstadoImportar, FormData>(
    salvarTransacoesImportadas,
    null,
  );
  const [, startTransition] = useTransition();

  function converterTransacao(t: Transacao): TransacaoImportada {
    const ehEntrada = t.ehEntradaNegativa;
    const tipo: TransacaoImportada["tipo"] = ehEntrada ? "entrada" : t.ehParcelado ? "divida" : "saida";
    return {
      incluir: !ehEntrada,
      dataTexto: t.dataTexto,
      descricao: t.descricao,
      valor: Math.abs(t.valor),
      parcelaAtual: t.parcelaAtual,
      totalParcelas: t.totalParcelas,
      ehParcelado: t.ehParcelado,
      ehEntrada,
      categoria: sugerirCategoria(t.descricao),
      tipo,
    };
  }

  async function processar(file: File) {
    setProcessando(true);
    setErroUpload(null);
    setTransacoes([]);
    setArquivo(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Dynamic import to keep pdfjs out of the SSR bundle
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url,
      ).toString();

      const { parseFaturaPdf } = await import("@/lib/pdfParser");
      const { transacoes: lista } = await parseFaturaPdf(pdfjsLib, arrayBuffer);

      if (lista.length === 0) {
        setErroUpload("Nenhuma transação encontrada. Verifique se o PDF é uma fatura Nubank ou Itaú.");
      } else {
        setTransacoes(lista.map(converterTransacao));
      }
    } catch (e) {
      setErroUpload(`Erro ao processar o PDF: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProcessando(false);
    }
  }

  function onChange(idx: number, patch: Partial<TransacaoImportada>) {
    setTransacoes((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }

  function selecionarTodas(incluir: boolean) {
    setTransacoes((prev) => prev.map((t) => ({ ...t, incluir })));
  }

  const totalSelecionadas = transacoes.filter((t) => t.incluir).length;
  const sucesso = estadoSalvar?.sucesso;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-texto">Importar fatura</h1>
        <p className="mt-1 text-sm text-cinza">Suporta PDF de faturas Nubank e Itaú.</p>
      </div>

      {/* Upload */}
      <section className="mb-6 rounded-[18px] border border-borda bg-white px-7 py-6 shadow-cartao">
        <h2 className="mb-3 text-[1.05rem] font-bold text-texto">1. Selecione o arquivo PDF</h2>

        <label
          htmlFor="pdf-input"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-borda bg-fundo px-6 py-10 text-center transition hover:border-azul hover:bg-azul-suave"
        >
          <span className="text-3xl" aria-hidden="true">📄</span>
          <span className="text-sm font-semibold text-azul-texto">
            {arquivo ? arquivo : "Clique para selecionar a fatura"}
          </span>
          {!arquivo && (
            <span className="text-xs text-cinza">ou arraste o arquivo aqui</span>
          )}
          <input
            id="pdf-input"
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processar(file);
            }}
          />
        </label>

        {processando && (
          <p className="mt-3 text-center text-sm text-cinza animate-pulse">Processando PDF…</p>
        )}
        {erroUpload && (
          <p className="mt-3 text-center text-sm font-medium text-vermelho-texto">{erroUpload}</p>
        )}
      </section>

      {/* Tabela de revisão */}
      {transacoes.length > 0 && (
        <section className="mb-6 rounded-[18px] border border-borda bg-white px-7 py-6 shadow-cartao">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[1.05rem] font-bold text-texto">
              2. Revise e confirme ({transacoes.length} transações detectadas)
            </h2>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => selecionarTodas(true)}
                className="rounded-lg border border-borda bg-white px-3 py-1.5 text-xs font-semibold text-texto transition hover:bg-azul-suave"
              >
                Selecionar todas
              </button>
              <button
                type="button"
                onClick={() => selecionarTodas(false)}
                className="rounded-lg border border-borda bg-white px-3 py-1.5 text-xs font-semibold text-texto transition hover:bg-azul-suave"
              >
                Desmarcar todas
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-borda">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-fundo text-left text-xs font-semibold uppercase tracking-wide text-cinza">
                  <th className="py-3 pl-4 pr-2"></th>
                  <th className="py-3 px-2">Data</th>
                  <th className="py-3 px-2">Descrição</th>
                  <th className="py-3 px-2 text-center">Parcela</th>
                  <th className="py-3 px-2">Categoria</th>
                  <th className="py-3 px-2">Tipo</th>
                  <th className="py-3 pl-2 pr-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((t, idx) => (
                  <LinhaTransacao key={idx} transacao={t} idx={idx} onChange={onChange} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Formulário de salvamento */}
          <form
            className="mt-5 flex flex-wrap items-center gap-4"
            action={(formData) => {
              formData.set("transacoes", JSON.stringify(transacoes));
              startTransition(() => acaoSalvar(formData));
            }}
          >
            <BotaoSalvar total={totalSelecionadas} />
            {sucesso && (
              <p className="text-sm font-semibold text-verde-texto">{sucesso}</p>
            )}
            {estadoSalvar?.erro && (
              <p className="text-sm font-semibold text-vermelho-texto">{estadoSalvar.erro}</p>
            )}
          </form>
        </section>
      )}
    </>
  );
}
