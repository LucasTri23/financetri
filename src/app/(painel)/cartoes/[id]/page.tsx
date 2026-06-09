import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cartoes, dividas, faturas, saidas } from "@/db/schema";
import { calcularDataVencimento, calcularMesReferencia, formatarMesReferencia, mesAberto } from "@/lib/cartoes";
import { ROTULO_POR_CATEGORIA } from "@/lib/categorias";
import { formatarData, formatarMoeda } from "@/lib/utils";
import { BotaoExcluir } from "@/components/ui/BotaoExcluir";
import { CelulaTabela, LinhaTabela, TabelaTransacoes } from "@/components/ui/TabelaTransacoes";

import { BotaoPagarFatura } from "./BotaoPagarFatura";
import { BotaoExcluirFatura } from "./BotaoExcluirFatura";
import { BotaoExcluirCartao } from "./BotaoExcluirCartao";
import { excluirItemDivida, excluirItemSaida } from "../actions";

export const metadata: Metadata = { title: "Fatura — ControleFácil" };

type Item = {
  id: string;
  tipo: "saida" | "divida";
  data: string;
  descricao: string;
  categoria: string;
  parcela: string | null;
  valor: number;
};

async function buscarDados(cartaoId: string, userId: string) {
  const [cartao] = await db.select().from(cartoes)
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
  const porMes = new Map<string, Item[]>();

  function addItem(mesRef: string, item: Item) {
    if (!porMes.has(mesRef)) porMes.set(mesRef, []);
    porMes.get(mesRef)!.push(item);
  }

  for (const s of todasSaidas) {
    addItem(calcularMesReferencia(s.data, cartao.diaFechamento), {
      id: s.id, tipo: "saida", data: s.data, descricao: s.descricao,
      categoria: s.categoria, parcela: null, valor: Number(s.valor),
    });
  }
  for (const d of todasDividas) {
    addItem(calcularMesReferencia(d.proximoVencimento, cartao.diaFechamento), {
      id: d.id, tipo: "divida", data: d.proximoVencimento, descricao: d.descricao,
      categoria: d.categoria,
      parcela: `${Math.min(d.parcelaAtual + 1, d.totalParcelas)}/${d.totalParcelas}`,
      valor: Number(d.valorParcela),
    });
  }

  for (const itens of porMes.values()) itens.sort((a, b) => a.data.localeCompare(b.data));
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
      return { mesRef: mes, itens, total, dataPagamento: statusFaturas.get(mes)?.dataPagamento ?? null };
    });

  return { cartao, hoje, faturaAberta, faturasPendentes, historico };
}

function TabelaFatura({ itens, cartaoId }: { itens: Item[]; cartaoId: string }) {
  if (itens.length === 0) return <p className="py-3 text-sm text-cinza italic">Nenhum lançamento nesta fatura.</p>;
  return (
    <TabelaTransacoes colunas={["Data", "Descrição", "Categoria", "Parc.", "Valor", ""]}>
      {itens.map((item) => {
        const acao = item.tipo === "saida"
          ? excluirItemSaida.bind(null, item.id)
          : excluirItemDivida.bind(null, item.id);
        return (
          <LinhaTabela key={item.id}>
            <CelulaTabela className="text-cinza">{formatarData(item.data)}</CelulaTabela>
            <CelulaTabela>{item.descricao}</CelulaTabela>
            <CelulaTabela className="text-xs text-cinza">
              {ROTULO_POR_CATEGORIA[item.categoria] ?? item.categoria}
            </CelulaTabela>
            <CelulaTabela className="text-xs text-cinza">{item.parcela ?? "—"}</CelulaTabela>
            <CelulaTabela className="font-semibold text-vermelho-texto">{formatarMoeda(item.valor)}</CelulaTabela>
            <CelulaTabela className="w-8">
              <BotaoExcluir acao={acao} mensagem={`Excluir "${item.descricao}" da fatura?`} />
            </CelulaTabela>
          </LinhaTabela>
        );
      })}
    </TabelaTransacoes>
  );
}

