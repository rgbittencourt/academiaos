import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const packerToBlob = vi.hoisted(() => vi.fn().mockResolvedValue(new Blob(["manuscrito docx"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })));

vi.mock("docx", () => ({
  Document: vi.fn(),
  HeadingLevel: { TITLE: "TITLE", HEADING_1: "HEADING_1" },
  Packer: { toBlob: packerToBlob },
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
}));

import { downloadManuscriptDocx, downloadManuscriptLatex } from "./manuscriptExport";

const manuscript = {
  title: "Sono & Cognição",
  abstract: "Estudo sobre atenção em estudantes.",
  keywords: "sono, cognição",
  sections: [
    { id: "metodo", heading: "Método", content: "Ensaio com seguimento de quatro semanas.", source: "method" as const },
    { id: "resultados", heading: "Resultados", content: "Síntese ligada à literatura [1].", source: "synthesis" as const },
  ],
};

describe("manuscriptExport", () => {
  const blobs: Blob[] = [];
  const downloads: string[] = [];

  beforeEach(() => {
    blobs.length = 0;
    downloads.length = 0;
    packerToBlob.mockClear();
    const anchor = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    anchor.click.mockImplementation(() => downloads.push(anchor.download));
    vi.stubGlobal("URL", { createObjectURL: vi.fn((blob: Blob) => { blobs.push(blob); return "blob:academiaos"; }), revokeObjectURL: vi.fn() });
    vi.stubGlobal("document", { createElement: vi.fn(() => anchor), body: { appendChild: vi.fn() } });
    vi.stubGlobal("window", { setTimeout: vi.fn((callback: () => void) => callback()) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("gera LaTeX com metadados, seções e proveniência declarada", async () => {
    downloadManuscriptLatex(manuscript);

    expect(downloads).toEqual(["sono-cognicao-manuscrito.tex"]);
    await expect(blobs[0].text()).resolves.toContain("Sono \\& Cognição");
    await expect(blobs[0].text()).resolves.toContain("Palavras-chave");
    await expect(blobs[0].text()).resolves.toContain("Síntese auditável");
  });

  it("gera DOCX com o rascunho estruturado", async () => {
    await downloadManuscriptDocx(manuscript);

    expect(packerToBlob).toHaveBeenCalledOnce();
    expect(downloads).toEqual(["sono-cognicao-manuscrito.docx"]);
  });
});
