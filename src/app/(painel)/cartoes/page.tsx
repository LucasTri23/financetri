import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cartoes, dividas, faturas, saidas } from "@/db/schema";
import { calcularDataVencimento, calcularMesReferencia, formatarMesReferencia, mesAberto } from "@/lib/cartoes";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { formatarMoeda } from "@/lib/utils";

export const metadata: Metadata = { title: "Cartões — ControleFácil" };

type ResumoCartao = {
  id: string;
  nome: string;
  bandeira: string;
  diaFechamento: number;
  diaVencimento: number;
  cor: string;
  faturaAberta: { mesRef: string; total: number };
  faturasPendentes: Array<{ mesRef: string; total: number; vencimento: string; atrasada: boolean }>;
};

async function buscarCartoes(userId: string): Promise<ResumoCartao[]> {
  const meus = await db.select().from(cartoes).where(eq(cartoes.usuarioId, userId));
  if (meus.length === 0) return [];

  const hoje = new Date().toISOString().slice(0, 10);

  return Promise.all(
    meus.map(async (cartao) => {
      const mesAtualAberto = mesAberto(hoje, cartao.diaFechamento);

      const [todasSaidas, todasDividas, todasFaturas] = await Promise.all([
        db.select({ data: saidas.data, valor: saidas.valor })
          .from(saidas).where(eq(saidas.cartaoId, cartao.id)),
        db.select({ data: dividas.proximoVencimento, valor: dividas.valorParcela })
          .from(dividas).where(eq(dividas.cartaoId, cartao.id)),
        db.select({ mesReferencia: faturas.mesReferencia, pago: faturas.pago })
          .from(faturas).where(eq(faturas.cartaoId, cartao.id)),
      ]);

      const statusFaturas = new Map(todasFaturas.map((f) => [f.mesReferencia, f.pago]));

      // Agrupa totais por mesReferencia
      const totaisPorMes = new Map<string, number>();
      for (const s of todasSaidas) {
        const mes = calcularMesReferencia(s.data, cartao.diaFechamento);
        totaisPorMes.set(mes, (totaisPorMes.get(mes) ?? 0) + Number(s.valor));
      }
      for (const d of todasDividas) {
        const mes = calcularMesReferencia(d.data, cartao.diaFechamento);
        totaisPorMes.set(mes, (totaisPorMes.get(mes) ?? 0) + Number(d.valor));
      }

      const faturaAberta = {
        mesRef: mesAtualAberto,
        total: totaisPorMes.get(mesAtualAberto) ?? 0,
      };

      // Faturas fechadas (meses anteriores) não pagas
      const faturasPendentes = [...totaisPorMes.entries()]
        .filter(([mes]) => mes < mesAtualAberto && !statusFaturas.get(mes))
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([mesRef, total]) => {
          const vencimento = calcularDataVencimento(mesRef, cartao.diaVencimento);
          return { mesRef, total, vencimento, atrasada: vencimento < hoje };
        });

      return { ...cartao, faturaAberta, faturasPendentes };
    }),
  );
}

function BandeiraLabel({ bandeira }: { bandeira: string }) {
  const map: Record<string, string> = {
    visa: "VISA", mastercard: "MC", elo: "ELO", amex: "AMEX", hipercard: "HIPER", outro: "●●●",
  };
  return (
    <span className="font-mono text-[11px] font-extrabold tracking-widest text-white/80">
      {map[bandeira] ?? bandeira.toUpperCase()}
    </span>
  );
}

export default async function PaginaCartoes() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  const meusCartoes = await buscarCartoes(sessao.user.id);

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Meus cartões</h1>
          <p className="mt-1 text-sm text-cinza">{meusCartoes.length} cartão{meusCartoes.length !== 1 ? "s" : ""} cadastrado{meusCartoes.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/cartoes/nova"
          className="rounded-xl bg-gradient-to-r from-azul-claro to-azul-escuro px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
        >
          + Novo cartão
        </Link>
      </div>

      {meusCartoes.length === 0 ? (
        <EstadoVazio>
          Nenhum cartão cadastrado.{" "}
          <Link href="/cartoes/nova" className="font-semibold text-azul-texto hover:underline">
            Adicionar →
          </Link>
        </EstadoVazio>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {meusCartoes.map((cartao) => (
            <CartaoVisual key={cartao.id} cartao={cartao} />
          ))}
        </div>
      )}
    </>
  );
}

function CartaoVisual({ cartao }: { cartao: ResumoCartao }) {
  const temPendentes = cartao.faturasPendentes.length > 0;
  const proxPendente = cartao.faturasPendentes[0];

  return (
    <Link
      href={`/cartoes/${cartao.id}`}
      className="group block rounded-[22px] shadow-cartao transition hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Parte superior — visual do cartão */}
      <div
        className="relative overflow-hidden rounded-t-[22px] p-5 pb-6"
        style={{ background: `linear-gradient(135deg, ${cartao.cor}dd, ${cartao.cor}88)` }}
      >
        {/* Círculos decorativos */}
        <span className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-10 -right-4 h-24 w-24 rounded-full bg-white/8" />

        <div className="relative flex items-start justify-between">
          <p className="text-base font-extrabold tracking-tight text-white">{cartao.nome}</p>
          <BandeiraLabel bandeira={cartao.bandeira} />
        </div>

        {/* Chip decorativo */}
        <div className="relative mt-5 mb-3 flex gap-2">
          <span className="h-4 w-6 rounded-sm bg-white/30" />
          <span className="h-4 w-6 rounded-sm bg-white/15" />
        </div>

        <div className="relative flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Fatura aberta</p>
            <p className="text-lg font-extrabold text-white">{formatarMoeda(cartao.faturaAberta.total)}</p>
            <p className="text-[11px] text-white/60">
              {formatarMesReferencia(cartao.faturaAberta.mesRef)} • fecha dia {cartao.diaFechamento}
            </p>
          </div>
        </div>
      </div>

      {/* Parte inferior — fatura pendente ou status limpo */}
      <div className="rounded-b-[22px] border border-t-0 border-borda bg-cartao px-5 py-4">
        {temPendentes ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-texto">
                Fatura {formatarMesReferencia(proxPendente.mesRef)} a pagar
              </p>
              <p className="mt-0.5 text-lg font-extrabold text-vermelho-texto">
                {formatarMoeda(proxPendente.total)}
              </p>
              <p className={`text-xs ${proxPendente.atrasada ? "text-vermelho-texto font-semibold" : "text-cinza"}`}>
                {proxPendente.atrasada ? "⚠ Atrasada" : "Vence"} {new Date(proxPendente.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
            {cartao.faturasPendentes.length > 1 && (
              <span className="shrink-0 rounded-full bg-vermelho-texto px-2 py-0.5 text-[11px] font-bold text-white">
                +{cartao.faturasPendentes.length - 1}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-verde-texto">
            <span className="text-sm">✓</span>
            <p className="text-sm font-semibold">Nenhuma fatura pendente</p>
          </div>
        )}
      </div>
    </Link>
  );
}
