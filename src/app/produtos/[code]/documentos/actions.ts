"use server";

import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { isAcceptedFileType, MAX_FILE_BYTES } from "@/lib/document-constants";

type Result = { error?: string };

/** Toda mutation exige sessão; o user autentica autoria dos eventos. */
async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** Unique violation (23505); drizzle embrulha o erro do pg em `cause`. */
function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

/** Pasta precisa existir e pertencer ao produto do documento. */
async function folderInProduct(folderId: string, productId: string) {
  const folder = await db.query.documentFolder.findFirst({
    where: (f, { and, eq: eqf }) =>
      and(eqf(f.id, folderId), eqf(f.productId, productId)),
    columns: { id: true, name: true },
  });
  return folder ?? null;
}

/* ---- Pastas -------------------------------------------------------------- */

export async function createFolder(
  productId: string,
  name: string,
): Promise<Result & { id?: string; name?: string }> {
  if (!(await requireUser())) return { error: "Sessão expirada." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "Informe o nome da pasta." };

  try {
    const [row] = await db
      .insert(schema.documentFolder)
      .values({ productId, name: trimmed })
      .returning();
    revalidatePath("/produtos", "layout");
    return { id: row.id, name: row.name };
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: `Já existe uma pasta "${trimmed}" neste produto.` };
    throw e;
  }
}

/* ---- Criação de documentos ------------------------------------------------ */

async function insertDocument(
  values: typeof schema.document.$inferInsert,
  userId: string,
): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(schema.document).values(values).returning();
    await tx.insert(schema.documentEvent).values({
      documentId: row.id,
      userId,
      action: "created",
    });
    return row.id;
  });
}

export async function createDocDocument(
  productId: string,
  folderId: string,
  title: string,
  body: string,
): Promise<Result & { id?: string }> {
  const user = await requireUser();
  if (!user) return { error: "Sessão expirada." };
  const trimmed = title.trim();
  if (!trimmed) return { error: "Informe o título do documento." };
  if (!(await folderInProduct(folderId, productId)))
    return { error: "Escolha uma pasta." };

  const id = await insertDocument(
    {
      productId,
      folderId,
      type: "doc",
      title: trimmed,
      body,
      createdById: user.id,
      updatedById: user.id,
    },
    user.id,
  );
  revalidatePath("/produtos", "layout");
  return { id };
}

export async function createFileDocument(
  productId: string,
  folderId: string,
  file: { url: string; name: string; size: number; mimeType: string },
): Promise<Result & { id?: string }> {
  const user = await requireUser();
  if (!user) return { error: "Sessão expirada." };
  if (!file.url || !file.name) return { error: "Arquivo inválido." };
  if (file.size > MAX_FILE_BYTES) return { error: "O arquivo passa de 25 MB." };
  if (!isAcceptedFileType(file.mimeType))
    return { error: "Formato não aceito — envie PDF, planilha ou imagem." };
  if (!(await folderInProduct(folderId, productId)))
    return { error: "Escolha uma pasta." };

  const id = await insertDocument(
    {
      productId,
      folderId,
      type: "file",
      title: file.name,
      fileUrl: file.url,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.mimeType,
      createdById: user.id,
      updatedById: user.id,
    },
    user.id,
  );
  revalidatePath("/produtos", "layout");
  return { id };
}

function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export async function createLinkDocument(
  productId: string,
  folderId: string,
  title: string,
  url: string,
): Promise<Result & { id?: string }> {
  const user = await requireUser();
  if (!user) return { error: "Sessão expirada." };
  const parsed = parseHttpUrl(url);
  if (!parsed) return { error: "Cole uma URL http(s) válida." };
  const trimmed = title.trim() || parsed.hostname.replace(/^www\./, "");
  if (!(await folderInProduct(folderId, productId)))
    return { error: "Escolha uma pasta." };

  const id = await insertDocument(
    {
      productId,
      folderId,
      type: "link",
      title: trimmed,
      url: parsed.href,
      createdById: user.id,
      updatedById: user.id,
    },
    user.id,
  );
  revalidatePath("/produtos", "layout");
  return { id };
}

/* ---- Título de link (D3: fetch defensivo) --------------------------------- */

/** Hosts que nunca devem ser buscados pelo servidor (mitigação básica de SSRF). */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal"))
    return true;
  // IPv6 literal (URL entrega sem colchetes) — loopback/link-local/único-local
  if (h.includes(":"))
    return (
      h === "::1" ||
      h.startsWith("fe80") ||
      h.startsWith("fc") ||
      h.startsWith("fd")
    );
  // IPv4 literal privado/loopback/metadata
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&[a-z]+;|&#\d+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e);
}

