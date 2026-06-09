import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { buscarDadosCalendario } from "./actions";
import { Calendario } from "./Calendario";

export const metadata: Metadata = {
  title: "Calendário — ControleFácil",
};

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const { mes: mesParam } = await searchParams;
  const hoje = new Date();
  let ano = hoje.getFullYear();
  let mes = hoje.getMonth() + 1;

  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [anoStr, mesStr] = mesParam.split("-");
    ano = parseInt(anoStr, 10);
    mes = parseInt(mesStr, 10);
    if (mes < 1 || mes > 12) { ano = hoje.getFullYear(); mes = hoje.getMonth() + 1; }
  }

  const mesAnterior = mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, "0")}`;
  const mesSeguinte = mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;

  const { eventosDoMes, saidasDoMes, dividasDoMes, entradasDoMes } =
    await buscarDadosCalendario(userId, ano, mes);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-texto">Calendário</h1>
          <p className="mt-1 text-sm text-cinza">Eventos e lançamentos do plano</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/calendario?mes=${mesAnterior}`}
            className="rounded-xl border border-borda bg-white px-3 py-2 text-sm font-semibold text-texto transition hover:bg-azul-suave"
          >
            ←
          </Link>
          <span className="min-w-[140px] text-center font-bold text-texto">
            {MESES_PT[mes - 1]} {ano}
          </span>
          <Link
            href={`/calendario?mes=${mesSeguinte}`}
            className="rounded-xl border border-borda bg-white px-3 py-2 text-sm font-semibold text-texto transition hover:bg-azul-suave"
          >
            →
          </Link>
        </div>
      </div>

      <Calendario
        ano={ano}
        mes={mes}
        userId={userId}
        eventos={eventosDoMes}
        saidas={saidasDoMes.map((s) => ({ ...s, valor: s.valor }))}
        dividas={dividasDoMes.map((d) => ({ ...d, valor: d.valor }))}
        entradas={entradasDoMes.map((e) => ({ ...e, valor: e.valor }))}
      />
    </>
  );
}
