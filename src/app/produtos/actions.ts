"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import type { CardStatus } from "@/db/schema";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { PRODUCT_CODE_RE, STAGES } from "@/lib/product-constants";
import { publish } from "@/lib/realtime/publish";
import { channels } from "@/lib/realtime/types";

type Result = { error?: string };

const CARD_STATUSES: CardStatus[] = ["todo", "progress", "review", "done"];

/** Toda mutation exige sessão — qualquer membro gerencia produtos (design D2). */
async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Avisa os boards abertos do produto para ressincronizarem. */
async function notifyProduct(
  productId: string,
  type: string,
  actorId?: string,
  id?: string,
) {
  await publish({ channel: channels.product(productId), type, actorId, id });
}

/** Unique violation (23505); drizzle embrulha o erro do pg em `cause`. */
function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

/* ---- Produtos ---------------------------------------------------------- */

export async function createProduct(input: {
  name: string;
  description?: string;
  code: string;
  repos: { label: string; name: string }[];
}): Promise<Result> {
  if (!(await requireSession())) return { error: "Sessão expirada." };

  const name = input.name.trim();
  const description = input.description?.trim() ?? "";
  const code = input.code.trim().toUpperCase();
  if (!name) return { error: "Informe o nome do produto." };
  if (!PRODUCT_CODE_RE.test(code))
    return { error: "Código deve ter 2–4 letras ou números." };
  const repos = input.repos
    .map((r) => ({ label: r.label.trim(), name: r.name.trim() }))
    .filter((r) => r.label && r.name);

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.product)
        .values({ name, code, description })
        .returning();
      await tx
        .insert(schema.productStageEvent)
        .values({ productId: row.id, stage: 0 });
      if (repos.length) {
        await tx
          .insert(schema.productRepo)
          .values(repos.map((r) => ({ ...r, productId: row.id })));
      }
    });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: `Já existe um produto com o código ${code}.` };
    throw e;
  }
  revalidatePath("/", "layout"); // lista + sidebar (produtos aparecem em /time também)
  return {};
}

export async function updateProduct(
  productId: string,
  patch: { name?: string; description?: string; longDescription?: string },
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };

  const set: Partial<typeof schema.product.$inferInsert> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) return { error: "Informe o nome do produto." };
    set.name = name;
  }
  if (patch.description !== undefined)
    set.description = patch.description.trim() || "";
  if (patch.longDescription !== undefined)
    set.longDescription = patch.longDescription.trim() || null;
  if (Object.keys(set).length === 0) return {};

  const [updated] = await db
    .update(schema.product)
    .set(set)
    .where(eq(schema.product.id, productId))
    .returning();
  if (!updated) return { error: "Produto não encontrado." };
  revalidatePath("/", "layout");
  await notifyProduct(productId, "product.updated", session.user.id);
  return {};
}

export async function setProductStage(
  productId: string,
  stage: number,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  if (!Number.isInteger(stage) || stage < 0 || stage >= STAGES.length)
    return { error: "Etapa inválida." };

  const [updated] = await db
    .update(schema.product)
    .set({ stage })
    .where(eq(schema.product.id, productId))
    .returning();
  if (!updated) return { error: "Produto não encontrado." };
  await db.insert(schema.productStageEvent).values({ productId, stage });
  revalidatePath("/", "layout");
  await notifyProduct(productId, "product.updated", session.user.id);
  return {};
}

export async function addRepo(
  productId: string,
  label: string,
  name: string,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  if (!label.trim() || !name.trim())
    return { error: "Informe rótulo e nome do repositório." };
  await db.insert(schema.productRepo).values({
    productId,
    label: label.trim(),
    name: name.trim(),
  });
  revalidatePath("/produtos", "layout");
  await notifyProduct(productId, "product.updated", session.user.id);
  return {};
}

export async function removeRepo(repoId: string): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const [deleted] = await db
    .delete(schema.productRepo)
    .where(eq(schema.productRepo.id, repoId))
    .returning();
  revalidatePath("/produtos", "layout");
  if (deleted)
    await notifyProduct(deleted.productId, "product.updated", session.user.id);
  return {};
}

/* ---- Cards ------------------------------------------------------------- */

/** Marca o produto como atualizado (alimenta "há X" e a ordenação da lista). */
async function touchProduct(productId: string) {
  await db
    .update(schema.product)
    .set({ updatedAt: new Date() })
    .where(eq(schema.product.id, productId));
}

