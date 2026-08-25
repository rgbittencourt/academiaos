import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

export type ManuscriptExportSection = {
  id: string;
  heading: string;
  content: string;
  source: "method" | "synthesis" | "manual";
};

export type ManuscriptExportInput = {
  title: string;
  abstract?: string;
  keywords?: string;
  sections: ManuscriptExportSection[];
};

function cleanFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").toLowerCase() || "manuscrito-academiaos";
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

function latexParagraphs(value: string) {
  return latexEscape(value.trim()).replace(/\n{2,}/g, "\n\n\\par\n\n").replace(/\n/g, "\\\\\n");
}

function sourceLabel(source: ManuscriptExportSection["source"]) {
  if (source === "method") return "Método do projeto";
  if (source === "synthesis") return "Síntese auditável";
  return "Redação manual";
}

export async function downloadManuscriptDocx(input: ManuscriptExportInput) {
  const metadata = [
    input.abstract?.trim() ? new Paragraph({ text: "Resumo", heading: HeadingLevel.HEADING_1 }) : null,
    input.abstract?.trim() ? new Paragraph({ text: input.abstract.trim() }) : null,
    input.keywords?.trim() ? new Paragraph({ children: [new TextRun({ text: "Palavras-chave: ", bold: true }), new TextRun(input.keywords.trim())] }) : null,
  ].filter(Boolean) as Paragraph[];

  const sections = input.sections.flatMap(section => [
    new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }),
    ...(section.content.trim() ? [new Paragraph({ text: section.content.trim() })] : []),
    new Paragraph({ children: [new TextRun({ text: "Proveniência: ", bold: true }), new TextRun(sourceLabel(section.source))] }),
  ]);

  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ text: input.title.trim() || "Manuscrito sem título", heading: HeadingLevel.TITLE }),
        new Paragraph({ text: "Exportado pelo AcademiaOS · rascunho de trabalho" }),
        ...metadata,
        ...sections,
        new Paragraph({ text: "As seções preservam a origem declarada no workspace do Manuscrito. Verifique referências, métodos e evidências antes da submissão." }),
      ],
    }],
  });

  download(await Packer.toBlob(document), `${cleanFilename(input.title)}-manuscrito.docx`);
}

export function downloadManuscriptLatex(input: ManuscriptExportInput) {
  const lines = [
    "\\documentclass[12pt]{article}",
    "\\usepackage[utf8]{inputenc}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage[brazil]{babel}",
    "\\usepackage{geometry}",
    "\\geometry{margin=2.5cm}",
    `\\title{${latexEscape(input.title.trim() || "Manuscrito sem título")}}`,
    "\\author{AcademiaOS}",
    "\\date{}",
    "\\begin{document}",
    "\\maketitle",
    ...(input.abstract?.trim() ? ["\\begin{abstract}", latexParagraphs(input.abstract), "\\end{abstract}"] : []),
    ...(input.keywords?.trim() ? [`\\noindent\\textbf{Palavras-chave:} ${latexEscape(input.keywords.trim())}`] : []),
    ...input.sections.flatMap(section => [
      `\\section{${latexEscape(section.heading)}}`,
      ...(section.content.trim() ? [latexParagraphs(section.content)] : []),
      `\\paragraph{Proveniência.} ${latexEscape(sourceLabel(section.source))}`,
    ]),
    "\\end{document}",
  ];
  download(new Blob([lines.join("\n\n")], { type: "application/x-tex;charset=utf-8" }), `${cleanFilename(input.title)}-manuscrito.tex`);
}
