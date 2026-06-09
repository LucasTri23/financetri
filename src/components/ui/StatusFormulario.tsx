import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type VarianteStatus = "neutro" | "sucesso" | "erro";

const CORES: Record<VarianteStatus, string> = {
  neutro: "text-cinza",
  sucesso: "text-verde-texto",
  erro: "text-vermelho-texto",
};

export function StatusFormulario({
  variante = "neutro",
  children,
}: {
  variante?: VarianteStatus;
  children?: ReactNode;
}) {
  return (
    <p className={cn("min-h-[1.2em] text-[0.88rem] font-medium", CORES[variante])} role="status">
      {children}
    </p>
  );
}
