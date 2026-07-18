// Renderização dos dois PDFs do diagnóstico (pdfkit, no servidor). Os
// renderizadores NÃO compõem texto: desenham exclusivamente as strings dos
// documentos montados em relatorio-doc.ts — é isso que permite testar a regra
// editorial sem parsear PDF.
//
// Cliente: azul, sóbrio, pronto para enviar. Interno: vermelho, com marca
// d'água em TODAS as páginas — quem bate o olho na miniatura sabe qual é qual.

import PDFDocument from "pdfkit";
import type {
  ApontamentoCliente,
  DocCliente,
  DocInterno,
} from "./relatorio-doc";

const AZUL = "#1e3a5f";
const VERMELHO = "#7f1d1d";
const VERMELHO_VIVO = "#b91c1c";
const CINZA_TXT = "#555555";
const BORDA = "#dde3ea";
const STATUS_COR = {
  adequado: "#2e7d32",
  atencao: "#e65100",
  critico: "#c62828",
} as const;
const PESO_COR: Record<number, string> = {
  3: "#c62828",
  2: "#e65100",
  1: "#8a8f98",
};

const M = 48;

/** Fontes padrão (WinAnsi) não têm emoji/≤/≥ — normaliza para o PDF. */
function t(s: string): string {
  return s
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}]/gu, "")
    .replace(/\u{FE0F}/gu, "")
    .trim();
}

interface Ctx {
  doc: PDFKit.PDFDocument;
  done: Promise<Buffer>;
  W: number;
  ensure: (h: number) => void;
}

function criarDoc(): Ctx {
  const doc = new PDFDocument({ size: "A4", margin: M });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  const W = doc.page.width - 2 * M;
  const bottom = () => doc.page.height - M - 24;
  const ensure = (h: number) => {
    if (doc.y + h > bottom()) doc.addPage();
  };
  return { doc, done, W, ensure };
}

function cabecalho(
  ctx: Ctx,
  cor: string,
  logo: Buffer,
  titulo: string,
  subtitulo: string,
  direita: string,
) {
  const { doc, W } = ctx;
  doc.rect(0, 0, doc.page.width, 108).fill(cor);
  doc.image(logo, M, 22, { height: 34 });
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(t(titulo), M, 64)
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#e3d8d8")
    .text(t(subtitulo), M, 84, { width: W - 110 });
  doc.text(t(direita), M, 84, { width: W, align: "right" });
  doc.y = 130;
  doc.x = M;
}

function tituloSecao(ctx: Ctx, cor: string, texto: string) {
  const { doc, W, ensure } = ctx;
  ensure(40);
  doc.moveDown(0.6);
  doc
    .fillColor(cor)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(t(texto), M, doc.y, { width: W });
  doc.moveDown(0.4);
}

function paragrafo(
  ctx: Ctx,
  texto: string,
  opts: { size?: number; cor?: string; font?: string } = {},
) {
  const { doc, W, ensure } = ctx;
  const font = opts.font ?? "Helvetica";
  const size = opts.size ?? 9.5;
  doc.font(font).fontSize(size);
  ensure(doc.heightOfString(t(texto), { width: W, lineGap: 1.5 }) + 6);
  // Reaplica a fonte após o ensure: uma quebra de página dispara a marca
  // d'água (pageAdded), que troca a fonte corrente do documento.
  doc
    .font(font)
    .fontSize(size)
    .fillColor(opts.cor ?? "#333333")
    .text(t(texto), M, doc.y, { width: W, lineGap: 1.5 });
  doc.moveDown(0.35);
}

/* ---- Blocos compartilhados (prazo, veredito) ------------------------------ */

function blocoPrazo(
  ctx: Ctx,
  corTitulo: string,
  prazo: { titulo: string; linhas: string[]; vencido: boolean },
) {
  const { doc, W, ensure } = ctx;
  tituloSecao(ctx, corTitulo, prazo.titulo);
  const cor = prazo.vencido ? "#c62828" : "#2e7d32";
  const bg = prazo.vencido ? "#fdecea" : "#eaf5ea";
  const texto = prazo.linhas.map(t).join("\n");
  doc.font("Helvetica").fontSize(9.5);
  const h = doc.heightOfString(texto, { width: W - 24, lineGap: 2.5 }) + 20;
  ensure(h + 8);
  const y = doc.y;
  doc.rect(M, y, W, h).fill(bg);
  doc.rect(M, y, 4, h).fill(cor);
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#333333")
    .text(texto, M + 14, y + 10, { width: W - 24, lineGap: 2.5 });
  doc.y = y + h + 10;
  doc.x = M;
}

