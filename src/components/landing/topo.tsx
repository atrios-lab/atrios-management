import Link from "next/link";
import { cn } from "@/lib/cn";
import { showPartners } from "@/lib/landing/config";
import { LogoAtriosLockup } from "./logo-atrios-lockup";

// Topo compartilhado das páginas públicas (`/` e `/diagnostico`): logo Átrios
// + logos de parceria sob a mesma flag (ver lib/landing/config).

function LogoAtrios() {
  // O lockup traz a cor por currentColor, então dispensa o PNG escuro com
  // filter:invert(1) que existia aqui, e não perde nitidez ao escalar.
  return (
    <LogoAtriosLockup className="h-[30px] w-auto text-white md:h-[34px]" />
  );
}

function Parceiros() {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-fg-9">
        Realização / apoio
      </span>
      <div className="flex gap-1.5">
        <span className="flex h-[26px] items-center rounded-[6px] bg-[#f4f5f7] px-2">
          {/* biome-ignore lint/performance/noImgElement: asset local */}
          <img
            src="/landing/arpen-rn.png"
            alt="Arpen/RN"
            className="h-4 w-auto"
          />
        </span>
        <span className="flex h-[26px] items-center rounded-[6px] bg-[#f4f5f7] px-2">
          {/* biome-ignore lint/performance/noImgElement: asset local */}
          <img
            src="/landing/anoreg-rn.png"
            alt="Anoreg/RN"
            className="h-[13px] w-auto"
          />
        </span>
      </div>
    </div>
  );
}

/**
 * @param comoLink na home a logo não leva a lugar nenhum (já estamos nela);
 * na `/diagnostico` ela volta para o site institucional.
 */
export function Topo({
  comoLink = false,
  className,
}: {
  comoLink?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      {comoLink ? (
        <Link href="/" aria-label="Átrios — página inicial">
          <LogoAtrios />
        </Link>
      ) : (
        <LogoAtrios />
      )}
      {showPartners() && <Parceiros />}
    </div>
  );
}
