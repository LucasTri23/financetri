import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Cartao({
  titulo,
  estreito,
  className,
  children,
}: {
  titulo?: string;
  estreito?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "mb-[22px] rounded-[18px] border border-borda bg-white px-7 py-6 shadow-cartao",
        estreito && "max-w-[620px]",
        className,
      )}
    >
      {titulo && <h2 className="mb-3 text-[1.15rem] font-bold text-texto">{titulo}</h2>}
      {children}
    </section>
  );
}

export function CartaoCredito({
  rotulo,
  icone,
  numero,
  legendaEsquerda,
  legendaDireita,
  className,
}: {
  rotulo: string;
  icone?: ReactNode;
  numero: string;
  legendaEsquerda: string;
  legendaDireita?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[172px] flex-col justify-between rounded-[18px] bg-gradient-to-br from-azul-claro to-azul-escuro p-6 text-white shadow-cartao",
        className,
      )}
    >
      <div className="flex items-start justify-between font-bold tracking-wide">
        <span>{rotulo}</span>
        {icone}
      </div>
      <div className="my-[18px] text-[1.3rem] font-extrabold tracking-wider">{numero}</div>
      <div className="flex items-end justify-between text-[0.78rem] opacity-90">
        <span>{legendaEsquerda}</span>
        {legendaDireita && <span>{legendaDireita}</span>}
      </div>
    </div>
  );
}

export function Atalho({
  variante,
  icone,
  titulo,
  descricao,
  href,
}: {
  variante: "entrada" | "saida" | "membros";
  icone: ReactNode;
  titulo: string;
  descricao: string;
  href: ComponentProps<"a">["href"];
}) {
  const coresIcone: Record<typeof variante, string> = {
    entrada: "bg-verde-suave text-verde-texto",
    saida: "bg-vermelho-suave text-vermelho-texto",
    membros: "bg-azul-suave text-azul-texto",
  };

  return (
    <a
      href={href}
      className="flex min-w-[200px] flex-1 items-center gap-3.5 rounded-2xl border border-borda bg-white px-5 py-[18px] text-texto shadow-cartao transition hover:-translate-y-0.5"
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[1.3rem]",
          coresIcone[variante],
        )}
      >
        {icone}
      </span>
      <span>
        <strong className="block text-[0.98rem]">{titulo}</strong>
        <span className="text-[0.82rem] text-cinza">{descricao}</span>
      </span>
    </a>
  );
}
