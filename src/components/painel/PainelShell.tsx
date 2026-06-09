"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Secao = {
  titulo: string | null;
  links: { chave: string; rotulo: string; icone: string; href: string }[];
};

const SECOES: Secao[] = [
  {
    titulo: null,
    links: [{ chave: "painel", rotulo: "Painel", icone: "🏠", href: "/dashboard" }],
  },
  {
    titulo: "Lançamentos",
    links: [
      { chave: "importar", rotulo: "Importar fatura", icone: "📄", href: "/importar" },
      { chave: "cartoes", rotulo: "Cartões", icone: "💳", href: "/cartoes" },
      { chave: "saidas", rotulo: "Saídas", icone: "↘", href: "/saidas" },
      { chave: "entradas", rotulo: "Entradas", icone: "↗", href: "/entradas" },
    ],
  },
  {
    titulo: "Análises",
    links: [
      { chave: "analises", rotulo: "Análises", icone: "📊", href: "/analises" },
      { chave: "calendario", rotulo: "Calendário", icone: "📅", href: "/calendario" },
    ],
  },
  {
    titulo: "Plano",
    links: [{ chave: "plano", rotulo: "Plano compartilhado", icone: "👥", href: "/plano" }],
  },
  {
    titulo: "Sistema",
    links: [{ chave: "configuracoes", rotulo: "Configurações", icone: "⚙️", href: "/configuracoes" }],
  },
];

function linkAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5 px-2 pb-7 text-[1.05rem] font-extrabold tracking-tight">
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-azul-claro to-azul">
        <Image src="/logo.png" alt="" width={34} height={34} className="h-full w-full object-cover" />
      </span>
      <span>ControleFácil</span>
    </div>
  );
}

function Navegacao({ pathname, aoNavegar }: { pathname: string; aoNavegar?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {SECOES.map((secao) => (
        <div key={secao.titulo ?? "principal"}>
          {secao.titulo && (
            <div className="px-3.5 pb-1.5 pt-4 text-[0.7rem] font-bold uppercase tracking-wider text-white/40">
              {secao.titulo}
            </div>
          )}
          {secao.links.map((link) => (
            <Link
              key={link.chave}
              href={link.href}
              onClick={aoNavegar}
              className={
                "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[0.92rem] font-medium transition " +
                (linkAtivo(pathname, link.href)
                  ? "bg-gradient-to-r from-azul to-[#0284c7] text-white shadow-cartao"
                  : "text-white/72 hover:bg-white/8 hover:text-white")
              }
            >
              <span aria-hidden="true">{link.icone}</span>
              {link.rotulo}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

function RodapeBarra({
  nomeUsuario,
  acaoSair,
}: {
  nomeUsuario: string;
  acaoSair: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-white/12 pt-4">
      <div className="truncate px-3.5 pb-1.5 text-[0.85rem] text-white/60">{nomeUsuario}</div>
      <form action={acaoSair}>
        <button
          type="submit"
          className="w-full rounded-xl px-3.5 py-2.5 text-left text-[0.9rem] font-medium text-white/72 transition hover:bg-white/8 hover:text-white"
        >
          Sair
        </button>
      </form>
    </div>
  );
}

function ConteudoBarra({
  pathname,
  nomeUsuario,
  acaoSair,
  aoNavegar,
}: {
  pathname: string;
  nomeUsuario: string;
  acaoSair: () => Promise<void>;
  aoNavegar?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Marca />
      <Navegacao pathname={pathname} aoNavegar={aoNavegar} />
      <RodapeBarra nomeUsuario={nomeUsuario} acaoSair={acaoSair} />
    </div>
  );
}

export function PainelShell({
  children,
  nomeUsuario,
  acaoSair,
}: {
  children: React.ReactNode;
  nomeUsuario: string;
  acaoSair: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen bg-fundo">
      <aside className="hidden w-[248px] shrink-0 flex-col bg-gradient-to-b from-azul-escuro to-[#082f49] p-[26px_18px] text-white md:flex">
        <ConteudoBarra pathname={pathname} nomeUsuario={nomeUsuario} acaoSair={acaoSair} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-borda bg-white px-4 py-3 md:hidden">
          <span className="flex items-center gap-2 text-[0.95rem] font-extrabold tracking-tight text-azul-escuro">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-azul-claro to-azul">
              <Image src="/logo.png" alt="" width={32} height={32} className="h-full w-full object-cover" />
            </span>
            ControleFácil
          </span>
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
            className="rounded-xl border border-borda p-2 text-texto"
          >
            ☰
          </button>
        </header>

        <main className="flex-1 px-5 py-7 md:px-9 md:py-8">{children}</main>
      </div>

      {menuAberto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="relative flex h-full w-[248px] flex-col bg-gradient-to-b from-azul-escuro to-[#082f49] p-[26px_18px] text-white">
            <ConteudoBarra
              pathname={pathname}
              nomeUsuario={nomeUsuario}
              acaoSair={acaoSair}
              aoNavegar={() => setMenuAberto(false)}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
