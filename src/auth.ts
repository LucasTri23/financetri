import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { db } from "@/db";
import { users } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credenciais) {
        const email = credenciais?.email as string | undefined;
        const senha = credenciais?.senha as string | undefined;
        if (!email || !senha) return null;

        const [usuario] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!usuario?.passwordHash) return null;

        const senhaConfere = await bcrypt.compare(senha, usuario.passwordHash);
        if (!senhaConfere) return null;

        return usuario;
      },
    }),
  ],
});
