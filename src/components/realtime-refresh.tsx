"use client";

import { useRealtimeRefresh } from "@/lib/realtime/use-realtime";
import { RealtimeIndicator } from "./realtime-indicator";

/**
 * Drop-in para telas RSC: assina `channel` e recarrega os dados da página a cada
 * evento de outro usuário (via `router.refresh()`), sem reload manual. Renderiza
 * só o indicador de reconexão; não afeta o layout.
 */
export function RealtimeRefresh({
  channel,
  selfId,
}: {
  channel: string;
  selfId?: string;
}) {
  const status = useRealtimeRefresh(channel, selfId);
  return <RealtimeIndicator status={status} />;
}
