import { describe, expect, it } from "vitest";
import { POLITICA_VERSAO } from "../legal";
import {
  estadoLink,
  expiracaoPadrao,
  faltantesParaEnvio,
  gerarToken,
  LINK_VALIDADE_DIAS,
  linkAcessivel,
  linkEditavel,
  mensagemFaltantes,
  montarPayloadPublico,
  validarEnquadramento,
  validarRespondente,
} from "./autoavaliacao";

const agora = new Date("2026-09-17T12:00:00Z");
const futuro = new Date("2026-10-17T12:00:00Z");
const passado = new Date("2026-09-01T12:00:00Z");

describe("gerarToken", () => {
  it("gera 32 bytes em base64url, únicos entre chamadas", () => {
    const a = gerarToken();
    const b = gerarToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("expiração padrão soma LINK_VALIDADE_DIAS", () => {
    const exp = expiracaoPadrao(agora);
    expect((exp.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000)).toBe(
      LINK_VALIDADE_DIAS,
    );
  });
});

describe("estadoLink", () => {
  const base = {
    expiraEm: futuro,
    revogadoEm: null,
    iniciadoEm: null,
    enviadoEm: null,
  };

  it("sem linha = não gerado", () => {
    expect(estadoLink(null, agora)).toBe("nao_gerado");
  });
  it("não iniciado quando só gerado", () => {
    expect(estadoLink(base, agora)).toBe("nao_iniciado");
  });
  it("aberto quando a serventia se identificou", () => {
    expect(estadoLink({ ...base, iniciadoEm: passado }, agora)).toBe("aberto");
  });
  it("expirado vence aberto", () => {
    expect(
      estadoLink({ ...base, expiraEm: passado, iniciadoEm: passado }, agora),
    ).toBe("expirado");
  });
  it("enviado vence expirado (o envio já aconteceu)", () => {
    expect(
      estadoLink({ ...base, expiraEm: passado, enviadoEm: passado }, agora),
    ).toBe("enviado");
  });
  it("revogado vence tudo", () => {
    expect(
      estadoLink({ ...base, revogadoEm: agora, enviadoEm: passado }, agora),
    ).toBe("revogado");
  });
  it("acessível/editável por estado", () => {
    expect(linkAcessivel("enviado")).toBe(true);
    expect(linkEditavel("enviado")).toBe(false);
    expect(linkEditavel("aberto")).toBe(true);
    expect(linkAcessivel("revogado")).toBe(false);
    expect(linkAcessivel("expirado")).toBe(false);
    expect(linkAcessivel("nao_gerado")).toBe(false);
  });
});

describe("validarRespondente", () => {
  it("normaliza um respondente válido", () => {
    const { data, errors } = validarRespondente({
      nome: "  Maria Dantas ",
      cargo: "Escrevente",
      email: "MARIA@Cartorio.com.br",
      whatsapp: "84999998888",
      consentimento: true,
    });
    expect(errors).toEqual({});
    expect(data).toEqual({
      nome: "Maria Dantas",
      cargo: "Escrevente",
      email: "maria@cartorio.com.br",
      whatsapp: "(84) 9 9999-8888",
      politicaVersao: POLITICA_VERSAO,
    });
  });

  it("aceita só e-mail ou só WhatsApp", () => {
    expect(
      validarRespondente({ nome: "A", email: "a@b.co", consentimento: true })
        .data?.whatsapp,
    ).toBeNull();
    expect(
      validarRespondente({
        nome: "A",
        whatsapp: "(84) 3222-1111",
        consentimento: true,
      }).data?.email,
    ).toBeNull();
  });

  it("exige nome, algum contato e consentimento", () => {
    const { data, errors } = validarRespondente({ nome: "" });
    expect(data).toBeNull();
    expect(errors.nome).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.whatsapp).toBeDefined();
    expect(errors.consentimento).toBeDefined();
  });

  it("rejeita e-mail e WhatsApp inválidos", () => {
    const { errors } = validarRespondente({
      nome: "A",
      email: "sem-arroba",
      whatsapp: "123",
      consentimento: true,
    });
    expect(errors.email).toBe("Informe um e-mail válido.");
    expect(errors.whatsapp).toContain("DDD");
  });

  it("cargo fora do catálogo vira null", () => {
    const { data } = validarRespondente({
      nome: "A",
      cargo: "Estagiário",
      email: "a@b.co",
      consentimento: true,
    });
    expect(data?.cargo).toBeNull();
  });
});

describe("validarEnquadramento", () => {
  it("aceita classe, subclasse compatível e modelo do catálogo", () => {
    expect(
      validarEnquadramento({ classe: 2, subclasse: "e", modelo: "saas" }),
    ).toEqual({
      data: { classe: 2, subclasse: "E", modelo: "saas" },
      error: null,
    });
  });
  it("rejeita classe fora de 1..3", () => {
    expect(validarEnquadramento({ classe: 4, modelo: "saas" }).data).toBeNull();
  });
  it("rejeita subclasse de outra classe", () => {
    expect(
      validarEnquadramento({ classe: 1, subclasse: "G", modelo: "saas" }).data,
    ).toBeNull();
  });
  it("rejeita modelo desconhecido", () => {
    expect(
      validarEnquadramento({ classe: 1, modelo: "mainframe" }).data,
    ).toBeNull();
  });
});

describe("faltantesParaEnvio", () => {
  it("conta requisitos e identidade não respondidos", () => {
    const f = faltantesParaEnvio(
      ["req-01", "req-02", "req-03"],
      new Set(["req-02"]),
      ["site", "email", "fone"],
      new Set(["site"]),
    );
    expect(f.requisitos).toEqual(["req-01", "req-03"]);
    expect(f.identidade).toEqual(["email", "fone"]);
    expect(f.total).toBe(4);
  });
  it("zero quando tudo respondido", () => {
    expect(
      faltantesParaEnvio(["a"], new Set(["a"]), ["site"], new Set(["site"]))
        .total,
    ).toBe(0);
  });
  it("mensagem no singular e plural", () => {
    expect(mensagemFaltantes(1)).toMatch(/^Falta 1 pergunta/);
    expect(mensagemFaltantes(3)).toMatch(/^Faltam 3 perguntas/);
  });
});

describe("montarPayloadPublico", () => {
  const diag = {
    id: "d1",
    serventia: "1º Ofício",
    municipio: "Natal",
    uf: "RN",
    classe: 1,
    subclasse: null,
    modeloSolucao: "saas" as const,
    escopo: "inicial" as const,
    contatoNome: "Fulano",
    contatoEmail: "fulano@x.com",
    contatoWhatsapp: "(84) 9 9999-0000",
    criadoPorId: "u1",
  };
  const requisitos = [
    {
      id: "req-01",
      etapa: 1,
      perguntaSimples: "Pergunta simples 1?",
      perguntaTecnica: "Técnica 1",
      refNormativa: "1.1",
      peso: 3,
      apontamentoTitulo: "T",
      apontamentoExigencia: "E",
      apontamentoConsequencia: "C",
      roteiroExecucao: "SEGREDO",
      artefato: "A",
      natureza: "documento",
      esforcoTemplateHoras: "1",
      esforcoServentiaHoras: "2",
      condicoes: null,
    },
    {
      id: "req-02",
      etapa: 1,
      perguntaSimples: "DPO?",
      perguntaTecnica: "DPO técnica",
      refNormativa: "1.1",
      peso: 2,
      roteiroExecucao: "SEGREDO",
      condicoes: { dispensaClasses: [1], dispensaNota: "dispensado" },
    },
  ];
  const identidade = [
    {
      item: "site" as const,
      perguntaSimples: "Tem site?",
      perguntaTecnica: "X",
    },
  ];

  it("projeta só id, etapa e perguntaSimples, e omite dispensados", () => {
    const p = montarPayloadPublico(diag, requisitos, identidade);
    expect(p.requisitos).toEqual([
      { id: "req-01", etapa: 1, perguntaSimples: "Pergunta simples 1?" },
    ]);
    expect(p.identidade).toEqual([
      { item: "site", perguntaSimples: "Tem site?" },
    ]);
    expect(p.diagnostico).toEqual({
      serventia: "1º Ofício",
      municipio: "Natal",
      uf: "RN",
      classe: 1,
      subclasse: null,
      modeloSolucao: "saas",
      escopo: "inicial",
    });
  });

  it("não vaza nenhuma chave interna nem contato", () => {
    const p = montarPayloadPublico(diag, requisitos, identidade);
    const json = JSON.stringify(p);
    for (const chave of [
      "perguntaTecnica",
      "refNormativa",
      "peso",
      "apontamentoTitulo",
      "apontamentoExigencia",
      "apontamentoConsequencia",
      "roteiroExecucao",
      "artefato",
      "natureza",
      "esforcoTemplateHoras",
      "esforcoServentiaHoras",
      "contatoNome",
      "contatoEmail",
      "contatoWhatsapp",
      "criadoPorId",
      "SEGREDO",
      "fulano@x.com",
    ]) {
      expect(json).not.toContain(chave);
    }
  });

  it("sem classe não há requisitos (a serventia declara antes)", () => {
    const p = montarPayloadPublico(
      { ...diag, classe: null },
      requisitos,
      identidade,
    );
    expect(p.requisitos).toEqual([]);
  });
});
