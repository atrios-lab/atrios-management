import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";

/** Convite pendente (não aceito, não expirado) para um email, se houver. */
export async function pendingInvite(email: string) {
  const [inv] = await db
    .select()
    .from(schema.invite)
    .where(
      and(
        eq(schema.invite.email, email.toLowerCase()),
        isNull(schema.invite.acceptedAt),
        gt(schema.invite.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return inv;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Átrios — redefinir senha",
        text: `Redefina sua senha: ${url}`,
      });
    },
  },
  socialProviders: {
    ...(process.env.GITHUB_CLIENT_ID && {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    }),
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "member",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Gate de signup: 1º usuário vira admin (H10); com convite pendente
        // entra com o role do convite (H4/H5); sem convite, bloqueia (H8).
        // No OAuth o APIError.message vira `?error=sem_convite:<email>` no
        // errorCallbackURL (sem espaços para sobreviver ao slugify).
        before: async (user) => {
          const [{ value: total }] = await db
            .select({ value: count() })
            .from(schema.user);
          if (total === 0) return { data: { ...user, role: "admin" } };
          const inv = await pendingInvite(user.email);
          if (inv) return { data: { ...user, role: inv.role } };
          throw new APIError("FORBIDDEN", {
            message: `sem_convite:${user.email.toLowerCase()}`,
          });
        },
        // Consome o convite que autorizou a criação (aceite implícito, H5).
        after: async (user) => {
          await db
            .update(schema.invite)
            .set({ acceptedAt: new Date() })
            .where(
              and(
                eq(schema.invite.email, user.email.toLowerCase()),
                isNull(schema.invite.acceptedAt),
              ),
            );
        },
      },
    },
  },
  plugins: [nextCookies()],
});
