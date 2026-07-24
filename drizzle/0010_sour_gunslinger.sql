CREATE TABLE "lancamento" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"data" date NOT NULL,
	"categoria_id" text NOT NULL,
	"produto_id" text,
	"criado_por_id" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_por_id" text,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_produto_id_product_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_criado_por_id_user_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_atualizado_por_id_user_id_fk" FOREIGN KEY ("atualizado_por_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lancamento_data_idx" ON "lancamento" USING btree ("data");