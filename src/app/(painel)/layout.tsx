import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { PainelShell } from "@/components/painel/PainelShell";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");

  async function sair() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <PainelShell nomeUsuario={sessao.user.name ?? sessao.user.email ?? ""} acaoSair={sair}>
      {children}
    </PainelShell>
  );
}
