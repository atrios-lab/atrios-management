CREATE TABLE "relatorio_evento" (
	"id" text PRIMARY KEY NOT NULL,
	"diagnostico_id" text NOT NULL,
	"user_id" text,
	"tipo" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "apontamento_titulo" text;--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "apontamento_exigencia" text;--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "apontamento_consequencia" text;--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "roteiro_execucao" text;--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "artefato" text;--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "natureza" text;--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "esforco_template_horas" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "esforco_serventia_horas" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "exige_capex" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "capex_descricao" text;--> statement-breakpoint
ALTER TABLE "requisito" ADD COLUMN "revisado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "relatorio_evento" ADD CONSTRAINT "relatorio_evento_diagnostico_id_diagnostico_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "public"."diagnostico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatorio_evento" ADD CONSTRAINT "relatorio_evento_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "relatorio_evento_diagnosticoId_idx" ON "relatorio_evento" USING btree ("diagnostico_id");