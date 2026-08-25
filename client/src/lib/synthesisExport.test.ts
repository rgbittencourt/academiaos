import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const packerToBlob = vi.hoisted(() => vi.fn().mockResolvedValue(new Blob(["documento docx"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })));

vi.mock("docx", () => ({
  Document: vi.fn(),
  HeadingLevel: { TITLE: "TITLE", HEADING_1: "HEADING_1", HEADING_2: "HEADING_2" },
  Packer: { toBlob: packerToBlob },
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
}));

import { downloadSynthesisDocx, downloadSynthesisLatex } from "./synthesisExport";

const synthesis = {
  projectName: "Sono & Cognição",
  content: "A privação de sono reduziu a atenção em estudantes [1].",
  citations: [{ referenceNumber: 1, articleId: 9, articleTitle: "Sono & atenção", sourceText: "A atenção foi reduzida após privação.", claim: "A privação de sono reduziu a atenção." }],
};

describe("synthesisExport", () => {
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

  it("gera um arquivo LaTeX com a síntese, proveniência e caracteres escapados", async () => {
    downloadSynthesisLatex(synthesis);

    expect(downloads).toEqual(["sono-cognicao-sintese-auditavel.tex"]);
    expect(blobs).toHaveLength(1);
    await expect(blobs[0].text()).resolves.toContain("Sono \\& Cognição");
    await expect(blobs[0].text()).resolves.toContain("A privação de sono reduziu a atenção em estudantes [1].");
    await expect(blobs[0].text()).resolves.toContain("Trecho de evidência");
  });

  it("gera um documento DOCX para a síntese auditável", async () => {
    await downloadSynthesisDocx(synthesis);

    expect(packerToBlob).toHaveBeenCalledOnce();
    expect(downloads).toEqual(["sono-cognicao-sintese-auditavel.docx"]);
  });
});
