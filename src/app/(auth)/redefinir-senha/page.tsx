import Link from "next/link";
import { AuthCard, ghostBtnClass } from "../auth-ui";
import { ResetCard } from "./reset-card";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  // better-auth redireciona com ?error=INVALID_TOKEN quando expirado/usado.
  if (!token || error) {
    return (
      <AuthCard className="items-center gap-[13px] px-6 py-[30px] text-center">
        <span className="text-[16.5px] font-semibold tracking-[-0.01em] text-fg-hi">
          Link inválido ou expirado
        </span>
        <p className="max-w-[300px] text-[13px] leading-[1.55] text-fg-5">
          O link de redefinição é de uso único e expira em 60 minutos. Peça um
          novo para continuar.
        </p>
        <Link href="/esqueci-senha" className={ghostBtnClass}>
          Pedir novo link
        </Link>
      </AuthCard>
    );
  }
  return <ResetCard token={token} />;
}
