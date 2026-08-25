import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import {
  Bell,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ChevronDown,
  Database,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageSquareText,
  PenLine,
  Puzzle,
  Search,
  Send,
  Settings,
  type LucideIcon,
} from "lucide-react";
import React, { CSSProperties, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";

type AcademyNavigationItem = { label: string; context: string; icon: LucideIcon; path: string; children?: Array<{ label: string; path: string }> };

export const academyNavigationItems: AcademyNavigationItem[] = [
  { label: "Dashboard", context: "Visão do ciclo", icon: LayoutDashboard, path: "/" },
  { label: "Meus Projetos", context: "Cadernos e revisões", icon: FolderKanban, path: "/projects" },
  { label: "Lapis", context: "Ideia e projeto", icon: Lightbulb, path: "/lapis", children: [
    { label: "Lacunas", path: "/lapis#lapis-lacunas" },
    { label: "Originalidade", path: "/lapis#lapis-originalidade" },
    { label: "Editais & grants", path: "/lapis#lapis-editais" },
    { label: "Viabilidade", path: "/lapis#lapis-viabilidade" },
  ] },
  { label: "Literatura", context: "Cartographer", icon: BookOpen, path: "/search", children: [
    { label: "Descoberta semântica", path: "/search" },
    { label: "Biblioteca & duplicatas", path: "/library" },
    { label: "Triagem & PRISMA", path: "/library#cartographer-prisma" },
    { label: "Extração estruturada", path: "/library#cartographer-extracao" },
    { label: "Síntese auditável", path: "/synthesis" },
    { label: "Integridade", path: "/search#cartographer-integridade" },
    { label: "Mapa de citações", path: "/search#cartographer-citacoes" },
  ] },
  { label: "Prereg", context: "Pré-registro guiado", icon: ClipboardCheck, path: "/prereg", children: [
    { label: "Protocolo", path: "/prereg#prereg-protocolo" },
    { label: "Guardrails", path: "/prereg#prereg-guardrails" },
    { label: "Advogado do Diabo", path: "/prereg#prereg-advogado" },
    { label: "Certificado", path: "/prereg#prereg-certificado" },
  ] },
  { label: "Dados & FAIR", context: "Vault", icon: Database, path: "/vault", children: [
    { label: "Ativos & versões", path: "/vault#vault-assets" },
    { label: "Dicionário de dados", path: "/vault#vault-dictionary" },
    { label: "LGPD & CEP/Conep", path: "/vault#vault-governance" },
    { label: "Publicar em repositório", path: "/vault#vault-repository" },
  ] },
  { label: "Qualia", context: "Análise qualitativa", icon: MessageSquareText, path: "/qualia", children: [
    { label: "Corpus & fontes", path: "/qualia#qualia-corpus" },
    { label: "Códigos & excertos", path: "/qualia#qualia-codes" },
    { label: "Sugestões explicáveis", path: "/qualia#qualia-assistance" },
    { label: "Dupla codificação", path: "/qualia#qualia-agreement" },
    { label: "Memos analíticos", path: "/qualia#qualia-memos" },
    { label: "Relatório", path: "/qualia#qualia-report" },
  ] },
  { label: "Analista", context: "Estatística explicável", icon: BarChart3, path: "/analista", children: [
    { label: "Plano & pressupostos", path: "/analista" },
    { label: "Recomendação & código", path: "/analista#analyst-recommendation" },
    { label: "Visualizações", path: "/analista#analyst-visualizations" },
    { label: "Notebooks", path: "/analista#analyst-notebooks" },
  ] },
  { label: "Scriptorium", context: "Escrita rastreável", icon: PenLine, path: "/scriptorium", children: [
    { label: "Manuscrito", path: "/scriptorium#scriptorium-editor" },
    { label: "Versões & diferenças", path: "/scriptorium#scriptorium-diff" },
    { label: "Referências & Zotero", path: "/scriptorium#scriptorium-references" },
    { label: "Revisor & exportação", path: "/scriptorium#scriptorium-review" },
  ] },
  { label: "Publicação", context: "Matchmaker · Vigil", icon: Send, path: "/matchmaker", children: [
    { label: "Matchmaker", path: "/matchmaker" },
    { label: "Vigil", path: "/vigil" },
  ] },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Meus Projetos",
  "/search": "Literatura",
  "/discover": "Literatura",
  "/library": "Literatura",
  "/synthesis": "Literatura",
  "/lapis": "Lapis",
  "/prereg": "Pré-registro",
  "/vault": "Dados & FAIR",
  "/qualia": "Qualia",
  "/analista": "Analista",
  "/scriptorium": "Escrita",
  "/matchmaker": "Publicação",
  "/vigil": "Vigil",
};

const academiaMarkUrl = "/manus-storage/academiaos-mark_b7637ed1.png";
const inovalabLogoUrl = "/manus-storage/academiaos-logo-inovalab-symbol_49878c66.png";
const inovalabSignatureUrl = "/manus-storage/academiaos-logo-inovalab-signature_63f3b02f.png";
const ifscInstitutionalMarkUrl = "/manus-storage/academiaos-logo-ifsc-symbol_e5bb2d03.png";

export function AcademiaCover() {
  const capabilities = [
    { code: "IDE", title: "Projetos mais claros", description: "Da pergunta à viabilidade, com trilha de decisões." },
    { code: "EVD", title: "Evidências rastreáveis", description: "Literatura, dados, métodos e síntese em um fluxo contínuo." },
    { code: "RIG", title: "Rigor que permanece", description: "Pré-registro, análise, escrita e publicação com contexto." },
  ];

  return <main className="min-h-screen bg-[#fbfaf6] text-[#0A192F] lg:grid lg:grid-cols-[1.18fr_0.82fr] xl:grid-cols-[1.25fr_0.75fr]">
    <section className="relative isolate flex min-h-[48vh] overflow-hidden bg-[#0A192F] px-7 py-9 text-[#F8F5EC] sm:px-12 sm:py-12 lg:min-h-screen lg:px-16 lg:py-14 xl:px-20">
      <div className="pointer-events-none absolute -bottom-52 -right-44 h-[40rem] w-[40rem] rounded-full border-[56px] border-[#19365A]/65" />
      <div className="pointer-events-none absolute -bottom-72 -right-8 h-[42rem] w-[42rem] rounded-full border-[1px] border-[#29486A]/70" />
      <div className="relative flex w-full max-w-[78rem] flex-col">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4 sm:gap-x-7">
          <div data-testid="cover-ifsc-signature" className="flex items-center gap-3">
            <img src={ifscInstitutionalMarkUrl} alt="Logotipo do IFSC – Campus Continente" className="h-12 w-10 object-contain brightness-0 invert" />
            <div className="leading-[1.08] text-[#F8F5EC]">
              <p className="text-[11px] font-black uppercase tracking-[-0.01em]">Instituto Federal</p>
              <p className="text-[10px] font-semibold">Santa Catarina</p>
              <p className="mt-1 text-[8px] font-medium tracking-wide text-slate-300">Câmpus Florianópolis–Continente</p>
            </div>
          </div>
          <div aria-hidden className="hidden h-10 w-px bg-[#D3B56E]/50 sm:block" />
          <div data-testid="cover-inovalab-signature" className="flex items-center">
            <img src={inovalabSignatureUrl} alt="Logotipo completo do INOVALAB" className="h-12 w-[11.5rem] object-contain object-left brightness-0 invert" />
          </div>
        </div>

        <div className="mt-auto pt-16 lg:pt-28">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#D3B56E]">Pesquisa acadêmica, de ponta a ponta</p>
          <h1 className="mt-5 max-w-xl font-reading text-4xl font-black leading-[1.12] tracking-[-0.04em] sm:text-5xl xl:text-[4.25rem]">
            Ideias mais <span className="text-[#D8BE7D] italic">nítidas.</span><br />
            Evidências mais <span className="text-[#D8BE7D] italic">confiáveis.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-slate-200 sm:text-lg">Planeje, investigue, preserve, analise e comunique a pesquisa em um ambiente conectado e auditável.</p>
        </div>

        <div className="mt-12 grid gap-7 border-t border-[#6C829B]/35 pt-5 text-xs leading-5 text-slate-300 lg:mt-auto lg:grid-cols-[minmax(17rem,0.76fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <aside data-testid="cover-institutional-credit" data-alignment="left" aria-label="Créditos institucionais" className="border-l-2 border-[#D3B56E]/75 pl-4 sm:pl-5 lg:justify-self-start">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D3B56E]">Desenvolvido pelo</p>
            <p className="mt-1 font-reading text-sm font-bold text-[#F8F5EC]">Prof. Rogério G. Bittencourt</p>
            <div className="mt-2 flex items-start gap-2.5">
              <img src={inovalabLogoUrl} alt="Logotipo do INOVALAB" className="h-10 w-10 shrink-0 rounded-md object-contain" />
              <p className="max-w-sm text-[11px] leading-4 text-slate-300"><span className="block text-sm font-black tracking-[0.12em] text-[#F8F5EC]">INOVALAB</span>Laboratório de Inteligência Artificial, Inovação e Criatividade</p>
            </div>
            <a href="https://github.com/rgbittencourt" target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[10px] font-semibold tracking-wide text-[#E1C986] underline decoration-[#E1C986]/45 underline-offset-4 hover:text-[#F8F5EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D3B56E]">github.com/rgbittencourt</a>
          </aside>
          <div data-testid="cover-research-journey" className="max-w-md lg:justify-self-end">
            <p className="font-semibold uppercase tracking-[0.2em] text-[#D3B56E]">Uma pesquisa, um percurso</p>
            <p className="mt-2">Lapis, Cartographer, Prereg, Vault, Qualia, Analista, Scriptorium, Matchmaker e Vigil trabalham como uma única arquitetura de rigor.</p>
          </div>
        </div>
      </div>
    </section>

    <section className="flex min-h-[52vh] items-center px-7 py-12 sm:px-12 lg:min-h-screen lg:px-14 xl:px-20">
      <div className="mx-auto w-full max-w-md">
        <img src={academiaMarkUrl} alt="AcademiaOS" className="h-14 w-14 rounded-2xl object-cover" />
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.28em] text-[#A57D35]">AcademiaOS</p>
        <h2 className="mt-3 font-reading text-3xl font-black leading-tight tracking-[-0.035em] text-[#0A192F] sm:text-4xl">Acesse o seu espaço de pesquisa.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">Entre com sua conta para continuar projetos, evidências e artefatos no laboratório digital.</p>
        <Button onClick={() => startLogin()} size="lg" className="mt-8 h-14 w-full justify-between rounded-lg bg-[#0A192F] px-5 font-bold hover:bg-[#15345A]">
          <span>Entrar no AcademiaOS</span><span aria-hidden className="text-lg text-[#D8BE7D]">→</span>
        </Button>
        <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">Acesso individual protegido por autenticação.</p>

        <div className="mt-9 border-t border-slate-200 pt-7">
          <h3 className="font-reading text-base font-bold text-[#0A192F]">O que você encontrará</h3>
          <div className="mt-5 space-y-4">
            {capabilities.map((item) => <div key={item.code} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#F2ECDD] text-[9px] font-black tracking-wide text-[#80652E]">{item.code}</span>
              <div><p className="text-sm font-bold text-[#0A192F]">{item.title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{item.description}</p></div>
            </div>)}
          </div>
        </div>
        <p className="mt-10 text-center text-[10px] text-slate-400">Laboratório de pesquisa acadêmica · ambiente de trabalho individual</p>
      </div>
    </section>
  </main>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) return <AcademiaCover />;

  return <SidebarProvider style={{ "--sidebar-width": "262px" } as CSSProperties}><DashboardLayoutContent>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();
  const activeTitle = pageTitles[location] ?? "AcademiaOS";

  const navigateTo = (path: string) => {
    const [pathname, hash] = path.split("#");
    setLocation(pathname || "/");
    if (hash) window.setTimeout(() => { window.location.hash = hash; }, 0);
  };

  return <>
    <Sidebar collapsible="offcanvas" className="border-r border-white/10 bg-[#071c3e] text-slate-100">
      <SidebarHeader className="h-24 border-b border-white/10 px-5 py-5">
        <button type="button" onClick={() => setLocation("/")} className="flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-amber-300/60 bg-amber-300/10"><img src={academiaMarkUrl} alt="Símbolo AcademiaOS" className="h-full w-full object-cover" /></span>
          <span className="min-w-0"><span className="block font-reading text-[22px] font-black tracking-tight text-white">Academia<span className="text-amber-300">OS</span></span><span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pesquisa acadêmica</span></span>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu className="gap-1.5">
          {academyNavigationItems.map(item => {
            const isActive = item.path === "/" ? location === "/" : item.path === "/lapis" ? location.startsWith("/lapis") : item.path === "/search" ? ["/search", "/discover", "/library", "/synthesis"].includes(location) : item.path === "/vault" ? ["/vault", "/qualia", "/analista"].includes(location) : item.path === "/scriptorium" ? location === "/scriptorium" : item.path === "/matchmaker" ? ["/matchmaker", "/vigil"].includes(location) : location === item.path;
            const Icon = item.icon;
            const submenuItems = "children" in item ? item.children ?? [] : [];
            const hasSubmenu = submenuItems.length > 0;
            const isOpen = isActive || Boolean(openMenus[item.label]);
            if (hasSubmenu) return <Collapsible key={item.label} open={isOpen} onOpenChange={open => setOpenMenus(current => ({ ...current, [item.label]: open }))}><SidebarMenuItem><div className="flex items-center"><SidebarMenuButton tooltip={`${item.label} · ${item.context}`} isActive={isActive} onClick={() => { setOpenMenus(current => ({ ...current, [item.label]: true })); navigateTo(item.path); }} className={cn("relative h-12 flex-1 rounded-lg px-3 text-slate-200 hover:bg-white/8 hover:text-white", isActive && "bg-[#1b426e] text-amber-300 hover:bg-[#1b426e] hover:text-amber-300 before:absolute before:-left-3 before:top-2 before:h-8 before:w-1 before:rounded-r before:bg-amber-300")}><Icon className={cn("h-5 w-5", isActive && "text-amber-300")} /><span className="flex min-w-0 flex-col"><span className="text-[15px] font-semibold leading-5">{item.label}</span><span className={cn("text-[10px] leading-3 text-slate-400", isActive && "text-amber-100/70")}>{item.context}</span></span></SidebarMenuButton><CollapsibleTrigger asChild><button type="button" aria-label={`Abrir submenus de ${item.label}`} className="mr-2 flex h-8 w-8 items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-amber-300"><ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} /></button></CollapsibleTrigger></div><CollapsibleContent><div className="ml-6 mt-1 border-l border-white/10 pl-4">{submenuItems.map(subitem => <button key={subitem.path} type="button" onClick={() => { setOpenMenus(current => ({ ...current, [item.label]: true })); navigateTo(subitem.path); }} className="block w-full py-2 text-left text-xs font-medium text-slate-400 hover:text-amber-200">{subitem.label}</button>)}</div></CollapsibleContent></SidebarMenuItem></Collapsible>;
            return <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                tooltip={`${item.label} · ${item.context}`}
                isActive={isActive}
                onClick={() => item.path ? navigateTo(item.path) : toast.info("Esta área será conectada quando estiver disponível.")}
                className={cn("relative h-12 rounded-lg px-3 text-slate-200 hover:bg-white/8 hover:text-white", isActive && "bg-[#1b426e] text-amber-300 hover:bg-[#1b426e] hover:text-amber-300 before:absolute before:-left-3 before:top-2 before:h-8 before:w-1 before:rounded-r before:bg-amber-300")}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-amber-300")} />
                <span className="flex min-w-0 flex-col"><span className="text-[15px] font-semibold leading-5">{item.label}</span><span className={cn("text-[10px] leading-3 text-slate-400", isActive && "text-amber-100/70")}>{item.context}</span></span>
              </SidebarMenuButton>
            </SidebarMenuItem>;
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-4">
        <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Avatar className="h-10 w-10 border-2 border-amber-300/60"><AvatarFallback className="bg-amber-100 text-xs font-black text-[#0A2348]">{user?.name?.charAt(0).toUpperCase() || "A"}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{user?.name || "Pesquisador"}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">Seu laboratório</p></div></div><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label="Abrir opções da conta" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-amber-300"><Settings className="h-5 w-5" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      </SidebarFooter>
    </Sidebar>

    <SidebarInset className="min-w-0 bg-[#f7f9fc]">
      <header className="sticky top-0 z-40 flex h-[84px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 md:px-10">
        <div className="flex min-w-0 items-center gap-3">{isMobile && <SidebarTrigger className="h-10 w-10 rounded-lg border border-slate-200 bg-white" />}<div className="hidden min-w-0 md:block"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">AcademiaOS</p><p className="truncate font-reading text-lg font-bold text-[#0A192F]">{activeTitle}</p></div></div>
        <form onSubmit={event => { event.preventDefault(); setLocation("/search"); }} className="hidden w-full max-w-[590px] flex-1 lg:block"><label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar projetos, artigos ou dados…" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100" /></label></form>
        <div className="flex items-center gap-3"><button type="button" title="Notificações" aria-label="Notificações" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Bell className="h-5 w-5" /></button><Avatar className="h-10 w-10 border border-slate-200"><AvatarFallback className="bg-[#0A2348] text-xs font-black text-amber-300">{user?.name?.charAt(0).toUpperCase() || "A"}</AvatarFallback></Avatar></div>
      </header>
      <main className="min-h-[calc(100vh-84px)]">{children}</main>
    </SidebarInset>
  </>;
}
