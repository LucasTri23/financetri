import { NextResponse } from "next/server";

import { auth } from "@/auth";

const proxy = auth((requisicao) => {
  const logado = Boolean(requisicao.auth?.user);
  const { pathname } = requisicao.nextUrl;

  if (!logado && pathname.startsWith("/dashboard")) {
    const url = requisicao.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
});

export default proxy;

export const config = {
  matcher: ["/dashboard/:path*"],
};
