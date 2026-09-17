CREATE TABLE "autoavaliacao" (
	"id" text PRIMARY KEY NOT NULL,
	"diagnostico_id" text NOT NULL,
	"token" text NOT NULL,
	"expira_em" timestamp NOT NULL,
	"revogado_em" timestamp,
	"criado_por_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"respondente_nome" text,
	"respondente_cargo" text,
	"respondente_email" text,
	"respondente_whatsapp" text,
	"consentimento_em" timestamp,
	"consentimento_politica" text,
	"ip" text,
	"iniciado_em" timestamp,
	"enviado_em" timestamp
);
--> statement-breakpoint
ALTER TABLE "diagnostico" ADD COLUMN "enquadramento_declarado_em" timestamp;--> statement-breakpoint
ALTER TABLE "autoavaliacao" ADD CONSTRAINT "autoavaliacao_diagnostico_id_diagnostico_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "public"."diagnostico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autoavaliacao" ADD CONSTRAINT "autoavaliacao_criado_por_id_user_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "autoavaliacao_diagnosticoId_uq" ON "autoavaliacao" USING btree ("diagnostico_id");--> statement-breakpoint
CREATE UNIQUE INDEX "autoavaliacao_token_uq" ON "autoavaliacao" USING btree ("token");