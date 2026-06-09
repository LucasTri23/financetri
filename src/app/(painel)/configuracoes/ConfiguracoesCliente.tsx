"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTheme } from "@/components/ThemeProvider";
import { atualizarNome, type EstadoNome } from "./actions";
import { FotoPerfilUpload } from "./FotoPerfilUpload";

/* ── Componentes base ─────────────────────────────────────────── */

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-borda bg-cartao shadow-cartao overflow-hidden">
      <div className="border-b border-borda px-6 py-4">
        <h2 className="font-bold text-texto">{titulo}</h2>
      </div>
      <div className="divide-y divide-borda">{children}</div>
    </div>
  );
}

function LinhaConfig({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-texto">{titulo}</p>
        {descricao && <p className="text-xs text-cinza mt-0.5">{descricao}</p>}
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ ativo, aoMudar, id }: { ativo: boolean; aoMudar: () => void; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={ativo}
      onClick={aoMudar}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 ${ativo ? "bg-azul" : "bg-cinza-claro"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${ativo ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

/* ── Formulário de nome ───────────────────────────────────────── */

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-gradient-to-r from-azul-claro to-azul-escuro px-4 py-2 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Salvando…" : "Salvar"}
    </button>
  );
}

function FormularioNome({ nomeAtual, email }: { nomeAtual: string; email: string }) {
  const [estado, acao] = useActionState<EstadoNome, FormData>(atualizarNome, null);
  const inputClass = "flex-1 min-w-0 rounded-xl border border-borda bg-white px-4 py-2.5 text-sm text-texto outline-none focus:border-azul focus:ring-2 focus:ring-azul-suave";

  return (
    <div className="px-6 py-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-cinza">Nome de exibição</label>
        <form action={acao} className="flex gap-2">
          <input
            type="text"
            name="nome"
            defaultValue={nomeAtual}
            placeholder="Como quer ser chamado?"
            maxLength={60}
            className={inputClass}
          />
          <BotaoSalvar />
        </form>
        {estado?.erro && <p className="text-xs text-vermelho-texto">{estado.erro}</p>}
        {estado?.sucesso && <p className="text-xs text-verde-texto">Nome atualizado! Recarregue para ver no menu.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-cinza">E-mail</label>
        <p className="rounded-xl border border-borda bg-fundo px-4 py-2.5 text-sm text-cinza select-all">{email}</p>
      </div>
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────────── */

export function ConfiguracoesCliente({
  nomeAtual,
  email,
  fotoAtual,
}: {
  nomeAtual: string;
  email: string;
  fotoAtual: string | null;
}) {
  const { tema, alternarTema } = useTheme();
  const modoEscuro = tema === "escuro";
  const inicial = (nomeAtual || email).charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-5">
      {/* Perfil */}
      <Secao titulo="Perfil">
        <FotoPerfilUpload fotoAtual={fotoAtual} inicial={inicial} />
        <FormularioNome nomeAtual={nomeAtual} email={email} />
      </Secao>

      {/* Aparência */}
      <Secao titulo="Aparência">
        <LinhaConfig
          titulo="Tema escuro"
          descricao="Fundo escuro — ideal para uso noturno."
        >
          <ToggleSwitch ativo={modoEscuro} aoMudar={alternarTema} id="toggle-tema" />
        </LinhaConfig>
      </Secao>

      {/* Atalhos */}
      <Secao titulo="Acesso rápido">
        <LinhaConfig titulo="Importar fatura PDF" descricao="Importe extratos Nubank ou Itaú em PDF.">
          <a href="/importar" className="text-sm font-semibold text-azul-texto hover:underline">Abrir →</a>
        </LinhaConfig>
        <LinhaConfig titulo="Meus cartões" descricao="Gerencie cartões e controle faturas.">
          <a href="/cartoes" className="text-sm font-semibold text-azul-texto hover:underline">Abrir →</a>
        </LinhaConfig>
        <LinhaConfig titulo="Plano compartilhado" descricao="Convide alguém para juntar as finanças.">
          <a href="/plano" className="text-sm font-semibold text-azul-texto hover:underline">Abrir →</a>
        </LinhaConfig>
      </Secao>

      {/* Sobre */}
      <Secao titulo="Sobre">
        <div className="px-6 py-4">
          <p className="text-sm text-cinza">
            <span className="font-semibold text-texto">ControleFácil</span> — versão 1.0
          </p>
          <p className="mt-1 text-xs text-cinza">
            Organize saídas, entradas, parcelas e finanças compartilhadas em um só lugar.
          </p>
        </div>
      </Secao>
    </div>
  );
}
