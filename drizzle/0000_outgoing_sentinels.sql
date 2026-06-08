CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "dividas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"descricao" text NOT NULL,
	"categoria" text DEFAULT 'outros' NOT NULL,
	"valor_parcela" numeric(12, 2) NOT NULL,
	"parcela_atual" integer NOT NULL,
	"total_parcelas" integer NOT NULL,
	"parcelas_restantes" integer NOT NULL,
	"data_compra" date NOT NULL,
	"proximo_vencimento" date NOT NULL,
	"metodo" text,
	"pagador_id" text,
	"origem" text DEFAULT 'manual' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entradas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"descricao" text NOT NULL,
	"tipo" text NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"data" date NOT NULL,
	"recorrente" boolean DEFAULT false NOT NULL,
	"frequencia" text,
	"recebedor_id" text,
	"origem" text DEFAULT 'manual' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plano_membros" (
	"plano_id" uuid NOT NULL,
	"usuario_id" text NOT NULL,
	"entrou_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plano_membros_plano_id_usuario_id_pk" PRIMARY KEY("plano_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "planos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text,
	"dono_id" text NOT NULL,
	"codigo_convite" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "planos_codigo_convite_unique" UNIQUE("codigo_convite")
);
--> statement-breakpoint
CREATE TABLE "saidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"descricao" text NOT NULL,
	"categoria" text DEFAULT 'outros' NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"data" date NOT NULL,
	"metodo" text,
	"recorrente" boolean DEFAULT false NOT NULL,
	"frequencia" text,
	"pagador_id" text,
	"origem" text DEFAULT 'manual' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"passwordHash" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dividas" ADD CONSTRAINT "dividas_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dividas" ADD CONSTRAINT "dividas_pagador_id_user_id_fk" FOREIGN KEY ("pagador_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_recebedor_id_user_id_fk" FOREIGN KEY ("recebedor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_membros" ADD CONSTRAINT "plano_membros_plano_id_planos_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."planos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_membros" ADD CONSTRAINT "plano_membros_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planos" ADD CONSTRAINT "planos_dono_id_user_id_fk" FOREIGN KEY ("dono_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saidas" ADD CONSTRAINT "saidas_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saidas" ADD CONSTRAINT "saidas_pagador_id_user_id_fk" FOREIGN KEY ("pagador_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;