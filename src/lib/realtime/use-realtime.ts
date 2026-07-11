"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeEvent } from "./types";

export type RealtimeStatus = "connecting" | "open" | "reconnecting";

/**
 * Assina o canal SSE `channel`. Reconecta sozinho (backoff + jitter) após queda
 * ou o corte periódico imposto pelo `maxDuration` da function. Chama `onResync`
 * ao reconectar e ao voltar a aba para o primeiro plano, para cobrir eventos
 * perdidos durante a desconexão. Retorna o estado da conexão para a UI.
 */
export function useRealtime(
  channel: string,
  onEvent?: (event: RealtimeEvent) => void,
  onResync?: () => void,
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  // refs para os callbacks: evitam reabrir o EventSource a cada render.
  const onEventRef = useRef(onEvent);
  const onResyncRef = useRef(onResync);
  onEventRef.current = onEvent;
  onResyncRef.current = onResync;

  useEffect(() => {
    let es: EventSource | null = null;
    let retry = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let everConnected = false;

    const connect = () => {
      if (stopped) return;
      es = new EventSource(
        `/api/realtime?channel=${encodeURIComponent(channel)}`,
      );

      es.onopen = () => {
        retry = 0;
        setStatus("open");
        if (everConnected) onResyncRef.current?.(); // reconexão: ressincroniza
        everConnected = true;
      };

      es.onmessage = (ev) => {
        if (!ev.data) return;
        try {
          onEventRef.current?.(JSON.parse(ev.data) as RealtimeEvent);
        } catch {}
      };

      es.onerror = () => {
        // Assume o reconnect no lugar do EventSource nativo para controlar o
        // backoff (e cobrir o corte de duração da function).
        es?.close();
        setStatus("reconnecting");
        const delay = Math.min(1000 * 2 ** retry, 15_000) + Math.random() * 500;
        retry += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      onResyncRef.current?.(); // primeiro plano: ressincroniza
      if (!es || es.readyState === EventSource.CLOSED) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        connect();
      }
    };

    connect();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      es?.close();
    };
  }, [channel]);

  return status;
}

/**
 * Assina `channel` e dispara `router.refresh()` (debounced) a cada evento —
 * granularidade de página para telas que não precisam de merge fino. Eventos
 * originados pelo próprio usuário (`selfId`) são ignorados: o autor já teve o
 * `revalidatePath` da sua própria mutation.
 */
export function useRealtimeRefresh(
  channel: string,
  selfId?: string,
): RealtimeStatus {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), 300);
  }, [router]);

  const onEvent = useCallback(
    (event: RealtimeEvent) => {
      if (selfId && event.actorId === selfId) return;
      scheduleRefresh();
    },
    [selfId, scheduleRefresh],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useRealtime(channel, onEvent, scheduleRefresh);
}
