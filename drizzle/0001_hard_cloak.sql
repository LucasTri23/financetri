CREATE TABLE "eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criador_id" text NOT NULL,
	"plano_id" uuid,
	"titulo" text NOT NULL,
	"descricao" text,
	"data" date NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_criador_id_user_id_fk" FOREIGN KEY ("criador_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_plano_id_planos_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."planos"("id") ON DELETE cascade ON UPDATE no action;