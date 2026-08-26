import { buildReticulaUrl, deriveReticulaCoordinates } from "@/lib/reticulaCoordinates";
import type { LapisNotebookForm } from "@/lib/lapisNotebook";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

export function ReticulaCoordinatesDialog({ form, workspaceContext, disabled, triggerLabel = "Abrir Retícula com coordenadas do Lapis" }: { form: LapisNotebookForm; workspaceContext?: string; disabled: boolean; triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [coordinates, setCoordinates] = useState(() => deriveReticulaCoordinates({ ...form, workspaceContext }));

  useEffect(() => {
    if (open) setCoordinates(deriveReticulaCoordinates({ ...form, workspaceContext }));
  }, [form.problemStatement, form.researchIdea, form.researchQuestion, form.title, open, workspaceContext]);

  const updateCoordinate = (field: "theme" | "subject" | "discipline", value: string) => {
    setCoordinates(current => ({ ...current, [field]: value }));
  };

  const reticulaUrl = buildReticulaUrl(coordinates);
  const openReticula = () => {
    window.open(reticulaUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
    toast.success("Coordenadas do Lapis enviadas ao Retícula para sua revisão.");
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button type="button" disabled={disabled} variant="outline" className="w-full rounded-none border-amber-300 bg-transparent text-amber-200 hover:bg-amber-300 hover:text-slate-950">
        <span className="inline-flex min-w-0 items-center justify-center gap-2">
          <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="truncate">{triggerLabel}</span>
        </span>
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-reading text-2xl text-[#0A192F]">Coordenadas do Lapis para o Retícula</DialogTitle>
        <DialogDescription>Esta prévia usa o caderno Lapis associado a esta revisão. Revise os três campos antes de abrir o atlas; o Retícula será aberto em outra aba e não executará a busca automaticamente.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2"><Label htmlFor="reticula-theme">Tema central</Label><Input id="reticula-theme" value={coordinates.theme} onChange={event => updateCoordinate("theme", event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="reticula-subject">Assunto</Label><Textarea id="reticula-subject" value={coordinates.subject} onChange={event => updateCoordinate("subject", event.target.value)} className="min-h-24" /></div>
        <div className="space-y-2"><Label htmlFor="reticula-discipline">Disciplina</Label><Input id="reticula-discipline" value={coordinates.discipline} onChange={event => updateCoordinate("discipline", event.target.value)} /><p className="text-xs leading-5 text-slate-500">{coordinates.disciplineRationale}</p></div>
        <div className="border-t border-slate-100 pt-4"><p className="mb-3 text-xs leading-5 text-slate-500">Se o navegador bloquear novas abas, use o link de contingência abaixo para abrir o mesmo atlas com estas coordenadas.</p><div className="flex flex-wrap justify-end gap-2"><a href={reticulaUrl} target="_blank" rel="noopener noreferrer" className="self-center text-xs font-semibold text-amber-800 underline underline-offset-4">Abrir pelo link de contingência</a><Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-none">Cancelar</Button><Button type="button" onClick={openReticula} className="rounded-none bg-[#0A192F] hover:bg-[#152c4b]"><ExternalLink className="mr-2 h-4 w-4" />Abrir Retícula com coordenadas</Button></div></div>
      </div>
    </DialogContent>
  </Dialog>;
}