export default async function PaginaCartaoDetalhe({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const dados = await buscarDados(id, sessao.user.id);
  if (!dados) notFound();

  const { cartao, hoje, faturaAberta, faturasPendentes, historico } = dados;
  const recemCriado = sp.novo === "1";

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/cartoes" className="rounded-xl border border-borda bg-cartao px-3 py-2 text-sm font-semibold text-cinza hover:bg-azul-suave transition">
          ← Voltar
        </Link>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-extrabold text-white text-lg shadow" style={{ background: cartao.cor }}>
          {cartao.nome.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">{cartao.nome}</h1>
          <p className="text-sm text-cinza capitalize">{cartao.bandeira} • fecha dia {cartao.diaFechamento} • vence dia {cartao.diaVencimento}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <BotaoExcluirCartao cartaoId={cartao.id} nomeCartao={cartao.nome} />
          <Link
            href={`/importar?cartaoId=${cartao.id}`}
            className="rounded-xl bg-gradient-to-r from-azul-claro to-azul-escuro px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
          >
            📄 Importar fatura PDF
          </Link>
        </div>
      </div>

      {/* Banner pós-criação */}
      {recemCriado && (
        <div className="mb-6 flex flex-wrap items-center gap-5 rounded-[18px] border border-[#8b5cf6]/30 bg-[#8b5cf6]/8 px-6 py-5">
          <div className="flex-1">
            <p className="font-bold text-texto">Cartão criado com sucesso! 🎉</p>
            <p className="mt-0.5 text-sm text-cinza">
              Deseja importar a fatura deste cartão agora? Basta fazer o upload do PDF do extrato.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/importar?cartaoId=${cartao.id}`}
              className="rounded-xl bg-[#8b5cf6] px-4 py-2 text-sm font-bold text-white shadow transition hover:opacity-90"
            >
              Sim, importar PDF
            </Link>
            <Link
              href={`/cartoes/${cartao.id}`}
              className="rounded-xl border border-borda bg-cartao px-4 py-2 text-sm font-semibold text-cinza transition hover:bg-azul-suave"
            >
              Agora não
            </Link>
          </div>
        </div>
      )}

      {/* Fatura aberta */}
      <section className="mb-6 rounded-[20px] border border-borda bg-cartao px-7 py-6 shadow-cartao">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-[1.1rem] font-bold text-texto">
              Fatura aberta — {formatarMesReferencia(faturaAberta.mesRef)}
            </h2>
            <p className="text-sm text-cinza">
              Acumulando até dia {cartao.diaFechamento}. Total:{" "}
              <span className="font-bold text-texto">{formatarMoeda(faturaAberta.total)}</span>
            </p>
          </div>
        </div>
        <TabelaFatura itens={faturaAberta.itens} cartaoId={cartao.id} />
      </section>

      {/* A pagar */}
      {faturasPendentes.length > 0 && (
        <section className="mb-6 flex flex-col gap-4">
          <h2 className="text-[1.1rem] font-bold text-texto">A pagar</h2>
          {faturasPendentes.map((fatura) => (
            <div key={fatura.mesRef} className={`rounded-[20px] border bg-cartao px-7 py-6 shadow-cartao ${fatura.atrasada ? "border-vermelho-texto/40" : "border-borda"}`}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-texto">Fatura {formatarMesReferencia(fatura.mesRef)}</h3>
                    {fatura.atrasada
                      ? <span className="rounded-full bg-vermelho-texto px-2 py-0.5 text-[11px] font-bold text-white">ATRASADA</span>
                      : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">A PAGAR</span>
                    }
                  </div>
                  <p className="mt-0.5 text-sm text-cinza">
                    Vencimento:{" "}
                    <span className={`font-semibold ${fatura.atrasada ? "text-vermelho-texto" : "text-texto"}`}>
                      {new Date(fatura.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </p>
                  <p className="text-2xl font-extrabold text-vermelho-texto mt-1">{formatarMoeda(fatura.total)}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <BotaoPagarFatura cartaoId={cartao.id} mesReferencia={fatura.mesRef} />
                  <BotaoExcluirFatura cartaoId={cartao.id} mesReferencia={fatura.mesRef} />
                </div>
              </div>
              <TabelaFatura itens={fatura.itens} cartaoId={cartao.id} />
            </div>
          ))}
        </section>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-[1.1rem] font-bold text-texto">Histórico</h2>
          {historico.map((fatura) => (
            <details key={fatura.mesRef} className="rounded-[20px] border border-borda bg-cartao px-7 py-5 shadow-cartao">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-verde-texto text-lg">✓</span>
                  <div>
                    <p className="font-bold text-texto">Fatura {formatarMesReferencia(fatura.mesRef)}</p>
                    {fatura.dataPagamento && (
                      <p className="text-xs text-cinza">Paga em {new Date(fatura.dataPagamento + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                </div>
                <span className="font-extrabold text-texto">{formatarMoeda(fatura.total)}</span>
              </summary>
              <div className="mt-4 border-t border-borda pt-4">
                <TabelaFatura itens={fatura.itens} cartaoId={cartao.id} />
              </div>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
