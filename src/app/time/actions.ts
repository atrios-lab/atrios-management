"use server";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, count, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth, pendingInvite } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { publish } from "@/lib/realtime/publish";
import { channels } from "@/lib/realtime/types";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const INVITE_TTL_DAYS = Math.round(INVITE_TTL_MS / (24 * 60 * 60 * 1000));

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  member: "Membro",
};

type Result = { error?: string };

/** Toda mutation exige sessão de admin — a UI é só cosmética (H7). */
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") return null;
  return session;
}

async function notifyTime(actorId?: string) {
  await publish({ channel: channels.time, type: "changed", actorId });
}

async function adminCount() {
  const [{ value }] = await db
    .select({ value: count() })
    .from(schema.user)
    .where(eq(schema.user.role, "admin"));
  return value;
}

async function sendInviteEmail(opts: {
  email: string;
  token: string;
  role: string;
  inviterName: string;
}) {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${base}/convite/${opts.token}`;
  const roleLabel = ROLE_LABELS[opts.role] ?? opts.role;

  const template = await readFile(
    join(process.cwd(), "public", "emails", "invite.html"),
    "utf8",
  );
  const html = template
    .replaceAll("{{inviterName}}", opts.inviterName)
    .replaceAll("{{roleLabel}}", roleLabel)
    .replaceAll("{{inviteUrl}}", inviteUrl)
    .replaceAll("{{expiresInDays}}", String(INVITE_TTL_DAYS));

  await sendEmail({
    to: opts.email,
    subject: "Convite — Átrios Management",
    text: `${opts.inviterName} convidou você para o time da Átrios (${roleLabel}). Aceite em: ${inviteUrl}`,
    html,
  });
}

export async function inviteMember(
  rawEmail: string,
  role: "admin" | "member",
): Promise<Result> {
  const session = await requireAdmin();
  if (!session) return { error: "Apenas admins podem convidar." };
  const email = rawEmail.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Email inválido." };

  const existing = await db.query.user.findFirst({
    where: eq(schema.user.email, email),
  });
  if (existing) return { error: "Este email já é membro do time." };
  if (await pendingInvite(email))
    return { error: "Este email já tem um convite pendente." };

  const token = randomUUID();
  await db.insert(schema.invite).values({
    id: randomUUID(),
    email,
    role,
    invitedById: session.user.id,
    token,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });
  await sendInviteEmail({
    email,
    token,
    role,
    inviterName: session.user.name ?? "Um administrador",
  });
  revalidatePath("/time");
  await notifyTime(session.user.id);
  return {};
}

export async function resendInvite(inviteId: string): Promise<Result> {
  const session = await requireAdmin();
  if (!session) return { error: "Apenas admins podem reenviar convites." };
  const inv = await db.query.invite.findFirst({
    where: eq(schema.invite.id, inviteId),
    with: { invitedBy: true },
  });
  if (!inv || inv.acceptedAt) return { error: "Convite não está pendente." };

  const token = randomUUID();
  await db
    .update(schema.invite)
    .set({ token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) })
    .where(eq(schema.invite.id, inviteId));
  await sendInviteEmail({
    email: inv.email,
    token,
    role: inv.role,
    inviterName: inv.invitedBy?.name ?? "Um administrador",
  });
  revalidatePath("/time");
  await notifyTime(session.user.id);
  return {};
}

export async function cancelInvite(inviteId: string): Promise<Result> {
  const session = await requireAdmin();
  if (!session) return { error: "Apenas admins podem cancelar convites." };
  await db
    .delete(schema.invite)
    .where(
      and(eq(schema.invite.id, inviteId), isNull(schema.invite.acceptedAt)),
    );
  revalidatePath("/time");
  await notifyTime(session.user.id);
  return {};
}

export async function changeRole(
  userId: string,
  role: "admin" | "member",
): Promise<Result> {
  const session = await requireAdmin();
  if (!session) return { error: "Apenas admins podem mudar roles." };
  const target = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
  });
  if (!target) return { error: "Usuário não encontrado." };
  if (target.role === "admin" && role === "member" && (await adminCount()) <= 1)
    return { error: "O time precisa de pelo menos um admin." };

  await db.update(schema.user).set({ role }).where(eq(schema.user.id, userId));
  revalidatePath("/time");
  await notifyTime(session.user.id);
  return {};
}

export async function removeMember(userId: string): Promise<Result> {
  const session = await requireAdmin();
  if (!session) return { error: "Apenas admins podem remover membros." };
  if (userId === session.user.id)
    return { error: "Você não pode remover a si mesmo." };
  const target = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
  });
  if (!target) return { error: "Usuário não encontrado." };
  if (target.role === "admin" && (await adminCount()) <= 1)
    return { error: "O time precisa de pelo menos um admin." };

  // FK cascade apaga sessões e accounts junto.
  await db.delete(schema.user).where(eq(schema.user.id, userId));
  revalidatePath("/time");
  await notifyTime(session.user.id);
  return {};
}
