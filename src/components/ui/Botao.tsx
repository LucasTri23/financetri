import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export type VarianteBotao = "primario" | "secundario" | "entrada" | "saida" | "google";

const ESTILOS_BASE =
  "inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-3 text-[0.95rem] font-semibold " +
  "transition disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none";

const ESTILOS_VARIANTE: Record<VarianteBotao, string> = {
  primario:
    "bg-gradient-to-r from-azul to-azul-escuro text-white shadow-cartao hover:-translate-y-px",
  secundario: "border border-azul bg-white text-azul-texto hover:bg-azul-suave",
  entrada:
    "bg-gradient-to-r from-verde to-[#15803d] text-white shadow-[0_10px_22px_-10px_rgba(21,128,61,0.55)] hover:-translate-y-px",
  saida:
    "bg-gradient-to-r from-vermelho to-[#b91c1c] text-white shadow-[0_10px_22px_-10px_rgba(185,28,28,0.55)] hover:-translate-y-px",
  google: "border border-borda bg-white text-texto hover:bg-fundo",
};

export function Botao({
  variante = "primario",
  className,
  ...props
}: ComponentProps<"button"> & { variante?: VarianteBotao }) {
  return (
    <button
      className={cn(ESTILOS_BASE, ESTILOS_VARIANTE[variante], className)}
      {...props}
    />
  );
}

export function BotaoLink({
  variante = "primario",
  className,
  href,
  ...props
}: ComponentProps<typeof Link> & { variante?: VarianteBotao }) {
  return (
    <Link
      href={href}
      className={cn(ESTILOS_BASE, ESTILOS_VARIANTE[variante], className)}
      {...props}
    />
  );
}
