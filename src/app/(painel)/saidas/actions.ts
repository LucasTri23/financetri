"use server";

import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { dividas, saidas, users } from "@/db/schema";
import { buscarIdsDoPlano } from "@/lib/plano";
import { calcularProximoVencimento, mesAtual } from "@/lib/utils";

export async function excluirSaida(id: string): Promise<void> {
  const sessao = await auth();
  if (!sessao?.user?.id) return;
  await db.delete(saidas).where(and(eq(saidas.id, id), eq(saidas.usuarioId, sessao.user.id)));
  revalidatePath("/saidas");
  revalidatePath("/dashboard");
  revalidatePath("/cartoes");
}

export async function excluirDivida(id: string): Promise<void> {
  const sessao = await auth();
  if (!sessao?.user?.id) return;
  await db.delete(dividas).where(and(eq(dividas.id, id), eq(dividas.usuarioId, sessao.user.id)));
  revalidatePath("/saidas");
  revalidatePath("/dashboard");
  revalidatePath("/cartoes");
}

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
  const cartaoId = (formData.get("cartaoId") as string) || null;

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
      usuarioId: pagadorId ?? userId,
      cartaoId: metodo === "cartao_credito" ? cartaoId : null,
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
      usuarioId: pagadorId ?? userId,
      cartaoId: metodo === "cartao_credito" ? cartaoId : null,
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
  revalidatePath("/dashboard");
  return { sucesso: true };
}

export async function buscarGastosDoMes(userId: string, inicioOpt?: string, fimOpt?: string) {
  const { inicio: inicioMes, fim: fimMes } = mesAtual();
  const inicio = inicioOpt ?? inicioMes;
  const fim = fimOpt ?? fimMes;
  const memberIds = await buscarIdsDoPlano(userId);

  const [saidasMes, dividasMes] = await Promise.all([
    db
      .select({
        id: saidas.id,
        data: saidas.data,
        descricao: saidas.descricao,
        categoria: saidas.categoria,
        valor: saidas.valor,
        adicionadoPorId: saidas.usuarioId,
        adicionadoPorEmail: users.email,
        adicionadoPorNome: users.name,
      })
      .from(saidas)
      .leftJoin(users, eq(saidas.usuarioId, users.id))
      .where(and(inArray(saidas.usuarioId, memberIds), gte(saidas.data, inicio), lt(saidas.data, fim))),
    db
      .select({
        id: dividas.id,
        proximoVencimento: dividas.proximoVencimento,
        descricao: dividas.descricao,
        categoria: dividas.categoria,
        valorParcela: dividas.valorParcela,
        parcelaAtual: dividas.parcelaAtual,
        totalParcelas: dividas.totalParcelas,
        adicionadoPorId: dividas.usuarioId,
        adicionadoPorEmail: users.email,
        adicionadoPorNome: users.name,
      })
      .from(dividas)
      .leftJoin(users, eq(dividas.usuarioId, users.id))
      .where(
        and(
          inArray(dividas.usuarioId, memberIds),
          gte(dividas.proximoVencimento, inicio),
          lt(dividas.proximoVencimento, fim),
        ),
      ),
  ]);

  return [
    ...saidasMes.map((s) => ({
      id: s.id,
      tipo: "saida" as const,
      data: s.data,
      descricao: s.descricao,
      categoria: s.categoria,
      parcela: null as string | null,
      valor: Number(s.valor),
      adicionadoPorId: s.adicionadoPorId,
      adicionadoPor: s.adicionadoPorNome ?? s.adicionadoPorEmail ?? "—",
    })),
    ...dividasMes.map((d) => ({
      id: d.id,
      tipo: "divida" as const,
      data: d.proximoVencimento,
      descricao: d.descricao,
      categoria: d.categoria,
      parcela: `${Math.min(d.parcelaAtual + 1, d.totalParcelas)}/${d.totalParcelas}`,
      valor: Number(d.valorParcela),
      adicionadoPorId: d.adicionadoPorId,
      adicionadoPor: d.adicionadoPorNome ?? d.adicionadoPorEmail ?? "—",
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));
}
