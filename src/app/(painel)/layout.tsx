import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PainelShell } from "@/components/painel/PainelShell";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");

  const [usuario] = await db
    .select({ name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, sessao.user.id!));

  async function sair() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <PainelShell
      nomeUsuario={usuario?.name ?? sessao.user.name ?? sessao.user.email ?? ""}
      fotoUsuario={usuario?.image ?? sessao.user.image ?? null}
      acaoSair={sair}
    >
      {children}
    </PainelShell>
  );
}
