"use server";

import { and, eq, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { dividas, saidas } from "@/db/schema";
import { calcularProximoVencimento, mesAtual } from "@/lib/utils";

export type EstadoSaida = { erro?: string; sucesso?: true } | null;

export async function adicionarSaida(
  _estadoAnterior: EstadoSaida,
  formData: FormData,
): Promise<EstadoSaida> {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/login");
  const userId = sessao.user.id;

  const descricao = (formData.get("descricao") as string).trim();
  const valor = Number(formData.get("valor"));
  const data = formData.get("data") as string;
  const categoria = (formData.get("categoria") as string) || "outros";
  const metodo = (formData.get("metodo") as string) || null;
  const tipoLancamento = formData.get("tipoLancamento") as string;
  const pagadorId = (formData.get("pagadorId") as string) || null;

  if (!descricao || !valor || isNaN(valor) || !data) {
    return { erro: "Preencha todos os campos obrigatórios." };
  }

  if (tipoLancamento === "parcelado") {
    const totalParcelas = Number(formData.get("totalParcelas"));
    if (!totalParcelas || totalParcelas < 2) {
      return { erro: "Informe o número de parcelas (mínimo 2)." };
    }
    const proximoVencimento = calcularProximoVencimento(data);

    await db.insert(dividas).values({
      usuarioId: userId,
      descricao,
      categoria,
      valorParcela: String(valor),
      parcelaAtual: 1,
      totalParcelas,
      parcelasRestantes: totalParcelas - 1,
      dataCompra: data,
      proximoVencimento,
      metodo,
      pagadorId,
      origem: "manual",
    });
  } else {
    await db.insert(saidas).values({
      usuarioId: userId,
      descricao,
      categoria,
      valor: String(valor),
      data,
      metodo,
      recorrente: tipoLancamento === "recorrente",
      frequencia:
        tipoLancamento === "recorrente" ? (formData.get("frequencia") as string) || null : null,
      pagadorId,
      origem: "manual",
    });
  }

  revalidatePath("/saidas");
  return { sucesso: true };
}

export async function buscarGastosDoMes(userId: string) {
  const { inicio, fim } = mesAtual();

  const [saidasMes, dividasMes] = await Promise.all([
    db
      .select()
      .from(saidas)
      .where(and(eq(saidas.usuarioId, userId), gte(saidas.data, inicio), lt(saidas.data, fim))),
    db
      .select()
      .from(dividas)
      .where(
        and(
          eq(dividas.usuarioId, userId),
          gte(dividas.proximoVencimento, inicio),
          lt(dividas.proximoVencimento, fim),
        ),
      ),
  ]);

  const itens = [
    ...saidasMes.map((s) => ({
      id: s.id,
      data: s.data,
      descricao: s.descricao,
      categoria: s.categoria,
      parcela: null as string | null,
      valor: Number(s.valor),
    })),
    ...dividasMes.map((d) => ({
      id: d.id,
      data: d.proximoVencimento,
      descricao: d.descricao,
      categoria: d.categoria,
      parcela: `${Math.min(d.parcelaAtual + 1, d.totalParcelas)}/${d.totalParcelas}`,
      valor: Number(d.valorParcela),
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  return itens;
}
