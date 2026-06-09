import type { Metadata } from "next";

import { Atalho, Cartao, CartaoCredito } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Indicador } from "@/components/ui/Indicador";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Painel — Controle Financeiro",
};

export default async function PaginaDashboard() {
  const sessao = await auth();
  const nome = sessao?.user?.name ?? sessao?.user?.email ?? "";

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Visão geral</h1>
          <p className="mt-1 text-sm text-cinza">Olá, {nome}. Seu painel financeiro num relance.</p>
        </div>
      </div>

      <section className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[18px]">
        <CartaoCredito
          rotulo="Saldo do mês"
          icone={<span aria-hidden="true">💳</span>}
          numero="R$ —"
          legendaEsquerda="Entradas − saídas − parcelas"
        />
        <Indicador
          variante="entrada"
          icone={<span aria-hidden="true">↗</span>}
          rotulo="Total de entradas"
          valor="R$ —"
          tendencia="Cadastradas neste mês"
        />
        <Indicador
          variante="saida"
          icone={<span aria-hidden="true">↘</span>}
          rotulo="Total de saídas e parcelas"
          valor="R$ —"
          tendencia="A pagar neste mês"
        />
      </section>

      <Cartao titulo="Acesso rápido">
        <div className="flex flex-wrap gap-3.5">
          <Atalho
            variante="saida"
            icone={<span aria-hidden="true">↘</span>}
            titulo="Nova saída"
            descricao="Pix, débito, parcelado ou recorrente"
            href="/saidas"
          />
          <Atalho
            variante="entrada"
            icone={<span aria-hidden="true">↗</span>}
            titulo="Nova entrada"
            descricao="Salário ou outras receitas"
            href="/entradas"
          />
          <Atalho
            variante="membros"
            icone={<span aria-hidden="true">👥</span>}
            titulo="Plano compartilhado"
            descricao="Convide alguém para juntar as finanças"
            href="/plano"
          />
        </div>
      </Cartao>

      <Cartao titulo="Próximas parcelas e saídas">
        <EstadoVazio>
          O painel completo (saldo do mês, indicadores, próximos vencimentos) ainda está sendo
          construído.
        </EstadoVazio>
      </Cartao>
    </>
  );
}
