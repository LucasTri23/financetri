import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cartoes, dividas, faturas, saidas } from "@/db/schema";
import {
  calcularDataVencimento,
  calcularMesReferencia,
  formatarMesReferencia,
  mesAberto,
} from "@/lib/cartoes";
import { ROTULO_POR_CATEGORIA } from "@/lib/categorias";
import { formatarData, formatarMoeda } from "@/lib/utils";
import { CelulaTabela, LinhaTabela, TabelaTransacoes } from "@/components/ui/TabelaTransacoes";

import { BotaoPagarFatura } from "./BotaoPagarFatura";

export const metadata: Metadata = { title: "Fatura — ControleFácil" };

type Item = { id: string; data: string; descricao: string; categoria: string; parcela: string | null; valor: number };

async function buscarDados(cartaoId: string, userId: string) {
  const [cartao] = await db
    .select()
    .from(cartoes)
    .where(and(eq(cartoes.id, cartaoId), eq(cartoes.usuarioId, userId)));

  if (!cartao) return null;

  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtualAberto = mesAberto(hoje, cartao.diaFechamento);

  const [todasSaidas, todasDividas, todasFaturas] = await Promise.all([
    db.select().from(saidas).where(eq(saidas.cartaoId, cartaoId)),
    db.select().from(dividas).where(eq(dividas.cartaoId, cartaoId)),
    db.select().from(faturas).where(eq(faturas.cartaoId, cartaoId)),
  ]);

  const statusFaturas = new Map(todasFaturas.map((f) => [f.mesReferencia, f]));

  // Agrupa itens por mesReferencia
  const porMes = new Map<string, Item[]>();

  function addItem(mesRef: string, item: Item) {
    if (!porMes.has(mesRef)) porMes.set(mesRef, []);
    porMes.get(mesRef)!.push(item);
  }

  for (const s of todasSaidas) {
    const mes = calcularMesReferencia(s.data, cartao.diaFechamento);
    addItem(mes, {
      id: s.id,
      data: s.data,
      descricao: s.descricao,
      categoria: s.categoria,
      parcela: null,
      valor: Number(s.valor),
    });
  }

  for (const d of todasDividas) {
    const mes = calcularMesReferencia(d.proximoVencimento, cartao.diaFechamento);
    addItem(mes, {
      id: d.id,
      data: d.proximoVencimento,
      descricao: d.descricao,
      categoria: d.categoria,
      parcela: `${Math.min(d.parcelaAtual + 1, d.totalParcelas)}/${d.totalParcelas}`,
      valor: Number(d.valorParcela),
    });
  }

  // Ordena itens dentro de cada mês por data
  for (const [, itens] of porMes) {
    itens.sort((a, b) => a.data.localeCompare(b.data));
  }

  const mesesOrdenados = [...porMes.keys()].sort((a, b) => b.localeCompare(a));

  const faturaAberta = {
    mesRef: mesAtualAberto,
    itens: porMes.get(mesAtualAberto) ?? [],
    total: (porMes.get(mesAtualAberto) ?? []).reduce((s, i) => s + i.valor, 0),
  };

  const faturasPendentes = mesesOrdenados
    .filter((mes) => mes < mesAtualAberto && !statusFaturas.get(mes)?.pago)
    .map((mes) => {
      const itens = porMes.get(mes) ?? [];
      const total = itens.reduce((s, i) => s + i.valor, 0);
      const vencimento = calcularDataVencimento(mes, cartao.diaVencimento);
      return { mesRef: mes, itens, total, vencimento, atrasada: vencimento < hoje };
    });

  const historico = mesesOrdenados
    .filter((mes) => mes < mesAtualAberto && statusFaturas.get(mes)?.pago)
    .map((mes) => {
      const itens = porMes.get(mes) ?? [];
      const total = itens.reduce((s, i) => s + i.valor, 0);
      const faturaRecord = statusFaturas.get(mes);
      return { mesRef: mes, itens, total, dataPagamento: faturaRecord?.dataPagamento ?? null };
    });

  return { cartao, hoje, faturaAberta, faturasPendentes, historico };
}

