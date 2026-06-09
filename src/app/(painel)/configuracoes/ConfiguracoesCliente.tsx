"use client";

import { useTheme } from "@/components/ThemeProvider";

function ToggleSwitch({ ativo, aoMudar, id }: { ativo: boolean; aoMudar: () => void; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={ativo}
      onClick={aoMudar}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul focus-visible:ring-offset-2 ${
        ativo ? "bg-azul" : "bg-cinza-claro"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          ativo ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function LinhaConfig({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-semibold text-texto">{titulo}</p>
        <p className="text-xs text-cinza">{descricao}</p>
      </div>
      {children}
    </div>
  );
}

export function ConfiguracoesCliente() {
  const { tema, alternarTema } = useTheme();
  const modoEscuro = tema === "escuro";

  return (
    <div className="rounded-[18px] border border-borda bg-cartao shadow-cartao overflow-hidden">
      <div className="border-b border-borda px-6 py-4">
        <h2 className="font-bold text-texto">Aparência</h2>
      </div>

      <div className="divide-y divide-borda px-6">
        <LinhaConfig
          titulo="Tema escuro"
          descricao="Muda o visual para fundo escuro — ideal para uso noturno."
        >
          <ToggleSwitch ativo={modoEscuro} aoMudar={alternarTema} id="toggle-tema" />
        </LinhaConfig>
      </div>

      <div className="border-t border-borda px-6 py-4">
        <h2 className="font-bold text-texto">Sobre</h2>
      </div>
      <div className="px-6 pb-5">
        <p className="text-sm text-cinza">
          <span className="font-semibold text-texto">Controle Financeiro</span> — versão 1.0
        </p>
        <p className="mt-1 text-xs text-cinza">
          Organize saídas, entradas, parcelas e finanças compartilhadas em um só lugar.
        </p>
      </div>
    </div>
  );
}