function blocoVeredito(
  ctx: Ctx,
  corTitulo: string,
  veredito: DocCliente["veredito"],
) {
  const { doc, W, ensure } = ctx;
  tituloSecao(ctx, corTitulo, veredito.titulo);
  ensure(76);
  doc
    .fillColor(STATUS_COR[veredito.statusGeralKey])
    .font("Helvetica-Bold")
    .fontSize(30)
    .text(`${veredito.scoreGeral}%`, M, doc.y, { width: W, align: "center" });
  doc
    .fillColor(CINZA_TXT)
    .font("Helvetica")
    .fontSize(9)
    .text(
      t(`${veredito.statusGeral} · ${veredito.escopo} ${veredito.legenda}`),
      { width: W, align: "center" },
    );
  doc.moveDown(0.8);
  for (const e of veredito.etapas) {
    ensure(34);
    const y = doc.y;
    doc
      .fillColor("#333333")
      .font("Helvetica")
      .fontSize(9)
      .text(t(e.titulo), M, y, { width: W - 110 });
    doc
      .fillColor(STATUS_COR[e.statusKey])
      .font("Helvetica-Bold")
      .text(`${e.status}  ${e.score}%`, M + W - 105, y, {
        width: 105,
        align: "right",
      });
    const by = y + 14;
    doc.roundedRect(M, by, W, 8, 4).fill("#e9edf2");
    if (e.score > 0)
      doc
        .roundedRect(M, by, Math.max(8, (W * e.score) / 100), 8, 4)
        .fill(STATUS_COR[e.statusKey]);
    doc.y = by + 16;
    doc.x = M;
  }
}

/* ---- Apontamento do cliente (caixa de 4 partes) --------------------------- */

function caixaApontamento(ctx: Ctx, a: ApontamentoCliente) {
  const { doc, W, ensure } = ctx;
  const wIn = W - 24;
  const partes: { texto: string; font: string; size: number; cor: string }[] = [
    {
      texto: `${a.pesoLabel} · ${t(a.titulo)}`,
      font: "Helvetica-Bold",
      size: 9.5,
      cor: "#222222",
    },
    { texto: t(a.exigencia), font: "Helvetica", size: 9, cor: "#444444" },
    { texto: t(a.situacao), font: "Helvetica-Bold", size: 9, cor: "#222222" },
    {
      texto: `Consequência: ${t(a.consequencia)}`,
      font: "Helvetica",
      size: 9,
      cor: "#444444",
    },
  ];
  if (a.nota)
    partes.push({
      texto: `Observação: ${t(a.nota)}`,
      font: "Helvetica-Oblique",
      size: 8.5,
      cor: "#666666",
    });
  const alturas = partes.map((p) => {
    doc.font(p.font).fontSize(p.size);
    return doc.heightOfString(p.texto, { width: wIn, lineGap: 1.2 });
  });
  const boxH = alturas.reduce((s, h) => s + h, 0) + partes.length * 4 + 14;
  ensure(boxH + 6);
  const y = doc.y;
  doc.rect(M, y, W, boxH).strokeColor(BORDA).lineWidth(0.8).stroke();
  doc.rect(M, y, 3.5, boxH).fill(PESO_COR[a.peso]);
  let cy = y + 8;
  partes.forEach((p, i) => {
    doc
      .fillColor(p.cor)
      .font(p.font)
      .fontSize(p.size)
      .text(p.texto, M + 12, cy, { width: wIn, lineGap: 1.2 });
    cy += alturas[i] + 4;
  });
  doc.y = y + boxH + 6;
  doc.x = M;
}

/* ---- Relatório do CLIENTE ------------------------------------------------- */

