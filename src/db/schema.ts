import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role").default("member"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const invite = pgTable(
  "invite",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    role: text("role").default("member").notNull(),
    // set null: convites pendentes sobrevivem à remoção de quem convidou
    invitedById: text("invited_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("invite_email_idx").on(table.email)],
);

export const inviteRelations = relations(invite, ({ one }) => ({
  invitedBy: one(user, {
    fields: [invite.invitedById],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  accessesCreated: many(access, { relationName: "accessCreatedBy" }),
  accessesRotated: many(access, { relationName: "accessRotatedBy" }),
  accessEvents: many(accessEvent, { relationName: "accessEventUser" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

/* ---- Produtos ---------------------------------------------------------- */

export type CardStatus = "todo" | "progress" | "review" | "done";

export const product = pgTable("product", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  // Prefixo dos ids de card (POR-12); 2–4 chars alfanuméricos maiúsculos.
  code: text("code").notNull().unique(),
  description: text("description").notNull().default(""),
  longDescription: text("long_description"),
  // Índice no catálogo estático de etapas (STAGES): 0=Descoberta … 5=Descontinuado.
  stage: integer("stage").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const productRepo = pgTable(
  "product_repo",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    name: text("name").notNull(),
  },
  (table) => [index("product_repo_productId_idx").on(table.productId)],
);

export const card = pgTable(
  "card",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    // Número sequencial por produto; nunca reutilizado (id exibido: CODE-seq).
    seq: integer("seq").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").$type<CardStatus>().notNull().default("todo"),
    // set null: card sobrevive à remoção do repositório
    repoId: text("repo_id").references(() => productRepo.id, {
      onDelete: "set null",
    }),
    prNumber: integer("pr_number"),
    prUrl: text("pr_url"),
    auto: boolean("auto").default(false).notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("card_productId_seq_uq").on(table.productId, table.seq),
    index("card_productId_status_idx").on(table.productId, table.status),
  ],
);

export const productStageEvent = pgTable(
  "product_stage_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    stage: integer("stage").notNull(),
    enteredAt: timestamp("entered_at").defaultNow().notNull(),
  },
  (table) => [index("product_stage_event_productId_idx").on(table.productId)],
);

export const productRelations = relations(product, ({ many }) => ({
  repos: many(productRepo),
  cards: many(card),
  stageEvents: many(productStageEvent),
  accesses: many(access),
}));

export const productRepoRelations = relations(productRepo, ({ one, many }) => ({
  product: one(product, {
    fields: [productRepo.productId],
    references: [product.id],
  }),
  cards: many(card),
}));

export const cardRelations = relations(card, ({ one }) => ({
  product: one(product, {
    fields: [card.productId],
    references: [product.id],
  }),
  repo: one(productRepo, {
    fields: [card.repoId],
    references: [productRepo.id],
  }),
}));

/* ---- Cofre de acessos --------------------------------------------------- */

export type AccessTipo = "sistema" | "infra" | "banco" | "plataforma" | "email";
export type AccessAmbiente = "producao" | "homologacao" | "geral";
export type AccessAction = "created" | "viewed" | "copied" | "rotated";

export const access = pgTable(
  "access",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tipo: text("tipo").$type<AccessTipo>().notNull(),
    ambiente: text("ambiente").$type<AccessAmbiente>().notNull(),
    login: text("login").notNull(),
    // Segredos cifrados (AES-256-GCM). NUNCA selecionar em query de página —
    // só dentro de getSecret (cofre/actions.ts).
    passwordEnc: text("password_enc").notNull(),
    totpCodesEnc: text("totp_codes_enc"),
    notes: text("notes"),
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    rotatedAt: timestamp("rotated_at").defaultNow().notNull(),
    rotatedById: text("rotated_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("access_productId_idx").on(table.productId)],
);

export const accessEvent = pgTable(
  "access_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    accessId: text("access_id")
      .notNull()
      .references(() => access.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").$type<AccessAction>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("access_event_accessId_idx").on(table.accessId)],
);

export const accessRelations = relations(access, ({ one, many }) => ({
  product: one(product, {
    fields: [access.productId],
    references: [product.id],
  }),
  createdBy: one(user, {
    fields: [access.createdById],
    references: [user.id],
    relationName: "accessCreatedBy",
  }),
  rotatedBy: one(user, {
    fields: [access.rotatedById],
    references: [user.id],
    relationName: "accessRotatedBy",
  }),
  events: many(accessEvent),
}));

export const accessEventRelations = relations(accessEvent, ({ one }) => ({
  access: one(access, {
    fields: [accessEvent.accessId],
    references: [access.id],
  }),
  user: one(user, {
    fields: [accessEvent.userId],
    references: [user.id],
    relationName: "accessEventUser",
  }),
}));

/* ---- Documentos do produto ---------------------------------------------- */

export type DocumentType = "doc" | "file" | "link";
export type DocumentAction = "created" | "edited" | "moved";

export const documentFolder = pgTable(
  "document_folder",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("document_folder_productId_idx").on(table.productId),
    uniqueIndex("document_folder_productId_name_uq").on(
      table.productId,
      table.name,
    ),
  ],
);

export const document = pgTable(
  "document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    // restrict: excluir pasta com docs não é fluxo da v1 — mover/excluir antes
    folderId: text("folder_id")
      .notNull()
      .references(() => documentFolder.id, { onDelete: "restrict" }),
    type: text("type").$type<DocumentType>().notNull(),
    title: text("title").notNull(),
    // type = doc: markdown puro
    body: text("body"),
    // type = file (Vercel Blob, máx 25 MB)
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    // type = link
    url: text("url"),
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedById: text("updated_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("document_productId_idx").on(table.productId),
    index("document_folderId_idx").on(table.folderId),
  ],
);

export const documentEvent = pgTable(
  "document_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").$type<DocumentAction>().notNull(),
    // "moved": nome da pasta destino (rótulo "moveu para <detail>")
    detail: text("detail"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("document_event_documentId_idx").on(table.documentId)],
);

export const documentFolderRelations = relations(
  documentFolder,
  ({ one, many }) => ({
    product: one(product, {
      fields: [documentFolder.productId],
      references: [product.id],
    }),
    documents: many(document),
  }),
);

export const documentRelations = relations(document, ({ one, many }) => ({
  product: one(product, {
    fields: [document.productId],
    references: [product.id],
  }),
  folder: one(documentFolder, {
    fields: [document.folderId],
    references: [documentFolder.id],
  }),
  createdBy: one(user, {
    fields: [document.createdById],
    references: [user.id],
    relationName: "documentCreatedBy",
  }),
  updatedBy: one(user, {
    fields: [document.updatedById],
    references: [user.id],
    relationName: "documentUpdatedBy",
  }),
  events: many(documentEvent),
}));

export const documentEventRelations = relations(documentEvent, ({ one }) => ({
  document: one(document, {
    fields: [documentEvent.documentId],
    references: [document.id],
  }),
  user: one(user, {
    fields: [documentEvent.userId],
    references: [user.id],
    relationName: "documentEventUser",
  }),
}));

export const productStageEventRelations = relations(
  productStageEvent,
  ({ one }) => ({
    product: one(product, {
      fields: [productStageEvent.productId],
      references: [product.id],
    }),
  }),
);

/* ---- Diagnóstico Provimento CNJ 213/2026 -------------------------------- */

export type RespostaValor = "sim" | "parcial" | "nao" | "nao_sei";
export type DiagnosticoEscopo = "inicial" | "completo";
export type DiagnosticoModelo =
  | "propria"
  | "contratada"
  | "saas"
  | "compartilhada"
  | "nao_sei";
export type DiagnosticoStatusFunil =
  | "novo"
  | "em_andamento"
  | "concluido"
  | "proposta"
  | "ganho"
  | "perdido";
// "interno": cadastrado pela equipe na call. "pre-cadastro": lead da landing
// pública (/diagnostico) — entra no funil como "novo" e a equipe completa.
export type DiagnosticoOrigem = "interno" | "pre-cadastro";
export type IdentidadeItem = "site" | "email" | "fone";

/** Condições especiais do requisito (ex.: nota de dispensa de pentest em SaaS). */
export type RequisitoCondicoes = {
  // exibe a nota no relatório quando o modelo de solução do diagnóstico bate
  notaModelos?: DiagnosticoModelo[];
  nota?: string;
};

/** Natureza do trabalho de adequação: quem faz e como custa (relatório interno). */
export type RequisitoNatureza =
  | "documento" // Átrios produz (PSI, ROPA, PCN, designações…)
  | "configuracao" // Átrios executa (MFA, criptografia, backup…)
  | "capex" // o cartório compra (no-break, storage, firewall, licença)
  | "recorrente" // vira anuidade (testes, simulações, capacitação)
  | "terceiro" // subcontratado (pentest, laudo de aterramento)
  | "ato_titular"; // custo zero (declarar a etapa no Justiça Aberta)

// Requisitos do Anexo IV em banco, não em código — texto, peso e classes
// editáveis sem deploy. Seed: src/db/seed-provimento.ts (upsert por id).
export const requisito = pgTable(
  "requisito",
  {
    // id determinístico ("req-01"…) para o seed ser idempotente sem apagar
    // respostas que referenciam o requisito
    id: text("id").primaryKey(),
    etapa: integer("etapa").notNull(),
    refNormativa: text("ref_normativa").notNull(),
    perguntaTecnica: text("pergunta_tecnica").notNull(),
    perguntaSimples: text("pergunta_simples").notNull(),
    peso: integer("peso").notNull(),
    classes: jsonb("classes").$type<number[]>().notNull(),
    condicoes: jsonb("condicoes").$type<RequisitoCondicoes>(),
    ordem: integer("ordem").notNull(),
    ativo: boolean("ativo").default(true).notNull(),
    // Apontamento do relatório do CLIENTE (4 partes: o quê + dispositivo na
    // exigência; a situação vem da resposta; a consequência é conferível na
    // norma). Pergunta e apontamento são coisas diferentes: a pergunta é
    // ferramenta de entrevista e NUNCA aparece no relatório do cliente.
    apontamentoTitulo: text("apontamento_titulo"),
    apontamentoExigencia: text("apontamento_exigencia"),
    apontamentoConsequencia: text("apontamento_consequencia"),
    // Roteiro de execução: o "como fazer". SÓ no relatório INTERNO — é o
    // produto da Átrios e jamais sai no PDF do cliente (teste automatizado
    // em relatorio-doc.test.ts protege isto).
    roteiroExecucao: text("roteiro_execucao"),
    // O que existe ao final (ex.: "PSI assinada e divulgada").
    artefato: text("artefato"),
    natureza: text("natureza").$type<RequisitoNatureza>(),
    // horas para criar o artefato reutilizável (uma vez)
    esforcoTemplateHoras: numeric("esforco_template_horas", {
      precision: 5,
      scale: 1,
    }),
    // horas para adaptar/executar por serventia
    esforcoServentiaHoras: numeric("esforco_serventia_horas", {
      precision: 5,
      scale: 1,
    }),
    exigeCapex: boolean("exige_capex").default(false).notNull(),
    // item que o cartório compra (repasse, fora do preço do serviço)
    capexDescricao: text("capex_descricao"),
    // O texto (apontamento + roteiro) foi revisado por gente? O seed entra
    // como esqueleto (false); o PDF interno marca o que está pendente.
    revisado: boolean("revisado").default(false).notNull(),
  },
  (table) => [index("requisito_etapa_idx").on(table.etapa)],
);

// Vigência, prazos art. 20/23 e prorrogações estaduais (uf null = nacional).
// O motor lê daqui; mudança de norma = update de linha, não deploy.
export const parametroNorma = pgTable(
  "parametro_norma",
  {
    // id determinístico "<chave>:<uf|*>" (seed idempotente)
    id: text("id").primaryKey(),
    chave: text("chave").notNull(),
    valor: text("valor").notNull(),
    uf: text("uf"),
    descricao: text("descricao"),
  },
  (table) => [index("parametro_norma_chave_idx").on(table.chave)],
);

/* ---- Serventias (base de prospecção extrajudicial) ---------------------- */

// Espelho da API pública do Justiça Aberta/CNJ (extração manual → seed por
// upsert de CNS, idempotente). Classe, prazo, dias restantes e "vaga" são
// DERIVADOS na leitura (motor + parametro_norma), nunca colunas. Sem status
// comercial próprio: o funil vive em diagnostico.status_funil — uma serventia
// tem, ou não, um diagnóstico.
export const serventia = pgTable(
  "serventia",
  {
    // CNS com zero à esquerda — string, nunca integer.
    cns: text("cns").primaryKey(),
    nome: text("nome").notNull(),
    cidade: text("cidade").notNull(),
    // "RN" fixo por ora; a coluna existe para os próximos estados.
    uf: text("uf").notNull().default("RN"),
    // "PROVIDO" ou vago/interino (VAGO, SOB INTERVENÇÃO, ""…). vaga = != PROVIDO.
    situacao: text("situacao").notNull().default(""),
    tipo: text("tipo"),
    // especialidades separadas por " | " (string crua da API)
    natureza: text("natureza"),
    telefone: text("telefone"),
    email: text("email"),
    endereco: text("endereco"),
    responsavel: text("responsavel"),
    ingresso: date("ingresso"),
    arrecPeriodo: text("arrec_periodo"),
    // últimos dois semestres, como a API entrega (numeric → string no driver)
    arrecAtual: numeric("arrec_atual", { precision: 14, scale: 2 }),
    arrecAnterior: numeric("arrec_anterior", { precision: 14, scale: 2 }),
    atos: integer("atos"),
    sincronizadoEm: timestamp("sincronizado_em").defaultNow().notNull(),
  },
  (table) => [
    index("serventia_uf_idx").on(table.uf),
    index("serventia_cidade_idx").on(table.cidade),
  ],
);

export const diagnostico = pgTable(
  "diagnostico",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    serventia: text("serventia").notNull(),
    // FK para a base de prospecção (nullable: pode haver diagnóstico de
    // serventia fora da base, e leads do pré-cadastro nascem sem CNS).
    cns: text("cns").references(() => serventia.cns, { onDelete: "set null" }),
    municipio: text("municipio"),
    uf: text("uf").notNull(),
    // nulo no lead de pré-cadastro (a landing não pergunta arrecadação) — a
    // equipe define a classe ao trabalhar o lead.
    classe: integer("classe"),
    subclasse: text("subclasse"),
    // atribuição da serventia (Notas, RI, RCPN…) — coletada no pré-cadastro,
    // opcional no cadastro interno.
    atribuicao: text("atribuicao"),
    modeloSolucao: text("modelo_solucao")
      .$type<DiagnosticoModelo>()
      .notNull()
      .default("nao_sei"),
    contatoNome: text("contato_nome").notNull(),
    contatoCargo: text("contato_cargo"),
    contatoEmail: text("contato_email"),
    contatoWhatsapp: text("contato_whatsapp"),
    // Prova do consentimento (LGPD art. 8º, §1º): quando o titular aceitou e a
    // que versão da política. Nulo em leads internos, que não passam pelo
    // formulário público.
    consentimentoEm: timestamp("consentimento_em"),
    consentimentoPolitica: text("consentimento_politica"),
    origem: text("origem")
      .$type<DiagnosticoOrigem>()
      .notNull()
      .default("interno"),
    escopo: text("escopo").$type<DiagnosticoEscopo>().notNull(),
    // preenchido ao concluir (snapshot do motor na conclusão)
    scoreGeral: integer("score_geral"),
    statusFunil: text("status_funil")
      .$type<DiagnosticoStatusFunil>()
      .notNull()
      .default("em_andamento"),
    criadoPorId: text("criado_por_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("diagnostico_statusFunil_idx").on(table.statusFunil),
    index("diagnostico_uf_idx").on(table.uf),
  ],
);

export const resposta = pgTable(
  "resposta",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    diagnosticoId: text("diagnostico_id")
      .notNull()
      .references(() => diagnostico.id, { onDelete: "cascade" }),
    requisitoId: text("requisito_id")
      .notNull()
      .references(() => requisito.id, { onDelete: "cascade" }),
    valor: text("valor").$type<RespostaValor>().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("resposta_diagnosticoId_requisitoId_uq").on(
      table.diagnosticoId,
      table.requisitoId,
    ),
  ],
);

// Identidade digital (site/e-mail/fone) — não pontua no provimento; vira
// card de oportunidade comercial no relatório.
export const respostaIdentidade = pgTable(
  "resposta_identidade",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    diagnosticoId: text("diagnostico_id")
      .notNull()
      .references(() => diagnostico.id, { onDelete: "cascade" }),
    item: text("item").$type<IdentidadeItem>().notNull(),
    valor: text("valor").$type<RespostaValor>().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("resposta_identidade_diagnosticoId_item_uq").on(
      table.diagnosticoId,
      table.item,
    ),
  ],
);

export const diagnosticoRelations = relations(diagnostico, ({ one, many }) => ({
  criadoPor: one(user, {
    fields: [diagnostico.criadoPorId],
    references: [user.id],
  }),
  serventiaRef: one(serventia, {
    fields: [diagnostico.cns],
    references: [serventia.cns],
  }),
  respostas: many(resposta),
  respostasIdentidade: many(respostaIdentidade),
}));

export const serventiaRelations = relations(serventia, ({ many }) => ({
  diagnosticos: many(diagnostico),
}));

export const respostaRelations = relations(resposta, ({ one }) => ({
  diagnostico: one(diagnostico, {
    fields: [resposta.diagnosticoId],
    references: [diagnostico.id],
  }),
  requisito: one(requisito, {
    fields: [resposta.requisitoId],
    references: [requisito.id],
  }),
}));

export const respostaIdentidadeRelations = relations(
  respostaIdentidade,
  ({ one }) => ({
    diagnostico: one(diagnostico, {
      fields: [respostaIdentidade.diagnosticoId],
      references: [diagnostico.id],
    }),
  }),
);

export const requisitoRelations = relations(requisito, ({ many }) => ({
  respostas: many(resposta),
}));

/* ---- Log de geração dos relatórios (PDF) --------------------------------- */

export type RelatorioTipo = "cliente" | "interno";

// Quem gerou qual PDF e quando. Exigência de segurança do relatório interno
// (o documento que não pode vazar): toda geração fica registrada.
export const relatorioEvento = pgTable(
  "relatorio_evento",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    diagnosticoId: text("diagnostico_id")
      .notNull()
      .references(() => diagnostico.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    tipo: text("tipo").$type<RelatorioTipo>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("relatorio_evento_diagnosticoId_idx").on(table.diagnosticoId),
  ],
);

export const relatorioEventoRelations = relations(
  relatorioEvento,
  ({ one }) => ({
    diagnostico: one(diagnostico, {
      fields: [relatorioEvento.diagnosticoId],
      references: [diagnostico.id],
    }),
    user: one(user, {
      fields: [relatorioEvento.userId],
      references: [user.id],
    }),
  }),
);

/* ---- Pré-cadastro público (landing /diagnostico) ------------------------ */

export type PreCadastroResultado =
  | "created"
  | "updated"
  | "rejected"
  | "honeypot"
  | "rate_limited";

// Auditoria + rate limit do formulário público. Uma linha por tentativa de
// envio (inclusive rejeitadas/honeypot): alimenta o limite por IP e o log
// mínimo exigido (data, IP truncado). O lead em si vive em `diagnostico`.
export const preCadastroSubmission = pgTable(
  "pre_cadastro_submission",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // IP truncado (/24 em IPv4) — LGPD: não guardamos o IP completo.
    ip: text("ip").notNull(),
    email: text("email"),
    whatsapp: text("whatsapp"),
    diagnosticoId: text("diagnostico_id").references(() => diagnostico.id, {
      onDelete: "set null",
    }),
    resultado: text("resultado").$type<PreCadastroResultado>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("pre_cadastro_submission_ip_idx").on(table.ip, table.createdAt),
  ],
);
