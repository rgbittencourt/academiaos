import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

type Citation = { referenceNumber: number; articleId: number; articleTitle: string; sourceText: string; claim: string };
type SynthesisExportInput = { projectName: string; content: string; citations: Citation[] };

function cleanFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").toLowerCase() || "sintese-academiaos";
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function latexEscape(value: string) {
  return value.replace(/([#$%&_{}~^\\])/g, "\\$1").replace(/\\~/g, "\\textasciitilde{}").replace(/\\\^/g, "\\textasciicircum{}");
}

export async function downloadSynthesisDocx(input: SynthesisExportInput) {
  const citations = [...input.citations].sort((a, b) => a.referenceNumber - b.referenceNumber);
  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "AcademiaOS · Síntese auditável", heading: HeadingLevel.TITLE }),
        new Paragraph({ children: [new TextRun({ text: `Projeto: ${input.projectName}`, bold: true })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "Síntese", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: input.content }),
        new Paragraph({ text: "Referências e proveniência", heading: HeadingLevel.HEADING_1 }),
        ...citations.flatMap(citation => [
          new Paragraph({ text: `[${citation.referenceNumber}] ${citation.articleTitle}`, heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ children: [new TextRun({ text: "Afirmação: ", bold: true }), new TextRun(citation.claim)] }),
          new Paragraph({ children: [new TextRun({ text: "Trecho de evidência: ", bold: true }), new TextRun({ text: `“${citation.sourceText}”`, italics: true })] }),
        ]),
        new Paragraph({ text: "Gerado pelo AcademiaOS. Os trechos listados preservam a proveniência disponível no corpus do projeto." }),
      ],
    }],
  });
  download(await Packer.toBlob(document), `${cleanFilename(input.projectName)}-sintese-auditavel.docx`);
}

export function downloadSynthesisLatex(input: SynthesisExportInput) {
  const citations = [...input.citations].sort((a, b) => a.referenceNumber - b.referenceNumber);
  const lines = [
    "\\documentclass[12pt]{article}",
    "\\usepackage[utf8]{inputenc}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage[brazil]{babel}",
    "\\usepackage{geometry}",
    "\\geometry{margin=2.5cm}",
    "\\title{AcademiaOS: Síntese auditável}",
    `\\author{${latexEscape(input.projectName)}}`,
    "\\date{}",
    "\\begin{document}",
    "\\maketitle",
    "\\section*{Síntese}",
    latexEscape(input.content),
    "\\section*{Referências e proveniência}",
    "\\begin{enumerate}",
    ...citations.flatMap(citation => [
      `\\item \\textbf{${latexEscape(citation.articleTitle)}}`,
      `\\newline \\textit{Afirmação na síntese:} ${latexEscape(citation.claim)}`,
      `\\newline \\textit{Trecho de evidência:} “${latexEscape(citation.sourceText)}”`,
    ]),
    "\\end{enumerate}",
    "\\end{document}",
  ];
  download(new Blob([lines.join("\n\n")], { type: "application/x-tex;charset=utf-8" }), `${cleanFilename(input.projectName)}-sintese-auditavel.tex`);
}
