/** Evento de mudança transmitido por realtime (payload pequeno — só o "sino"). */
export interface RealtimeEvent {
  /** Canal lógico (ex.: "product:<id>", "cofre"). */
  channel: string;
  /** Tipo do evento (ex.: "card.updated", "changed"). */
  type: string;
  /** Id do recurso afetado, quando aplicável. */
  id?: string;
  /** Usuário que causou a mudança — usado para suprimir o eco no próprio autor. */
  actorId?: string;
  /** Epoch em ms de quando o evento foi publicado. */
  ts: number;
}

/** Canal Postgres físico usado por LISTEN/NOTIFY (um só, canal lógico vai no payload). */
export const PG_CHANNEL = "realtime";

/** Constrói os nomes dos canais lógicos. */
export const channels = {
  product: (productId: string) => `product:${productId}`,
  cofre: "cofre",
  time: "time",
  diagnosticos: "diagnosticos",
  documents: (productId: string) => `documents:${productId}`,
} as const;
