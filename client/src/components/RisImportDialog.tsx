import { FileUp, Loader2, ShieldCheck } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export function RisImportDialog({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const preview = trpc.cartographer.previewRisImport.useMutation({ onError: error => toast.error(error.message) });
  const confirm = trpc.cartographer.confirmRisImport.useMutation({
    onSuccess: result => {
      utils.cartographer.projectOverview.invalidate({ projectId });
      toast.success(`${result.importedCount} referência${result.importedCount === 1 ? " importada" : "s importadas"} do Retícula.`);
      setOpen(false); setContent(""); setFilename(""); setSelected([]); setAcknowledged(false); preview.reset();
    },
    onError: error => toast.error(error.message),
  });
  useEffect(() => {
    if (preview.data) setSelected(preview.data.records.filter(record => record.status === "ready").map(record => record.externalId));
  }, [preview.data]);
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.ris$/i.test(file.name)) { toast.error("Selecione um arquivo com extensão .ris."); return; }
    if (file.size > 2_000_000) { toast.error("O arquivo excede o limite de 2 MB."); return; }
    const text = await file.text();
    setContent(text); setFilename(file.name); setAcknowledged(false); setSelected([]);
    preview.mutate({ projectId, content: text, filename: file.name });
  };
  const toggle = (externalId: string) => setSelected(current => current.includes(externalId) ? current.filter(id => id !== externalId) : [...current, externalId]);
  const readyCount = preview.data?.candidateCount ?? 0;
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="w-full rounded-none border-white/35 bg-transparent text-white hover:bg-white hover:text-[#0A192F]"><FileUp className="mr-2 h-4 w-4" />Importar RIS</Button></DialogTrigger><DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle className="font-reading text-xl text-[#0A192F]">Importar referências do Retícula</DialogTitle><DialogDescription>O arquivo é apenas analisado nesta etapa. Nenhuma referência será adicionada sem sua seleção e confirmação explícita.</DialogDescription></DialogHeader><div className="space-y-5 py-2"><div className="space-y-2"><Label htmlFor="reticula-ris">Arquivo RIS exportado pelo Retícula</Label><Input id="reticula-ris" type="file" accept=".ris,application/x-research-info-systems,text/plain" onChange={upload} disabled={preview.isPending || confirm.isPending} /><p className="text-xs leading-5 text-slate-500">Limite de 2 MB e 500 registros. O AcademiaOS guarda o hash, o nome do arquivo e a proveniência, não uma cópia do arquivo RIS.</p></div>{preview.isPending && <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Lendo metadados e procurando duplicatas no projeto…</div>}{preview.data && <><div className="grid grid-cols-3 gap-px border border-slate-200 bg-slate-200"><div className="bg-white p-3"><p className="text-xl font-black text-[#0A192F]">{preview.data.total}</p><p className="text-[11px] text-slate-500">no arquivo</p></div><div className="bg-white p-3"><p className="text-xl font-black text-emerald-700">{readyCount}</p><p className="text-[11px] text-slate-500">disponíveis</p></div><div className="bg-white p-3"><p className="text-xl font-black text-amber-700">{preview.data.duplicateCount}</p><p className="text-[11px] text-slate-500">para revisar</p></div></div><ScrollArea className="h-64 border border-slate-200"><div className="divide-y divide-slate-100">{preview.data.records.map(record => <label key={record.externalId} className="flex gap-3 p-4 text-sm"><Checkbox checked={selected.includes(record.externalId)} disabled={record.status !== "ready"} onCheckedChange={() => toggle(record.externalId)} /><span className="min-w-0 flex-1"><span className="block font-semibold text-[#0A192F]">{record.title}</span><span className="mt-1 block text-xs text-slate-500">{record.authors.slice(0, 3).join(", ") || "Autoria não informada"}{record.year ? ` · ${record.year}` : ""}</span>{record.reason && <span className="mt-1 block text-xs text-amber-800">{record.reason}</span>}</span></label>)}</div></ScrollArea>{preview.data.provenance.length > 0 && <div className="border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950"><strong>Proveniência detectada:</strong> {preview.data.provenance[0]}</div>}<label className="flex items-start gap-3 border border-slate-200 bg-slate-50 p-4 text-sm leading-5 text-slate-700"><Checkbox checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} /><span><strong>Confirmo a importação para este projeto.</strong> As referências selecionadas serão registradas como descobertas no Retícula e seguirão para minha triagem.</span></label><div className="flex justify-end gap-3"><Button type="button" variant="outline" className="rounded-none" onClick={() => setOpen(false)}>Cancelar</Button><Button type="button" className="rounded-none bg-[#0A192F] hover:bg-[#152c4b]" disabled={!acknowledged || selected.length === 0 || confirm.isPending} onClick={() => confirm.mutate({ projectId, content, filename, selectedExternalIds: selected, acknowledged: true })}>{confirm.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando…</> : <><ShieldCheck className="mr-2 h-4 w-4" />Importar {selected.length} seleção(ões)</>}</Button></div></>}</div></DialogContent></Dialog>;
}
