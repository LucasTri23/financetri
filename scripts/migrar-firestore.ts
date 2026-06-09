/**
 * Migração Firestore → Postgres
 *
 * Pré-requisitos:
 *   1. Gere a chave de serviço do Firebase:
 *      Console Firebase → Configurações do projeto → Contas de serviço → Gerar nova chave
 *      Salve como scripts/serviceAccountKey.json (NÃO commite esse arquivo)
 *   2. Configure as variáveis de ambiente (ou crie um .env.local na raiz):
 *      DATABASE_URL=postgresql://...   ← banco Postgres de destino
 *      FIREBASE_CREDENTIAL=scripts/serviceAccountKey.json
 *
 * Como rodar:
 *   npx tsx scripts/migrar-firestore.ts
 *
 * O script é idempotente: pode ser rodado mais de uma vez sem duplicar dados.
 * Usuários do Firebase não têm a senha migrada (hashes não são exportáveis).
 * Cada usuário precisará redefinir a senha no primeiro login ou usar Google.
 */

import "dotenv/config";
import * as admin from "firebase-admin";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

// ── Configuração ──────────────────────────────────────────────────────────────

const credentialPath = process.env.FIREBASE_CREDENTIAL ?? "scripts/serviceAccountKey.json";
const serviceAccount = (await import(/* webpackIgnore: true */ `../${credentialPath}`, {
  with: { type: "json" },
})).default;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const firestore = admin.firestore();
const authAdmin = admin.auth();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(value: unknown): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function toNumeric(value: unknown): string {
  const n = Number(value ?? 0);
  return isNaN(n) ? "0" : n.toFixed(2);
}

function gerarId(): string {
  return crypto.randomUUID();
}

// ── Mapas de UID Firebase → ID Postgres ──────────────────────────────────────

const mapaUsuarios = new Map<string, string>();

// ── 1. Usuários ───────────────────────────────────────────────────────────────

async function migrarUsuarios() {
  console.log("▶ Migrando usuários…");
  let pageToken: string | undefined;
  let total = 0;

  do {
    const resultado = await authAdmin.listUsers(100, pageToken);
    for (const firebaseUser of resultado.users) {
      const existente = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, firebaseUser.email ?? ""))
        .limit(1);

      let postgresId: string;
      if (existente.length > 0) {
        postgresId = existente[0].id;
      } else {
        postgresId = gerarId();
        await db.insert(schema.users).values({
          id: postgresId,
          email: firebaseUser.email!,
          name: firebaseUser.displayName ?? null,
          image: firebaseUser.photoURL ?? null,
          // Senhas NÃO são migradas — usuário deverá redefinir ou usar Google
        });
        total++;
      }
      mapaUsuarios.set(firebaseUser.uid, postgresId);
    }
    pageToken = resultado.pageToken;
  } while (pageToken);

  console.log(`  ✔ ${total} usuários inseridos (${mapaUsuarios.size} mapeados)`);
}

// ── 2. Planos ─────────────────────────────────────────────────────────────────

const mapaPlanos = new Map<string, string>();

async function migrarPlanos() {
  console.log("▶ Migrando planos…");
  const snap = await firestore.collection("planos").get();
  let total = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const donoIdPostgres = mapaUsuarios.get(d.donoId as string);
    if (!donoIdPostgres) {
      console.warn(`  ⚠ Plano ${doc.id}: dono ${d.donoId} não encontrado — pulando`);
      continue;
    }

    const existente = await db
      .select({ id: schema.planos.id })
      .from(schema.planos)
      .where(eq(schema.planos.codigoConvite, d.codigoConvite as string))
      .limit(1);

    let planoIdPostgres: string;
    if (existente.length > 0) {
      planoIdPostgres = existente[0].id;
    } else {
      planoIdPostgres = gerarId();
      await db.insert(schema.planos).values({
        id: planoIdPostgres,
        nome: (d.nome as string) ?? "Plano migrado",
        donoId: donoIdPostgres,
        codigoConvite: d.codigoConvite as string,
      });
      total++;
    }
    mapaPlanos.set(doc.id, planoIdPostgres);

    // Membros: array de UIDs Firebase no campo `membros`
    const membrosUids: string[] = Array.isArray(d.membros) ? d.membros : [d.donoId];
    for (const uid of membrosUids) {
      const membroId = mapaUsuarios.get(uid as string);
      if (!membroId) continue;
      const jaMembro = await db
        .select()
        .from(schema.planoMembros)
        .where(
          eq(schema.planoMembros.planoId, planoIdPostgres),
        )
        .limit(1);
      if (jaMembro.length === 0) {
        await db.insert(schema.planoMembros).values({ planoId: planoIdPostgres, usuarioId: membroId });
      }
    }
  }

  console.log(`  ✔ ${total} planos inseridos`);
}

