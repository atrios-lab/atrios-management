import Link from "next/link";
import { ArrowLeftIcon, LockIcon } from "@/components/icons";
import { ghostBtnClass } from "../auth-ui";

export default function SemConvitePage() {
  return (
    <div className="flex max-w-[340px] flex-col items-center gap-3.5 text-center">
      <div className="flex size-[52px] items-center justify-center rounded-full border border-line-field bg-white/5 text-fg-5">
        <LockIcon size={22} />
      </div>
      <span className="text-[19px] font-semibold tracking-[-0.01em] text-fg-hi">
        Este espaço é da Átrios
      </span>
      <p className="text-[13.5px] leading-[1.55] text-fg-5">
        Sua conta não tem convite para este espaço. Peça a um admin do time para
        convidar o seu email.
      </p>
      <Link href="/login" className={`${ghostBtnClass} mt-1`}>
        <ArrowLeftIcon />
        Voltar ao login
      </Link>
    </div>
  );
}
