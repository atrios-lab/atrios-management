"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth, pendingInvite } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

type Result = { error?: string };

/** Toda mutation exige sessão de admin — a UI é só cosmética (H7). */
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") return null;
  return session;
}

async function adminCount() {
  const [{ value }] = await db
    .select({ value: count() })
    .from(schema.user)
    .where(eq(schema.user.role, "admin"));
  return value;
}

async function sendInviteEmail(email: string, token: string) {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  await sendEmail({
    to: email,
    subject: "Convite — Átrios Management",
    text: `Você foi convidado(a) para o time da Átrios: ${base}/convite/${token}`,
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
  await sendInviteEmail(email, token);
  revalidatePath("/time");
  return {};
}

export async function resendInvite(inviteId: string): Promise<Result> {
  if (!(await requireAdmin()))
    return { error: "Apenas admins podem reenviar convites." };
  const inv = await db.query.invite.findFirst({
    where: eq(schema.invite.id, inviteId),
  });
  if (!inv || inv.acceptedAt) return { error: "Convite não está pendente." };

  const token = randomUUID();
  await db
    .update(schema.invite)
    .set({ token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) })
    .where(eq(schema.invite.id, inviteId));
  await sendInviteEmail(inv.email, token);
  revalidatePath("/time");
  return {};
}

export async function cancelInvite(inviteId: string): Promise<Result> {
  if (!(await requireAdmin()))
    return { error: "Apenas admins podem cancelar convites." };
  await db
    .delete(schema.invite)
    .where(
      and(eq(schema.invite.id, inviteId), isNull(schema.invite.acceptedAt)),
    );
  revalidatePath("/time");
  return {};
}

export async function changeRole(
  userId: string,
  role: "admin" | "member",
): Promise<Result> {
  if (!(await requireAdmin()))
    return { error: "Apenas admins podem mudar roles." };
  const target = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
  });
  if (!target) return { error: "Usuário não encontrado." };
  if (target.role === "admin" && role === "member" && (await adminCount()) <= 1)
    return { error: "O time precisa de pelo menos um admin." };

  await db.update(schema.user).set({ role }).where(eq(schema.user.id, userId));
  revalidatePath("/time");
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
  return {};
}
