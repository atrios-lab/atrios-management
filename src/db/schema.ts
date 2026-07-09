import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
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
