import { eq } from "drizzle-orm";
import Link from "next/link";
import { ClockIcon } from "@/components/icons";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AuthCard, ghostBtnClass } from "../../auth-ui";
import { InviteCard } from "./invite-card";

export default async function ConvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invite = await db.query.invite.findFirst({
    where: eq(schema.invite.token, token),
    with: { invitedBy: true },
  });

  // Inexistente, já usado ou expirado → mesma tela (9c), sem vazar qual caso.
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return (
      <AuthCard className="w-[420px] items-center gap-[13px] px-6 py-[30px] text-center">
        <div className="flex size-[46px] items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-warning">
          <ClockIcon />
        </div>
        <span className="text-[16.5px] font-semibold tracking-[-0.01em] text-fg-hi">
          Convite expirado ou já usado
        </span>
        <p className="max-w-[300px] text-[13px] leading-[1.55] text-fg-5">
          Peça a um admin da Átrios para enviar um novo convite para o seu
          email.
        </p>
        <Link href="/login" className={ghostBtnClass}>
          Voltar ao login
        </Link>
      </AuthCard>
    );
  }

  return (
    <InviteCard
      token={token}
      email={invite.email}
      inviter={invite.invitedBy?.name ?? null}
      oauthError={error ?? null}
    />
  );
}
