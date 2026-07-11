"use client";

import type { RealtimeStatus } from "@/lib/realtime/use-realtime";

/**
 * Indicador discreto de reconexão — canto inferior, visível só quando o stream
 * caiu e está tentando voltar. Em operação normal ("open") não aparece.
 */
export function RealtimeIndicator({ status }: { status: RealtimeStatus }) {
  if (status !== "reconnecting") return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 max-md:bottom-[calc(60px+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2 rounded-pill border border-line-field-strong bg-surface-raised px-3 py-1.5 text-[12px] text-fg-5 shadow-brand">
        <span className="size-1.5 animate-pulse rounded-full bg-[#f2994a]" />
        Reconectando…
      </div>
    </div>
  );
}