export function gerarPdfCliente(
  docCliente: DocCliente,
  logo: Buffer,
): Promise<Buffer> {
  const ctx = criarDoc();
  const { doc, W } = ctx;
  const d = docCliente;

  doc.rect(0, 0, doc.page.width, 108).fill(AZUL);
  doc.image(logo, M, 22, { height: 34 });
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(t(d.capa.titulo), M, 64)
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#d8e0ea")
    .text(t(d.capa.subtitulo), M, 84, { width: W - 130 });
  doc.text(t(d.capa.emitidoEm), M, 84, { width: W, align: "right" });
  doc.y = 130;
  doc.x = M;

  doc
    .fillColor(AZUL)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(t(d.capa.serventia), { width: W });
  doc.moveDown(0.3);
  paragrafo(ctx, `${d.capa.local}  ·  ${d.capa.classe}`, { cor: CINZA_TXT });
  paragrafo(ctx, d.capa.ressalva, {
    size: 8.5,
    cor: "#777777",
    font: "Helvetica-Oblique",
  });

  blocoPrazo(ctx, AZUL, d.prazo);
  blocoVeredito(ctx, AZUL, d.veredito);

  tituloSecao(ctx, AZUL, d.oQueFalta.titulo);
  paragrafo(ctx, d.oQueFalta.introducao, { size: 9, cor: CINZA_TXT });
  doc.moveDown(0.2);
  if (d.oQueFalta.vazio) paragrafo(ctx, d.oQueFalta.vazio, { cor: CINZA_TXT });
  for (const etapa of d.oQueFalta.etapas) {
    ctx.ensure(36);
    doc.moveDown(0.4);
    doc
      .fillColor("#222222")
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .text(t(etapa.titulo), M, doc.y, { width: W });
    doc.moveDown(0.3);
    for (const a of etapa.apontamentos) caixaApontamento(ctx, a);
  }

  tituloSecao(ctx, AZUL, d.emJogo.titulo);
  for (const p of d.emJogo.paragrafos) paragrafo(ctx, p, { cor: "#333333" });

  tituloSecao(ctx, AZUL, d.proximoPasso.titulo);
  paragrafo(ctx, d.proximoPasso.texto, { cor: "#333333" });

  ctx.ensure(30);
  doc.moveDown(0.8);
  doc
    .fillColor("#888888")
    .font("Helvetica")
    .fontSize(8)
    .text(t(d.rodape), M, doc.y, { width: W, align: "center" });

  doc.end();
  return ctx.done;
}

/* ---- Relatório INTERNO ---------------------------------------------------- */

function estamparMarcaDagua(doc: PDFKit.PDFDocument, texto: string) {
  const { width, height } = doc.page;
  const x = doc.x;
  const y = doc.y;
  doc.save();
  doc.rotate(-35, { origin: [width / 2, height / 2] });
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor(VERMELHO_VIVO)
    .fillOpacity(0.11)
    .text(t(texto).replace(". ", ".\n"), width / 2 - 280, height / 2 - 46, {
      width: 560,
      align: "center",
      lineGap: 10,
    });
  doc.restore();
  doc.fillOpacity(1);
  doc.x = x;
  doc.y = y;
}