// ── 3. Saídas, dívidas e entradas por usuário ─────────────────────────────────

async function migrarColecaoUsuario(uid: string, postgresUserId: string) {
  // Saídas
  const saidasSnap = await firestore.collection(`usuarios/${uid}/saidas`).get();
  for (const doc of saidasSnap.docs) {
    const d = doc.data();
    const existente = await db
      .select({ id: schema.saidas.id })
      .from(schema.saidas)
      .where(eq(schema.saidas.id, doc.id))
      .limit(1);
    if (existente.length > 0) continue;

    await db.insert(schema.saidas).values({
      id: doc.id,
      usuarioId: postgresUserId,
      descricao: (d.descricao as string) || "Sem descrição",
      categoria: (d.categoria as string) || "outros",
      valor: toNumeric(d.valor),
      data: toDate(d.data),
      metodo: (d.metodo as string) ?? null,
      recorrente: Boolean(d.recorrente),
      frequencia: (d.frequencia as string) ?? null,
      pagadorId: d.pagadorUid ? (mapaUsuarios.get(d.pagadorUid as string) ?? null) : null,
      origem: "migracao",
    });
  }

  // Dívidas
  const dividasSnap = await firestore.collection(`usuarios/${uid}/dividas`).get();
  for (const doc of dividasSnap.docs) {
    const d = doc.data();
    const existente = await db
      .select({ id: schema.dividas.id })
      .from(schema.dividas)
      .where(eq(schema.dividas.id, doc.id))
      .limit(1);
    if (existente.length > 0) continue;

    await db.insert(schema.dividas).values({
      id: doc.id,
      usuarioId: postgresUserId,
      descricao: (d.descricao as string) || "Sem descrição",
      categoria: (d.categoria as string) || "outros",
      valorParcela: toNumeric(d.valorParcela),
      parcelaAtual: Number(d.parcelaAtual ?? 0),
      totalParcelas: Number(d.totalParcelas ?? 1),
      parcelasRestantes: Number(d.parcelasRestantes ?? 0),
      dataCompra: toDate(d.dataCompra),
      proximoVencimento: toDate(d.proximoVencimento),
      metodo: (d.metodo as string) ?? null,
      pagadorId: d.pagadorUid ? (mapaUsuarios.get(d.pagadorUid as string) ?? null) : null,
      origem: "migracao",
    });
  }

  // Entradas
  const entradasSnap = await firestore.collection(`usuarios/${uid}/entradas`).get();
  for (const doc of entradasSnap.docs) {
    const d = doc.data();
    const existente = await db
      .select({ id: schema.entradas.id })
      .from(schema.entradas)
      .where(eq(schema.entradas.id, doc.id))
      .limit(1);
    if (existente.length > 0) continue;

    await db.insert(schema.entradas).values({
      id: doc.id,
      usuarioId: postgresUserId,
      descricao: (d.descricao as string) || "Sem descrição",
      tipo: (d.tipo as string) || "outro",
      valor: toNumeric(d.valor),
      data: toDate(d.data),
      recorrente: Boolean(d.recorrente),
      frequencia: (d.frequencia as string) ?? null,
      recebedorId: d.recebedorUid ? (mapaUsuarios.get(d.recebedorUid as string) ?? null) : null,
      origem: "migracao",
    });
  }
}

async function migrarTransacoes() {
  console.log("▶ Migrando saídas, dívidas e entradas…");
  let total = 0;
  for (const [uid, postgresId] of mapaUsuarios.entries()) {
    await migrarColecaoUsuario(uid, postgresId);
    total++;
  }
  console.log(`  ✔ Transações migradas para ${total} usuários`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Migração Firestore → Postgres ===\n");

  await migrarUsuarios();
  await migrarPlanos();
  await migrarTransacoes();

  console.log("\n✅ Migração concluída!");
  console.log("\n⚠  Lembrete: senhas não foram migradas.");
  console.log("   Usuários precisarão redefinir a senha ou usar login com Google.");

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
