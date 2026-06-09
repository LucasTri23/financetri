CREATE TABLE "cartoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"nome" text NOT NULL,
	"bandeira" text DEFAULT 'visa' NOT NULL,
	"dia_fechamento" integer NOT NULL,
	"dia_vencimento" integer NOT NULL,
	"cor" text DEFAULT '#8b5cf6' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cartao_id" uuid NOT NULL,
	"mes_referencia" text NOT NULL,
	"pago" boolean DEFAULT false NOT NULL,
	"data_pagamento" date,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "faturas_cartao_id_mes_referencia_unique" UNIQUE("cartao_id","mes_referencia")
);
--> statement-breakpoint
ALTER TABLE "dividas" ADD COLUMN "cartao_id" uuid;--> statement-breakpoint
ALTER TABLE "saidas" ADD COLUMN "cartao_id" uuid;--> statement-breakpoint
ALTER TABLE "cartoes" ADD CONSTRAINT "cartoes_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_cartao_id_cartoes_id_fk" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dividas" ADD CONSTRAINT "dividas_cartao_id_cartoes_id_fk" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saidas" ADD CONSTRAINT "saidas_cartao_id_cartoes_id_fk" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE set null ON UPDATE no action;