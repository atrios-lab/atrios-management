// Upload direto do browser para o Vercel Blob (design D1) — este handler só
// troca tokens; o arquivo não passa pela função (evita o limite de body).

import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ACCEPTED_FILE_TYPES, MAX_FILE_BYTES } from "@/lib/document-constants";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) throw new Error("Sessão expirada.");
        return {
          allowedContentTypes: [...ACCEPTED_FILE_TYPES],
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
        };
      },
      // O documento é criado pela server action após o upload; nada a fazer aqui.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha no upload." },
      { status: 400 },
    );
  }
}
