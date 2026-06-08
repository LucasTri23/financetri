import Link from "next/link";
import type { ReactNode } from "react";

export function CartaoAuth({
  titulo,
  descricao,
  rodapeTexto,
  rodapeLinkTexto,
  rodapeLinkHref,
  children,
}: {
  titulo: string;
  descricao: string;
  rodapeTexto: string;
  rodapeLinkTexto: string;
  rodapeLinkHref: string;
  children: ReactNode;
}) {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(circle at 14% 18%, rgba(125, 211, 252, 0.5), transparent 42%)," +
          "radial-gradient(circle at 86% 82%, rgba(14, 165, 233, 0.35), transparent 46%)," +
          "var(--color-fundo)",
      }}
    >
      <section className="w-full max-w-[408px] rounded-[22px] border border-white/60 bg-white/90 p-9 shadow-cartao backdrop-blur">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] bg-gradient-to-br from-azul-claro to-azul-escuro font-extrabold text-white">
            CF
          </span>
          <span className="text-[1.08rem] font-extrabold tracking-tight text-azul-escuro">
            Controle Financeiro
          </span>
        </div>

        <h2 className="mb-1 text-2xl font-bold text-texto">{titulo}</h2>
        <p className="mb-5 text-sm text-cinza">{descricao}</p>

        {children}

        <p className="mt-6 text-center text-sm text-cinza">
          {rodapeTexto}{" "}
          <Link href={rodapeLinkHref} className="font-semibold text-azul-texto hover:underline">
            {rodapeLinkTexto}
          </Link>
        </p>
      </section>
    </main>
  );
}
