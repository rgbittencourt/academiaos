import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MAX_BYTES = 10 * 1024 * 1024;

export function PdfImportDialog({ projectId, article }: { projectId: number; article: any }) {
  const utils = trpc.useUtils(); const [open, setOpen] = useState(false); const [file, setFile] = useState<File | null>(null);
  const importPdf = trpc.cartographer.importArticlePdf.useMutation({ onSuccess: result => { utils.cartographer.projectOverview.invalidate({ projectId }); if (result.status === "ready") { toast.success(`Texto integral extraído: ${result.pageCount ?? "?"} página(s).`); setOpen(false); setFile(null); } else toast.error(result.message); }, onError: error => toast.error(error.message) });
  const submit = () => { if (!file) return; if (file.size > MAX_BYTES) { toast.error("O PDF deve ter no máximo 10 MiB."); return; } if (file.type && file.type !== "application/pdf") { toast.error("Selecione um arquivo PDF."); return; } const reader = new FileReader(); reader.onload = () => { const result = typeof reader.result === "string" ? reader.result.split(",")[1] : ""; if (!result) { toast.error("Não foi possível ler o arquivo."); return; } importPdf.mutate({ projectId, articleId: article.id, filename: file.name, mimeType: "application/pdf", base64: result }); }; reader.onerror = () => toast.error("Não foi possível ler o arquivo."); reader.readAsDataURL(file); };
  const document = article.document;
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline" className="rounded-none border-slate-300 text-slate-700"><Upload className="mr-1.5 h-3.5 w-3.5" />{document?.extractionStatus === "ready" ? "Texto integral" : "Importar PDF"}</Button></DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="font-reading text-xl text-[#0A192F]">Texto integral auditável</DialogTitle><DialogDescription>O arquivo é armazenado com segurança neste artigo. Extraímos texto localmente no servidor e preservamos arquivo, páginas e status da extração.</DialogDescription></DialogHeader>{document?.extractionStatus === "ready" && <div className="border-l-2 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-900"><FileText className="mr-2 inline h-4 w-4" /><strong>{document.originalFilename}</strong> — {document.pageCount ?? "?"} página(s), {document.fullText?.length?.toLocaleString("pt-BR") ?? 0} caracteres extraídos.</div>}<div className="space-y-4 pt-2"><Input type="file" accept="application/pdf,.pdf" onChange={event => setFile(event.target.files?.[0] ?? null)} /><p className="text-xs leading-5 text-slate-500">Somente PDF, até 10 MiB. PDFs escaneados sem camada textual são mantidos, mas sinalizados para OCR externo.</p><Button type="button" className="w-full rounded-none bg-[#0A192F] hover:bg-[#152c4b]" disabled={!file || importPdf.isPending} onClick={submit}>{importPdf.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extraindo texto…</> : <><Upload className="mr-2 h-4 w-4" />Importar e extrair</>}</Button></div></DialogContent></Dialog>;
}
