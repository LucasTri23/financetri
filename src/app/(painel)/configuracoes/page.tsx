import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

import { ConfiguracoesCliente } from "./ConfiguracoesCliente";

export const metadata: Metadata = { title: "Configurações — ControleFácil" };

export default async function PaginaConfiguracoes() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");

  const [usuario] = await db
    .select({ name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(eq(users.id, sessao.user.id));

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-texto">Configurações</h1>
        <p className="mt-1 text-sm text-cinza">Personalize sua conta e o sistema.</p>
      </div>
      <div className="max-w-xl">
        <ConfiguracoesCliente
          nomeAtual={usuario?.name ?? ""}
          email={usuario?.email ?? ""}
          fotoAtual={usuario?.image ?? null}
        />
      </div>
    </>
  );
}
