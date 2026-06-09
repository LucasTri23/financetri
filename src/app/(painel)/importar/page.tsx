import type { Metadata } from "next";

import { PaginaImportar } from "./PaginaImportar";

export const metadata: Metadata = {
  title: "Importar fatura — ControleFácil",
};

export default function ImportarPage() {
  return <PaginaImportar />;
}
