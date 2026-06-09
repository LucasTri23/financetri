import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// Tabelas exigidas pelo adapter do NextAuth (Auth.js) — substituem o
// Firebase Authentication. `passwordHash` é um campo extra para o login por
// e-mail/senha (credentials provider), que o adapter padrão não inclui.
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("passwordHash"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// Plano compartilhado: substitui planos/{id} + convites/{codigo} do Firestore.
// Como consultas no Postgres rodam no servidor (sem as limitações das regras
// do Firestore para `list`), o código de convite é só uma coluna única — não
// precisa de uma coleção de lookup separada.
export const planos = pgTable("planos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome"),
  donoId: text("dono_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codigoConvite: text("codigo_convite").notNull().unique(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

// Substitui os arrays `membros`/`membrosInfo` do plano por uma tabela
// relacional (cada linha é um integrante do plano).
export const planoMembros = pgTable(
  "plano_membros",
  {
    planoId: uuid("plano_id")
      .notNull()
      .references(() => planos.id, { onDelete: "cascade" }),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entrouEm: timestamp("entrou_em").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.planoId, t.usuarioId] })],
);

// Cartão de crédito do usuário — base para agrupamento de faturas.
export const cartoes = pgTable("cartoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: text("usuario_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  bandeira: text("bandeira").notNull().default("visa"),
  diaFechamento: integer("dia_fechamento").notNull(),
  diaVencimento: integer("dia_vencimento").notNull(),
  cor: text("cor").notNull().default("#8b5cf6"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

// Registro de pagamento de fatura. Um por cartão × mês de referência.
export const faturas = pgTable("faturas", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartaoId: uuid("cartao_id").notNull().references(() => cartoes.id, { onDelete: "cascade" }),
  mesReferencia: text("mes_referencia").notNull(), // "YYYY-MM"
  pago: boolean("pago").notNull().default(false),
  dataPagamento: date("data_pagamento"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
}, (t) => [unique().on(t.cartaoId, t.mesReferencia)]);

// Saída: gasto avulso ou recorrente. Espelha usuarios/{uid}/saidas.
export const saidas = pgTable("saidas", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: text("usuario_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  cartaoId: uuid("cartao_id").references(() => cartoes.id, { onDelete: "set null" }),
  descricao: text("descricao").notNull(),
  categoria: text("categoria").notNull().default("outros"),
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
  data: date("data").notNull(),
  metodo: text("metodo"),
  recorrente: boolean("recorrente").notNull().default(false),
  frequencia: text("frequencia"),
  pagadorId: text("pagador_id").references(() => users.id),
  origem: text("origem").notNull().default("manual"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

// Dívida: compra parcelada (manual ou importada de fatura). Espelha
// usuarios/{uid}/dividas — cada linha representa o estado atual das parcelas.
export const dividas = pgTable("dividas", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: text("usuario_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  cartaoId: uuid("cartao_id").references(() => cartoes.id, { onDelete: "set null" }),
  descricao: text("descricao").notNull(),
  categoria: text("categoria").notNull().default("outros"),
  valorParcela: numeric("valor_parcela", { precision: 12, scale: 2 }).notNull(),
  parcelaAtual: integer("parcela_atual").notNull(),
  totalParcelas: integer("total_parcelas").notNull(),
  parcelasRestantes: integer("parcelas_restantes").notNull(),
  dataCompra: date("data_compra").notNull(),
  proximoVencimento: date("proximo_vencimento").notNull(),
  metodo: text("metodo"),
  pagadorId: text("pagador_id").references(() => users.id),
  origem: text("origem").notNull().default("manual"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

// Eventos do calendário compartilhado. planoId nulo = evento pessoal.
export const eventos = pgTable("eventos", {
  id: uuid("id").primaryKey().defaultRandom(),
  criadorId: text("criador_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planoId: uuid("plano_id").references(() => planos.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  data: date("data").notNull(),
  etiqueta: text("etiqueta").notNull().default("pessoal"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

// Entrada: receita avulsa ou recorrente. Espelha usuarios/{uid}/entradas.
export const entradas = pgTable("entradas", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: text("usuario_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  descricao: text("descricao").notNull(),
  tipo: text("tipo").notNull(),
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
  data: date("data").notNull(),
  recorrente: boolean("recorrente").notNull().default(false),
  frequencia: text("frequencia"),
  recebedorId: text("recebedor_id").references(() => users.id),
  origem: text("origem").notNull().default("manual"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});
