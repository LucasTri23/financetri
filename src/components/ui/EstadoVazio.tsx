import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function EstadoVazio({ erro, children }: { erro?: boolean; children: ReactNode }) {
  return (
    <p className={cn("italic text-cinza-claro", erro && "not-italic text-vermelho-texto")}>
      {children}
    </p>
  );
}