export async function createCard(
  productId: string,
  title: string,
  repoId?: string,
): Promise<Result & { id?: string; seq?: number }> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const trimmed = title.trim();
  if (!trimmed) return { error: "Informe o título do card." };

  // seq atômico via subquery; o unique (product_id, seq) segura corridas —
  // uma colisão rara vira um retry único.
  const insertOnce = async () => {
    const [row] = await db
      .insert(schema.card)
      .values({
        productId,
        title: trimmed,
        repoId: repoId || undefined,
        seq: sql<number>`(select coalesce(max(${schema.card.seq}), 0) + 1
          from ${schema.card} where ${schema.card.productId} = ${productId})`,
      })
      .returning();
    return row;
  };

  let row: typeof schema.card.$inferSelect;
  try {
    row = await insertOnce();
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    row = await insertOnce();
  }
  await touchProduct(productId);
  revalidatePath("/produtos", "layout");
  await notifyProduct(productId, "card.created", session.user.id, row.id);
  return { id: row.id, seq: row.seq };
}

export async function setCardStatus(
  cardId: string,
  status: CardStatus,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  if (!CARD_STATUSES.includes(status)) return { error: "Status inválido." };
  const [updated] = await db
    .update(schema.card)
    .set({ status })
    .where(eq(schema.card.id, cardId))
    .returning();
  if (!updated) return { error: "Card não encontrado." };
  await touchProduct(updated.productId);
  revalidatePath("/produtos", "layout");
  await notifyProduct(
    updated.productId,
    "card.updated",
    session.user.id,
    cardId,
  );
  return {};
}

export async function updateCard(
  cardId: string,
  patch: { title?: string; description?: string; repoId?: string | null },
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };

  const set: Partial<typeof schema.card.$inferInsert> = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) return { error: "O título não pode ficar vazio." };
    set.title = title;
  }
  if (patch.description !== undefined)
    set.description = patch.description.trim() || null;
  if (patch.repoId !== undefined) {
    if (patch.repoId) {
      // repo precisa pertencer ao mesmo produto do card
      const [ok] = await db
        .select({ id: schema.productRepo.id })
        .from(schema.productRepo)
        .innerJoin(
          schema.card,
          eq(schema.card.productId, schema.productRepo.productId),
        )
        .where(
          and(
            eq(schema.productRepo.id, patch.repoId),
            eq(schema.card.id, cardId),
          ),
        );
      if (!ok) return { error: "Repositório inválido para este card." };
    }
    set.repoId = patch.repoId;
  }
  if (Object.keys(set).length === 0) return {};

  const [updated] = await db
    .update(schema.card)
    .set(set)
    .where(eq(schema.card.id, cardId))
    .returning();
  if (!updated) return { error: "Card não encontrado." };
  await touchProduct(updated.productId);
  revalidatePath("/produtos", "layout");
  await notifyProduct(
    updated.productId,
    "card.updated",
    session.user.id,
    cardId,
  );
  return {};
}

const PR_URL_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)\/?$/;

export async function linkPr(cardId: string, url: string): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const match = url.trim().match(PR_URL_RE);
  if (!match) return { error: "Cole um link de PR do GitHub (…/pull/123)." };
  const [updated] = await db
    .update(schema.card)
    .set({ prUrl: url.trim(), prNumber: Number(match[1]) })
    .where(eq(schema.card.id, cardId))
    .returning();
  if (!updated) return { error: "Card não encontrado." };
  await touchProduct(updated.productId);
  revalidatePath("/produtos", "layout");
  await notifyProduct(
    updated.productId,
    "card.updated",
    session.user.id,
    cardId,
  );
  return {};
}

export async function unlinkPr(cardId: string): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const [updated] = await db
    .update(schema.card)
    .set({ prUrl: null, prNumber: null })
    .where(eq(schema.card.id, cardId))
    .returning();
  if (!updated) return { error: "Card não encontrado." };
  await touchProduct(updated.productId);
  revalidatePath("/produtos", "layout");
  await notifyProduct(
    updated.productId,
    "card.updated",
    session.user.id,
    cardId,
  );
  return {};
}

export async function deleteCard(cardId: string): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const [deleted] = await db
    .delete(schema.card)
    .where(eq(schema.card.id, cardId))
    .returning();
  if (!deleted) return { error: "Card não encontrado." };
  await touchProduct(deleted.productId);
  revalidatePath("/produtos", "layout");
  await notifyProduct(
    deleted.productId,
    "card.removed",
    session.user.id,
    cardId,
  );
  return {};
}

export async function archiveCard(
  cardId: string,
  archived: boolean,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const [updated] = await db
    .update(schema.card)
    .set({ archived })
    .where(eq(schema.card.id, cardId))
    .returning();
  if (!updated) return { error: "Card não encontrado." };
  await touchProduct(updated.productId);
  revalidatePath("/produtos", "layout");
  await notifyProduct(
    updated.productId,
    "card.archived",
    session.user.id,
    cardId,
  );
  return {};
}

export async function archiveDoneCards(productId: string): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  await db
    .update(schema.card)
    .set({ archived: true })
    .where(
      and(
        eq(schema.card.productId, productId),
        eq(schema.card.status, "done"),
        eq(schema.card.archived, false),
      ),
    );
  await touchProduct(productId);
  revalidatePath("/produtos", "layout");
  await notifyProduct(productId, "card.archived", session.user.id);
  return {};
}
