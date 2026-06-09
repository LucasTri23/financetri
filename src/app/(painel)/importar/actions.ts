"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { dividas, saidas, entradas } from "@/db/schema";
import { calcularProximoVencimento, hojeISO } from "@/lib/utils";

export type TransacaoImportada = {
  incluir: boolean;
  dataTexto: string;
  descricao: string;
  valor: number;
  parcelaAtual: number | null;
  totalParcelas: number | null;
  ehParcelado: boolean;
  ehEntrada: boolean;
  categoria: string;
  tipo: "saida" | "divida" | "entrada";
};

export type EstadoImportar = { erro?: string; sucesso?: string } | null;

export async function salvarTransacoesImportadas(
  _estadoAnterior: EstadoImportar,
  formData: FormData,
): Promise<EstadoImportar> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const jsonRaw = formData.get("transacoes") as string | null;
  if (!jsonRaw) return { erro: "Nenhuma transação para salvar." };

  let transacoes: TransacaoImportada[];
  try {
    transacoes = JSON.parse(jsonRaw) as TransacaoImportada[];
  } catch {
    return { erro: "Dados inválidos. Tente importar novamente." };
  }

  const selecionadas = transacoes.filter((t) => t.incluir);
  if (selecionadas.length === 0) return { erro: "Selecione pelo menos uma transação." };

  const hoje = hojeISO();

  for (const t of selecionadas) {
    const data = t.dataTexto || hoje;

    if (t.tipo === "divida") {
      await db.insert(dividas).values({
        usuarioId: userId,
        descricao: t.descricao,
        categoria: t.categoria || "outros",
        valorParcela: String(t.valor),
        parcelaAtual: t.parcelaAtual ?? 1,
        totalParcelas: t.totalParcelas ?? 1,
        parcelasRestantes: (t.totalParcelas ?? 1) - (t.parcelaAtual ?? 1),
        dataCompra: data,
        proximoVencimento: calcularProximoVencimento(data),
        metodo: "cartao",
        origem: "importacao",
      });
    } else if (t.tipo === "entrada") {
      await db.insert(entradas).values({
        usuarioId: userId,
        descricao: t.descricao,
        tipo: "reembolso",
        valor: String(Math.abs(t.valor)),
        data,
        origem: "importacao",
      });
    } else {
      await db.insert(saidas).values({
        usuarioId: userId,
        descricao: t.descricao,
        categoria: t.categoria || "outros",
        valor: String(t.valor),
        data,
        metodo: "cartao",
        origem: "importacao",
      });
    }
  }

  revalidatePath("/saidas");
  revalidatePath("/entradas");
  revalidatePath("/dashboard");

  return { sucesso: `${selecionadas.length} transaç${selecionadas.length === 1 ? "ão salva" : "ões salvas"} com sucesso!` };
}
