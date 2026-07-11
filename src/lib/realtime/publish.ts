import { sql } from "drizzle-orm";
import { db } from "@/db";
import { PG_CHANNEL, type RealtimeEvent } from "./types";

/**
 * Publica um evento de mudança no barramento (Postgres NOTIFY). Chamado pelas
 * server actions **após** a gravação. Nunca lança: uma falha de publicação só
 * significa que os outros clientes ressincronizam mais tarde (ao reconectar/
 * refocar), então não pode derrubar a mutação — é só logada.
 */
export async function publish(
  event: Omit<RealtimeEvent, "ts"> & { ts?: number },
): Promise<void> {
  const payload = JSON.stringify({ ...event, ts: event.ts ?? Date.now() });
  try {
    await db.execute(sql`select pg_notify(${PG_CHANNEL}, ${payload})`);
  } catch (err) {
    console.error("[realtime] pg_notify falhou", err);
  }
}
