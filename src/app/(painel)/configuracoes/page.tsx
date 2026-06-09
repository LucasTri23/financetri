import type { Metadata } from "next";
import { ConfiguracoesCliente } from "./ConfiguracoesCliente";

export const metadata: Metadata = { title: "Configurações — ControleFácil" };

export default function PaginaConfiguracoes() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-texto">Configurações</h1>
        <p className="mt-1 text-sm text-cinza">Personalize o sistema.</p>
      </div>
      <div className="max-w-xl">
        <ConfiguracoesCliente />
      </div>
    </>
  );
}