/** Busca o <title> da página para preencher o card de preview do link. */
export async function fetchLinkTitle(
  url: string,
): Promise<{ title?: string; error?: string }> {
  if (!(await requireUser())) return { error: "Sessão expirada." };
  const parsed = parseHttpUrl(url);
  if (!parsed) return { error: "Cole uma URL http(s) válida." };
  if (isPrivateHost(parsed.hostname)) return { error: "URL não permitida." };

  try {
    const res = await fetch(parsed.href, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: "text/html" },
      cache: "no-store",
    });
    if (!res.ok || !res.body) return {};
    // Lê no máximo ~64 KB — o <title> vive no começo do HTML.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < 65536) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = match ? decodeEntities(match[1]).trim() : "";
    return title ? { title: title.slice(0, 200) } : {};
  } catch {
    // Timeout/rede: o usuário digita o título manualmente.
    return {};
  }
}

/* ---- Edição / mover / renomear / excluir ---------------------------------- */

async function loadDocument(docId: string) {
  return db.query.document.findFirst({
    where: (d, { eq: eqd }) => eqd(d.id, docId),
  });
}

export async function updateDocument(
  docId: string,
  patch: { title: string; body: string; folderId: string },
): Promise<Result> {
  const user = await requireUser();
  if (!user) return { error: "Sessão expirada." };
  const title = patch.title.trim();
  if (!title) return { error: "O título não pode ficar vazio." };

  const doc = await loadDocument(docId);
  if (!doc) return { error: "Documento não encontrado." };
  if (doc.type !== "doc") return { error: "Só docs escritos têm conteúdo." };

  const folder = await folderInProduct(patch.folderId, doc.productId);
  if (!folder) return { error: "Pasta inválida." };

  await db.transaction(async (tx) => {
    await tx
      .update(schema.document)
      .set({
        title,
        body: patch.body,
        folderId: patch.folderId,
        updatedById: user.id,
      })
      .where(eq(schema.document.id, docId));
    await tx.insert(schema.documentEvent).values({
      documentId: docId,
      userId: user.id,
      action: "edited",
    });
    if (patch.folderId !== doc.folderId) {
      await tx.insert(schema.documentEvent).values({
        documentId: docId,
        userId: user.id,
        action: "moved",
        detail: folder.name,
      });
    }
  });
  revalidatePath("/produtos", "layout");
  return {};
}

export async function renameDocument(
  docId: string,
  title: string,
): Promise<Result> {
  const user = await requireUser();
  if (!user) return { error: "Sessão expirada." };
  const trimmed = title.trim();
  if (!trimmed) return { error: "O título não pode ficar vazio." };

  const [updated] = await db
    .update(schema.document)
    .set({ title: trimmed, updatedById: user.id })
    .where(eq(schema.document.id, docId))
    .returning();
  if (!updated) return { error: "Documento não encontrado." };
  await db.insert(schema.documentEvent).values({
    documentId: docId,
    userId: user.id,
    action: "edited",
  });
  revalidatePath("/produtos", "layout");
  return {};
}

export async function moveDocument(
  docId: string,
  folderId: string,
): Promise<Result> {
  const user = await requireUser();
  if (!user) return { error: "Sessão expirada." };

  const doc = await loadDocument(docId);
  if (!doc) return { error: "Documento não encontrado." };
  if (doc.folderId === folderId) return {};
  const folder = await folderInProduct(folderId, doc.productId);
  if (!folder) return { error: "Pasta inválida." };

  await db.transaction(async (tx) => {
    await tx
      .update(schema.document)
      .set({ folderId, updatedById: user.id })
      .where(eq(schema.document.id, docId));
    await tx.insert(schema.documentEvent).values({
      documentId: docId,
      userId: user.id,
      action: "moved",
      detail: folder.name,
    });
  });
  revalidatePath("/produtos", "layout");
  return {};
}

export async function deleteDocument(docId: string): Promise<Result> {
  if (!(await requireUser())) return { error: "Sessão expirada." };

  const doc = await loadDocument(docId);
  if (!doc) return { error: "Documento não encontrado." };

  await db.delete(schema.document).where(eq(schema.document.id, docId));
  if (doc.type === "file" && doc.fileUrl) {
    // Blob órfão não pode impedir a exclusão do registro.
    try {
      await del(doc.fileUrl);
    } catch {}
  }
  revalidatePath("/produtos", "layout");
  return {};
}