function TabelaFatura({ itens }: { itens: Item[] }) {
  if (itens.length === 0) {
    return <p className="py-3 text-sm text-cinza">Nenhum lançamento nesta fatura.</p>;
  }
  return (
    <TabelaTransacoes colunas={["Data", "Descrição", "Categoria", "Parc.", "Valor"]}>
      {itens.map((item) => (
        <LinhaTabela key={item.id}>
          <CelulaTabela className="text-cinza">{formatarData(item.data)}</CelulaTabela>
          <CelulaTabela>{item.descricao}</CelulaTabela>
          <CelulaTabela className="text-xs text-cinza">
            {ROTULO_POR_CATEGORIA[item.categoria] ?? item.categoria}
          </CelulaTabela>
          <CelulaTabela className="text-xs text-cinza">{item.parcela ?? "—"}</CelulaTabela>
          <CelulaTabela className="font-semibold text-vermelho-texto">
            {formatarMoeda(item.valor)}
          </CelulaTabela>
        </LinhaTabela>
      ))}
    </TabelaTransacoes>
  );
}

export default async function PaginaCartaoDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  const { id } = await params;
  const dados = await buscarDados(id, sessao.user.id);
  if (!dados) notFound();

  const { cartao, hoje, faturaAberta, faturasPendentes, historico } = dados;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/cartoes"
          className="rounded-xl border border-borda bg-cartao px-3 py-2 text-sm font-semibold text-cinza hover:bg-azul-suave transition"
        >
          ← Voltar
        </Link>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-extrabold text-white text-lg shadow"
          style={{ background: cartao.cor }}
        >
          {cartao.nome.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">{cartao.nome}</h1>
          <p className="text-sm text-cinza capitalize">
            {cartao.bandeira} • fecha dia {cartao.diaFechamento} • vence dia {cartao.diaVencimento}
          </p>
        </div>
      </div>

      {/* Fatura aberta */}
      <section className="mb-6 rounded-[18px] border border-borda bg-cartao px-7 py-6 shadow-cartao">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-[1.1rem] font-bold text-texto">
              Fatura aberta — {formatarMesReferencia(faturaAberta.mesRef)}
            </h2>
            <p className="text-sm text-cinza">
              Ainda acumulando até dia {cartao.diaFechamento}. Total:{" "}
              <span className="font-bold text-texto">{formatarMoeda(faturaAberta.total)}</span>
            </p>
          </div>
        </div>
        <TabelaFatura itens={faturaAberta.itens} />
      </section>

      {/* Faturas a pagar */}
      {faturasPendentes.length > 0 && (
        <section className="mb-6 flex flex-col gap-4">
          <h2 className="text-[1.1rem] font-bold text-texto">A pagar</h2>
          {faturasPendentes.map((fatura) => (
            <div
              key={fatura.mesRef}
              className={`rounded-[18px] border bg-cartao px-7 py-6 shadow-cartao ${
                fatura.atrasada ? "border-vermelho-texto/40" : "border-borda"
              }`}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-texto">
                      Fatura {formatarMesReferencia(fatura.mesRef)}
                    </h3>
                    {fatura.atrasada ? (
                      <span className="rounded-full bg-vermelho-texto px-2 py-0.5 text-[11px] font-bold text-white">
                        ATRASADA
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                        A PAGAR
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-cinza">
                    Vencimento:{" "}
                    <span className={`font-semibold ${fatura.atrasada ? "text-vermelho-texto" : "text-texto"}`}>
                      {new Date(fatura.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </p>
                  <p className="text-2xl font-extrabold text-vermelho-texto mt-1">
                    {formatarMoeda(fatura.total)}
                  </p>
                </div>
                <BotaoPagarFatura cartaoId={cartao.id} mesReferencia={fatura.mesRef} />
              </div>
              <TabelaFatura itens={fatura.itens} />
            </div>
          ))}
        </section>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-[1.1rem] font-bold text-texto">Histórico</h2>
          {historico.map((fatura) => (
            <details
              key={fatura.mesRef}
              className="rounded-[18px] border border-borda bg-cartao px-7 py-5 shadow-cartao"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-verde-texto text-lg">✓</span>
                  <div>
                    <p className="font-bold text-texto">Fatura {formatarMesReferencia(fatura.mesRef)}</p>
                    {fatura.dataPagamento && (
                      <p className="text-xs text-cinza">
                        Paga em {new Date(fatura.dataPagamento + "T12:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-extrabold text-texto">{formatarMoeda(fatura.total)}</span>
              </summary>
              <div className="mt-4 border-t border-borda pt-4">
                <TabelaFatura itens={fatura.itens} />
              </div>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
