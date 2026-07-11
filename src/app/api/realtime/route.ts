// Stream SSE de eventos de realtime. Cada conexão abre um cliente pg dedicado
// (fora do Pool do Drizzle, que recicla conexões) com LISTEN no canal físico e
// repassa ao cliente só os eventos do canal lógico assinado.

import { Client } from "pg";
import { auth } from "@/lib/auth";
import { PG_CHANNEL, type RealtimeEvent } from "@/lib/realtime/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Teto de execução na Vercel; o cliente reconecta sozinho quando o stream cai.
export const maxDuration = 300;

const HEARTBEAT_MS = 25_000;

export async function GET(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const channel = new URL(request.url).searchParams.get("channel");
  if (!channel) return new Response("Missing channel", { status: 400 });

  const encoder = new TextEncoder();
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | undefined;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controlador já fechado — ignora
        }
      };

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        request.signal.removeEventListener("abort", onAbort);
        try {
          await client.end();
        } catch {}
        try {
          controller.close();
        } catch {}
      };

      const onAbort = () => void cleanup();
      request.signal.addEventListener("abort", onAbort);

      client.on("notification", (msg) => {
        if (!msg.payload) return;
        let event: RealtimeEvent;
        try {
          event = JSON.parse(msg.payload) as RealtimeEvent;
        } catch {
          return;
        }
        if (event.channel !== channel) return; // não vaza outros canais
        send(`data: ${msg.payload}\n\n`);
      });
      client.on("error", () => void cleanup());

      try {
        await client.connect();
        await client.query(`LISTEN ${PG_CHANNEL}`);
      } catch {
        await cleanup();
        return;
      }

      send(": connected\n\n");
      heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // desliga o buffering de proxies (nginx) para o stream fluir na hora
      "X-Accel-Buffering": "no",
    },
  });
}
