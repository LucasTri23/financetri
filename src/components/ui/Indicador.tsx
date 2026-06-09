import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type VarianteIndicador = "neutro" | "entrada" | "saida";

const CORES_ICONE: Record<VarianteIndicador, string> = {
  neutro: "bg-azul-suave text-azul-texto",
  entrada: "bg-verde-suave text-verde-texto",
  saida: "bg-vermelho-suave text-vermelho-texto",
};

const CORES_VALOR: Record<VarianteIndicador, string> = {
  neutro: "text-texto",
  entrada: "text-verde-texto",
  saida: "text-vermelho-texto",
};

export function Indicador({
  variante = "neutro",
  icone,
  rotulo,
  valor,
  tendencia,
}: {
  variante?: VarianteIndicador;
  icone: ReactNode;
  rotulo: string;
  valor: string;
  tendencia: string;
}) {
  return (
    <div className="rounded-[18px] border border-borda bg-white px-6 py-[22px] shadow-cartao">
      <div className="flex items-center gap-2 text-[0.85rem] font-medium text-cinza">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[10px] text-base",
            CORES_ICONE[variante],
          )}
        >
          {icone}
        </span>
        {rotulo}
      </div>
      <div className={cn("my-3 text-[1.95rem] font-extrabold tracking-tight", CORES_VALOR[variante])}>
        {valor}
      </div>
      <div className="text-[0.82rem] font-semibold text-cinza-claro">{tendencia}</div>
    </div>
  );
}
