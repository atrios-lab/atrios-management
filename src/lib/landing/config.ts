// Configuração compartilhada das páginas públicas (`/` institucional e
// `/diagnostico`). Fonte ÚNICA: as duas páginas leem daqui — nenhuma delas
// pode ler `process.env` ou repetir um contato por conta própria.

/**
 * Logos de parceria (Arpen/RN, Anoreg/RN) só quando a parceria estiver
 * formalizada. Função (e não const de módulo) para ser lida a cada render e
 * testável sem recarregar o módulo. Default: oculto.
 */
export function showPartners(): boolean {
  return process.env.LANDING_SHOW_PARTNERS === "true";
}

export const CONTATO_EMAIL = "contato@atrioss.com";
export const WHATSAPP_NUMERO = "558440420438";
export const WHATSAPP_EXIBICAO = "+55 84 4042-0438";

/** Link do WhatsApp com mensagem pré-preenchida (opcional). */
export function whatsappUrl(texto?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMERO}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

/**
 * Origem pública do site — base das URLs absolutas de metadata (OG/Twitter),
 * do sitemap e do robots.
 *
 * `www`, não o apex: o apex responde 308 pro www, então uma og:image no apex
 * custaria um salto a mais e o canonical divergiria do endereço real.
 *
 * VERCEL_URL só entra no preview. Ela existe em produção também, apontando pra
 * URL do *deployment* — que fica atrás da proteção de acesso e responde 302 pra
 * quem não está logado. Usá-la aqui fazia o crawler do WhatsApp buscar a
 * og:image nesse endereço, tomar 302 e montar o card sem imagem.
 */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://www.atrioss.com";
}
