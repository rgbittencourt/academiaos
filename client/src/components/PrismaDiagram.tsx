import { Button } from "@/components/ui/button";
import { Download, GitBranch } from "lucide-react";

type PrismaCounts = { recordsIdentified: number; recordsScreened: number; recordsExcluded: number; reportsSought: number; reportsAssessed: number; reportsExcluded: number; studiesIncluded: number; source: string };

function escapeXml(value: string) { return value.replace(/[<>&'"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[character] ?? character)); }

function downloadPrismaSvg(projectName: string, counts: PrismaCounts) {
  const rows = [
    ["Registros identificados no corpus", counts.recordsIdentified], ["Registros triados (título e resumo)", counts.recordsScreened], ["Registros excluídos", counts.recordsExcluded], ["Relatórios buscados em texto completo", counts.reportsSought], ["Relatórios avaliados", counts.reportsAssessed], ["Relatórios excluídos", counts.reportsExcluded], ["Estudos incluídos", counts.studiesIncluded],
  ];
  const boxes = rows.map(([label, count], index) => { const y = 38 + index * 88; return `<rect x="70" y="${y}" width="660" height="58" fill="#ffffff" stroke="#0A192F"/><text x="95" y="${y + 25}" font-family="Arial" font-size="15" fill="#0A192F">${escapeXml(String(label))}</text><text x="95" y="${y + 46}" font-family="Georgia" font-size="20" font-weight="bold" fill="#B7791F">n = ${count}</text>${index < rows.length - 1 ? `<path d="M400 ${y + 58} v25" stroke="#B7791F" stroke-width="2"/><path d="M394 ${y + 77} l6 6 6-6" fill="none" stroke="#B7791F" stroke-width="2"/>` : ""}`; }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="690" viewBox="0 0 800 690"><rect width="800" height="690" fill="#F8FAFC"/><text x="70" y="26" font-family="Georgia" font-size="22" font-weight="bold" fill="#0A192F">Fluxo PRISMA — ${escapeXml(projectName)}</text>${boxes}<text x="70" y="670" font-family="Arial" font-size="10" fill="#475569">${escapeXml(counts.source)}</text></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "diagrama-prisma-academiaos.svg"; anchor.click(); URL.revokeObjectURL(url);
}

export function PrismaDiagram({ projectName, counts }: { projectName: string; counts: PrismaCounts }) {
  const rows = [["Identificados", counts.recordsIdentified], ["Triados", counts.recordsScreened], ["Excluídos", counts.recordsExcluded], ["Texto completo", counts.reportsAssessed], ["Incluídos", counts.studiesIncluded]];
  return <section className="mb-5 border border-slate-200 bg-white p-5"><div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-end"><div><p className="text-[10px] font-bold tracking-[.16em] text-amber-700">FLUXO PRISMA</p><h3 className="mt-1 font-reading text-xl font-black text-[#0A192F]">Decisões de triagem, visíveis.</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">O diagrama usa somente registros e decisões documentadas neste projeto; não estima estudos externos.</p></div><Button type="button" size="sm" variant="outline" className="rounded-none border-[#0A192F] text-[#0A192F]" onClick={() => downloadPrismaSvg(projectName, counts)}><Download className="mr-1.5 h-3.5 w-3.5" />Exportar SVG</Button></div><div className="mt-5 grid gap-2 sm:grid-cols-5">{rows.map(([label, count], index) => <div key={String(label)} className="relative border border-slate-200 bg-slate-50 px-3 py-3 text-center"><GitBranch className="mx-auto mb-2 h-3.5 w-3.5 text-amber-700"/><strong className="block font-reading text-2xl text-[#0A192F]">{count}</strong><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>{index < rows.length - 1 && <span className="absolute -right-2 top-1/2 hidden h-px w-4 bg-amber-400 sm:block" />}</div>)}</div><p className="mt-4 text-xs italic text-slate-500">{counts.source}</p></section>;
}
