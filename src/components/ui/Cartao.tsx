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
        "mb-[22px] rounded-[20px] border border-borda bg-cartao px-7 py-6 shadow-cartao",
        estreito && "max-w-[620px]",
        className,
      )}
    >
      {titulo && (
        <h2 className="mb-4 text-[1.1rem] font-bold text-texto">{titulo}</h2>
      )}
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
        "relative overflow-hidden flex min-h-[172px] flex-col justify-between rounded-[22px] bg-gradient-to-br from-[#1d87c4] via-[#0369a1] to-[#0c4a6e] p-6 text-white shadow-cartao",
        className,
      )}
    >
      {/* Círculos decorativos */}
      <span className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-14 right-6 h-36 w-36 rounded-full bg-white/[0.07]" />
      <span className="pointer-events-none absolute top-1/2 -left-6 h-24 w-24 -translate-y-1/2 rounded-full bg-white/[0.05]" />

      <div className="relative flex items-start justify-between">
        <span className="text-[0.85rem] font-bold tracking-wide text-white/80">{rotulo}</span>
        {icone && <span className="opacity-70">{icone}</span>}
      </div>

      <div className="relative">
        <p className="text-[2rem] font-extrabold tracking-tight leading-none">{numero}</p>
      </div>

      <div className="relative flex items-end justify-between text-[0.77rem] text-white/70">
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
      className="group flex min-w-[200px] flex-1 items-center gap-3.5 rounded-2xl border border-borda bg-cartao px-5 py-[18px] text-texto shadow-cartao transition hover:-translate-y-0.5 hover:shadow-cartao-hover"
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[1.3rem] transition group-hover:scale-110",
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
