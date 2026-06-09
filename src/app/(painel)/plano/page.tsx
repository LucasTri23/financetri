import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Cartao } from "@/components/ui/Cartao";

import { buscarPlano } from "./actions";
import { BotaoCopiar, FormularioCriarPlano, FormularioEntrarComCodigo } from "./FormulariosPlano";

export const metadata: Metadata = {
  title: "Plano compartilhado — ControleFácil",
};

export default async function PaginaPlano() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const plano = await buscarPlano(userId);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-texto">Plano compartilhado</h1>
        <p className="mt-1 text-sm text-cinza">
          Junte as finanças com outra pessoa usando um código de convite.
        </p>
      </div>

      {plano ? (
        <>
          <Cartao titulo={plano.nome ?? "Seu plano"}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-cinza">Código de convite:</span>
              <span className="rounded-xl bg-azul-suave px-3 py-1 font-mono font-bold tracking-widest text-azul-texto">
                {plano.codigoConvite}
              </span>
              <BotaoCopiar codigo={plano.codigoConvite} />
            </div>

            <div className="flex flex-col gap-2">
              {plano.membros.map((membro) => (
                <div
                  key={membro.id}
                  className="flex items-center gap-3 rounded-xl border border-borda bg-fundo px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-azul-suave font-bold text-azul-texto">
                    {membro.email.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-texto">{membro.email}</p>
                    {plano.donoId === membro.id && (
                      <p className="text-xs text-cinza">Criou o plano</p>
                    )}
                    {membro.id === userId && (
                      <p className="text-xs text-azul-texto font-medium">Você</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Cartao>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Cartao titulo="Criar um plano">
            <p className="mb-4 text-sm text-cinza">
              Inicie um plano e compartilhe o código com quem você quer convidar.
            </p>
            <FormularioCriarPlano />
          </Cartao>

          <Cartao titulo="Entrar com código">
            <p className="mb-4 text-sm text-cinza">
              Recebeu um código de convite? Cole aqui para entrar no plano de outra pessoa.
            </p>
            <FormularioEntrarComCodigo />
          </Cartao>
        </div>
      )}
    </>
  );
}