export function gerarPdfInterno(
  docInterno: DocInterno,
  logo: Buffer,
): Promise<Buffer> {
  const ctx = criarDoc();
  const { doc, W, ensure } = ctx;
  const d = docInterno;

  // Marca d'água em TODAS as páginas: primeira agora, demais no pageAdded.
  estamparMarcaDagua(doc, d.marcaDagua);
  doc.on("pageAdded", () => {
    doc.x = M;
    doc.y = doc.page.margins.top;
    estamparMarcaDagua(doc, d.marcaDagua);
  });

  cabecalho(
    ctx,
    VERMELHO,
    logo,
    d.capa.titulo,
    d.capa.subtitulo,
    d.capa.emitidoEm,
  );

  // Faixa de aviso logo abaixo do cabeçalho: inconfundível na miniatura.
  doc.rect(0, 108, doc.page.width, 24).fill(VERMELHO_VIVO);
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(t(d.aviso), M, 115, { width: W, align: "center" });
  doc.y = 150;
  doc.x = M;

  doc
    .fillColor(VERMELHO)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(t(d.capa.serventia), { width: W });
  doc.moveDown(0.3);
  for (const linha of d.capa.identificacao)
    paragrafo(ctx, linha, { cor: CINZA_TXT });
  paragrafo(ctx, d.capa.classe, { cor: CINZA_TXT });
  paragrafo(ctx, d.capa.subclasse, {
    cor: "#333333",
    font: "Helvetica-Bold",
    size: 9,
  });
  paragrafo(ctx, d.capa.ressalva, {
    size: 8.5,
    cor: "#777777",
    font: "Helvetica-Oblique",
  });
  if (d.capa.parametrosTecnicos)
    paragrafo(ctx, d.capa.parametrosTecnicos, { size: 8.5, cor: "#777777" });

  blocoPrazo(ctx, VERMELHO, d.prazo);
  blocoVeredito(ctx, VERMELHO, d.veredito);

  tituloSecao(ctx, VERMELHO, d.execucao.titulo);
  paragrafo(ctx, d.execucao.introducao, { size: 9, cor: CINZA_TXT });
  if (d.execucao.vazio) paragrafo(ctx, d.execucao.vazio, { cor: CINZA_TXT });
  for (const etapa of d.execucao.etapas) {
    ensure(44);
    doc.moveDown(0.5);
    doc
      .fillColor("#222222")
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .text(t(etapa.titulo), M, doc.y, { width: W });
    paragrafo(ctx, etapa.totais, { size: 8.5, cor: "#666666" });
    for (const a of etapa.apontamentos) {
      // Bloco fluido (o roteiro pode ser longo): título com filete do peso,
      // partes do cliente, depois o miolo interno.
      ensure(60);
      doc.moveDown(0.35);
      const y0 = doc.y;
      doc
        .fillColor("#222222")
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(`${a.pesoLabel} · ${t(a.titulo)}`, M + 10, y0, { width: W - 10 });
      doc
        .fillColor("#888888")
        .font("Helvetica")
        .fontSize(8)
        .text(t(a.meta), M + 10, doc.y + 2, { width: W - 10 });
      doc.rect(M, y0, 3.5, doc.y - y0 + 4).fill(PESO_COR[a.peso]);
      doc.y += 6;
      doc.x = M;
      paragrafo(ctx, a.exigencia, { size: 9, cor: "#444444" });
      paragrafo(ctx, a.situacao, {
        size: 9,
        cor: "#222222",
        font: "Helvetica-Bold",
      });
      paragrafo(ctx, `Consequência: ${a.consequencia}`, {
        size: 9,
        cor: "#444444",
      });
      if (a.nota)
        paragrafo(ctx, `Observação: ${a.nota}`, {
          size: 8.5,
          cor: "#666666",
          font: "Helvetica-Oblique",
        });
      if (a.pendencia)
        paragrafo(ctx, a.pendencia, {
          size: 8.5,
          cor: VERMELHO_VIVO,
          font: "Helvetica-Bold",
        });
      paragrafo(ctx, `${a.roteiroTitulo} (${a.natureza}):`, {
        size: 9,
        cor: VERMELHO,
        font: "Helvetica-Bold",
      });
      paragrafo(ctx, a.roteiro, { size: 9, cor: "#333333" });
      paragrafo(ctx, `Artefato: ${a.artefato}`, { size: 8.5, cor: "#555555" });
      paragrafo(ctx, `${a.esforco} ${a.modeloTrabalho}`, {
        size: 8.5,
        cor: "#555555",
      });
      if (a.capex)
        paragrafo(ctx, a.capex, {
          size: 8.5,
          cor: "#e65100",
          font: "Helvetica-Bold",
        });
      const yFim = doc.y;
      doc
        .moveTo(M, yFim)
        .lineTo(M + W, yFim)
        .strokeColor(BORDA)
        .lineWidth(0.6)
        .stroke();
      doc.moveDown(0.4);
      doc.x = M;
    }
  }

  tituloSecao(ctx, VERMELHO, d.ordemExecucao.titulo);
  paragrafo(ctx, d.ordemExecucao.nota, { size: 8.5, cor: "#666666" });
  for (const passo of d.ordemExecucao.passos)
    paragrafo(ctx, passo, { size: 9, cor: "#333333" });

  tituloSecao(ctx, VERMELHO, d.capexLista.titulo);
  paragrafo(ctx, d.capexLista.nota, { size: 8.5, cor: "#666666" });
  if (d.capexLista.vazio)
    paragrafo(ctx, d.capexLista.vazio, { cor: CINZA_TXT });
  for (const item of d.capexLista.itens)
    paragrafo(ctx, `• ${item}`, { size: 9, cor: "#333333" });

  tituloSecao(ctx, VERMELHO, d.totais.titulo);
  for (const linha of d.totais.linhas)
    paragrafo(ctx, linha, { size: 9, cor: "#333333" });

  if (d.identidade) {
    tituloSecao(ctx, VERMELHO, d.identidade.titulo);
    paragrafo(ctx, d.identidade.nota, { size: 8.5, cor: "#666666" });
    for (const item of d.identidade.itens) {
      ensure(50);
      doc.moveDown(0.3);
      paragrafo(ctx, item.titulo, {
        size: 9.5,
        cor: "#222222",
        font: "Helvetica-Bold",
      });
      paragrafo(ctx, item.descricao, { size: 8.5, cor: "#444444" });
      paragrafo(ctx, item.argumento, {
        size: 8,
        cor: "#555555",
        font: "Helvetica-Oblique",
      });
      paragrafo(ctx, item.situacao, { size: 8, cor: "#888888" });
    }
  }

  ensure(30);
  doc.moveDown(0.8);
  doc
    .fillColor("#888888")
    .font("Helvetica")
    .fontSize(8)
    .text(t(d.rodape), M, doc.y, { width: W, align: "center" });

  doc.end();
  return ctx.done;
}
