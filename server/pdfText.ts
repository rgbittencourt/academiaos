import { PDFParse } from "pdf-parse";

export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export type PdfExtraction = {
  text: string;
  pageCount: number | null;
};

export function validatePdfBuffer(buffer: Buffer) {
  if (!buffer.length) throw new Error("O arquivo PDF está vazio.");
  if (buffer.byteLength > MAX_PDF_BYTES) throw new Error("O PDF ultrapassa o limite de 10 MiB.");
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("O arquivo enviado não possui uma assinatura PDF válida.");
}

export async function extractPdfText(buffer: Buffer): Promise<PdfExtraction> {
  validatePdfBuffer(buffer);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    // O parser transfere o buffer ao mecanismo de leitura. As operações precisam
    // ocorrer em sequência para que o mesmo arquivo não seja transferido duas vezes.
    const info = await parser.getInfo();
    const textResult = await parser.getText();
    const text = textResult.text.trim();
    if (!text) throw new Error("Não foi possível extrair texto legível deste PDF. O documento pode ser digitalizado como imagem.");
    return { text, pageCount: typeof info.total === "number" ? info.total : null };
  } finally {
    await parser.destroy();
  }
}
