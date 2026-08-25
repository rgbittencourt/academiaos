import { beforeEach, describe, expect, it, vi } from "vitest";

const parserMocks = vi.hoisted(() => ({
  getInfo: vi.fn(),
  getText: vi.fn(),
  destroy: vi.fn(),
  PDFParse: vi.fn(),
}));

vi.mock("pdf-parse", () => ({
  PDFParse: parserMocks.PDFParse,
}));

import { extractPdfText, validatePdfBuffer } from "./pdfText";

describe("extrator de PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parserMocks.PDFParse.mockImplementation(() => ({
      getInfo: parserMocks.getInfo,
      getText: parserMocks.getText,
      destroy: parserMocks.destroy,
    }));
    parserMocks.getInfo.mockResolvedValue({ total: 2 });
    parserMocks.getText.mockResolvedValue({ text: "Texto integral de regressão." });
    parserMocks.destroy.mockResolvedValue(undefined);
  });

  it("obtém metadados antes do texto para não transferir o mesmo PDF duas vezes", async () => {
    const result = await extractPdfText(Buffer.from("%PDF-1.4\nqa", "utf8"));

    expect(result).toEqual({ text: "Texto integral de regressão.", pageCount: 2 });
    expect(parserMocks.getInfo.mock.invocationCallOrder[0]).toBeLessThan(parserMocks.getText.mock.invocationCallOrder[0]);
    expect(parserMocks.destroy).toHaveBeenCalledOnce();
  });

  it("rejeita arquivos sem a assinatura PDF", () => {
    expect(() => validatePdfBuffer(Buffer.from("arquivo comum", "utf8"))).toThrow("assinatura PDF válida");
  });
});
