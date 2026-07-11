"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import type { AccessAmbiente, AccessTipo } from "@/db/schema";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { publish } from "@/lib/realtime/publish";
import { channels } from "@/lib/realtime/types";
import { ACCESS_AMBIENTES, ACCESS_TIPOS } from "@/lib/vault-constants";
import { decryptSecret, encryptSecret } from "@/lib/vault-crypto";

type Result = { error?: string };

async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

function roleOf(session: { user: unknown } | null): string | undefined {
  return (session?.user as { role?: string } | undefined)?.role;
}

export interface AccessInput {
  productId: string;
  name: string;
  tipo: AccessTipo;
  ambiente: AccessAmbiente;
  login: string;
  /** Em edição, vazio = manter a senha atual. */
  password: string;
  totpCodes?: string;
  notes?: string;
}

function validate(input: AccessInput, requirePassword: boolean): string | null {
  if (!input.name.trim()) return "Informe o nome do acesso.";
  if (!input.productId) return "Selecione o produto.";
  if (!(input.tipo in ACCESS_TIPOS)) return "Tipo inválido.";
  if (!(input.ambiente in ACCESS_AMBIENTES)) return "Ambiente inválido.";
  if (!input.login.trim()) return "Informe o login.";
  if (requirePassword && !input.password) return "Informe a senha.";
  return null;
}

export async function createAccess(input: AccessInput): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const invalid = validate(input, true);
  if (invalid) return { error: invalid };

  const product = await db.query.product.findFirst({
    where: eq(schema.product.id, input.productId),
    columns: { id: true },
  });
  if (!product) return { error: "Produto não encontrado." };

  const [row] = await db
    .insert(schema.access)
    .values({
      productId: input.productId,
      name: input.name.trim(),
      tipo: input.tipo,
      ambiente: input.ambiente,
      login: input.login.trim(),
      passwordEnc: encryptSecret(input.password),
      totpCodesEnc: input.totpCodes?.trim()
        ? encryptSecret(input.totpCodes.trim())
        : undefined,
      notes: input.notes?.trim() || undefined,
      createdById: session.user.id,
      rotatedById: session.user.id,
    })
    .returning();
  await db.insert(schema.accessEvent).values({
    accessId: row.id,
    userId: session.user.id,
    action: "created",
  });
  revalidatePath("/", "layout");
  await publish({
    channel: channels.cofre,
    type: "changed",
    actorId: session.user.id,
    id: row.id,
  });
  return {};
}

export async function updateAccess(
  accessId: string,
  input: AccessInput,
): Promise<Result> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  const invalid = validate(input, false);
  if (invalid) return { error: invalid };

  const rotating = input.password.length > 0;
  const [updated] = await db
    .update(schema.access)
    .set({
      name: input.name.trim(),
      tipo: input.tipo,
      ambiente: input.ambiente,
      login: input.login.trim(),
      notes: input.notes?.trim() || null,
      // 2FA: como a senha, em branco = manter os códigos atuais
      ...(input.totpCodes?.trim() && {
        totpCodesEnc: encryptSecret(input.totpCodes.trim()),
      }),
      ...(rotating && {
        passwordEnc: encryptSecret(input.password),
        rotatedAt: new Date(),
        rotatedById: session.user.id,
      }),
    })
    .where(eq(schema.access.id, accessId))
    .returning();
  if (!updated) return { error: "Acesso não encontrado." };

  if (rotating) {
    await db.insert(schema.accessEvent).values({
      accessId,
      userId: session.user.id,
      action: "rotated",
    });
  }
  revalidatePath("/", "layout");
  await publish({
    channel: channels.cofre,
    type: "changed",
    actorId: session.user.id,
    id: accessId,
  });
  return {};
}

/**
 * Único caminho para um segredo sair do servidor em claro — por isso a
 * auditoria é garantida por construção. `reveal` é restrito a admins;
 * `copy` vale para qualquer membro (a UI não exibe o valor, só copia).
 */
export async function getSecret(
  accessId: string,
  field: "password" | "totp",
  intent: "reveal" | "copy",
): Promise<Result & { value?: string }> {
  const session = await requireSession();
  if (!session) return { error: "Sessão expirada." };
  if (intent === "reveal" && roleOf(session) !== "admin")
    return { error: "Somente admins podem revelar a senha." };

  const row = await db.query.access.findFirst({
    where: eq(schema.access.id, accessId),
    columns: { passwordEnc: true, totpCodesEnc: true },
  });
  if (!row) return { error: "Acesso não encontrado." };
  const enc = field === "password" ? row.passwordEnc : row.totpCodesEnc;
  if (!enc) return { error: "Este acesso não tem códigos 2FA." };

  await db.insert(schema.accessEvent).values({
    accessId,
    userId: session.user.id,
    action: intent === "reveal" ? "viewed" : "copied",
  });
  return { value: decryptSecret(enc) };
}
