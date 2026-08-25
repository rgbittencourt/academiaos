import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getProjectsByUserId: vi.fn(), createReviewProject: vi.fn(), getProjectForUser: vi.fn(),
  getSavedArticles: vi.fn(), getProjectMetrics: vi.fn(), getProjectSynthesis: vi.fn(),
  getExtraction: vi.fn(), saveArticle: vi.fn(), getArticleForProject: vi.fn(), getArticleDuplicateReviews: vi.fn(), upsertArticleDuplicateReview: vi.fn(),
  setArticleReadState: vi.fn(), removeSavedArticle: vi.fn(), upsertExtraction: vi.fn(), setProjectSynthesis: vi.fn(),
  getArticleDocument: vi.fn(), upsertArticleDocument: vi.fn(), saveRisImportBatch: vi.fn(),
  getProjectScreenings: vi.fn(), upsertArticleScreening: vi.fn(), getNarrativeThemes: vi.fn(), createNarrativeTheme: vi.fn(), updateNarrativeTheme: vi.fn(), removeNarrativeTheme: vi.fn(),
  getLapisProjectsByUserId: vi.fn(), getLapisProjectForUser: vi.fn(), createLapisProject: vi.fn(),
  updateLapisProject: vi.fn(), removeLapisProject: vi.fn(), getLapisAnalyses: vi.fn(), setLapisAnalysis: vi.fn(),
  getLapisMethod: vi.fn(), upsertLapisMethod: vi.fn(), getLapisMilestones: vi.fn(), createLapisMilestone: vi.fn(), updateLapisMilestone: vi.fn(), removeLapisMilestone: vi.fn(),
  getLapisPreregistration: vi.fn(), upsertLapisPreregistration: vi.fn(), lockLapisPreregistration: vi.fn(), getLapisPreregistrationDevilReviews: vi.fn(), createLapisPreregistrationDevilReview: vi.fn(),
  getGrantOpportunities: vi.fn(), upsertGrantOpportunity: vi.fn(), getLapisGrantSelections: vi.fn(), selectLapisGrant: vi.fn(), removeLapisGrantSelection: vi.fn(),
  getLapisManuscript: vi.fn(), upsertLapisManuscript: vi.fn(), getLapisAcademicRecordSearches: vi.fn(), createLapisAcademicRecordSearch: vi.fn(),
}));
vi.mock("./literature", () => ({ searchAcademicArticles: vi.fn() }));
vi.mock("./academicAi", () => ({ extractArticleData: vi.fn(), createAuditableSynthesis: vi.fn() }));
vi.mock("./lapisAi", () => ({ generateLapisAnalysis: vi.fn() }));
vi.mock("./preregDevil", () => ({ generateDevilsAdvocateReview: vi.fn() }));
vi.mock("./pdfText", () => ({ MAX_PDF_BYTES: 10_000_000, validatePdfBuffer: vi.fn(), extractPdfText: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./grantSources", () => ({ fetchOfficialGrantOpportunities: vi.fn() }));
vi.mock("./academicDiscovery", () => ({ searchAcademicRecords: vi.fn(), buildCitationMap: vi.fn(), inspectReferenceIntegrity: vi.fn() }));

import * as ai from "./academicAi";
import * as db from "./db";
import * as lapisAi from "./lapisAi";
import * as preregDevil from "./preregDevil";
import * as literature from "./literature";
import * as grantSources from "./grantSources";
import * as pdfText from "./pdfText";
import * as storage from "./storage";
import * as academicDiscovery from "./academicDiscovery";
import { appRouter } from "./routers";

const project = { id: 7, userId: 42, name: "Revisão de sono", researchQuestion: "Como o sono afeta a cognição?", createdAt: new Date(), updatedAt: new Date() };
const article = { id: 9, projectId: 7, externalId: "paper-9", source: "semantic_scholar", title: "Sono e cognição", authorsJson: '["Ada"]', publicationYear: 2024, abstract: "O estudo avaliou 80 estudantes e encontrou redução da atenção após privação de sono.", doi: "10.1/example", citationCount: 12, relevanceScore: 95, url: null, isRead: false, savedAt: new Date() };
const lapisProject = { id: 13, userId: 42, reviewProjectId: 7, title: "Sono e desempenho", researchIdea: "Investigar relações entre qualidade do sono e desempenho cognitivo em estudantes universitários.", problemStatement: "A privação de sono compromete funções acadêmicas.", researchQuestion: "Como o sono afeta a cognição?", targetAgency: "CAPES", resources: "Equipe interdisciplinar", status: "maturing", createdAt: new Date(), updatedAt: new Date() };

function context(authenticated = true): TrpcContext {
  return {
    user: authenticated ? { id: 42, openId: "researcher", email: "r@example.org", name: "Researcher", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null,
    req: {} as TrpcContext["req"], res: {} as TrpcContext["res"],
  };
}

describe("cartographer routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getProjectForUser).mockResolvedValue(project as never);
    vi.mocked(db.getArticleForProject).mockResolvedValue(article as never);
    vi.mocked(db.getSavedArticles).mockResolvedValue([article] as never);
    vi.mocked(db.getExtraction).mockResolvedValue(null as never);
    vi.mocked(db.getProjectScreenings).mockResolvedValue([] as never);
    vi.mocked(db.getNarrativeThemes).mockResolvedValue([] as never);
    vi.mocked(db.getArticleDuplicateReviews).mockResolvedValue([] as never);
    vi.mocked(db.getLapisProjectForUser).mockResolvedValue(lapisProject as never);
    vi.mocked(db.getLapisAnalyses).mockResolvedValue([] as never);
    vi.mocked(db.getLapisMethod).mockResolvedValue(null as never);
    vi.mocked(db.getLapisPreregistration).mockResolvedValue(null as never);
    vi.mocked(db.getLapisPreregistrationDevilReviews).mockResolvedValue([] as never);
    vi.mocked(db.getLapisMilestones).mockResolvedValue([] as never);
    vi.mocked(db.getLapisGrantSelections).mockResolvedValue([] as never);
    vi.mocked(db.getLapisManuscript).mockResolvedValue(null as never);
    vi.mocked(db.getLapisAcademicRecordSearches).mockResolvedValue([] as never);
    vi.mocked(db.getGrantOpportunities).mockResolvedValue([] as never);
  });

  it("exige autenticação para dados de pesquisa", async () => {
    const caller = appRouter.createCaller(context(false));
    await expect(caller.cartographer.projects()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("percorre a descoberta e a criação de um projeto autenticado", async () => {
    vi.mocked(literature.searchAcademicArticles).mockResolvedValue([{ externalId: "paper-1", title: "Resultado", source: "semantic_scholar" }] as never);
    vi.mocked(db.getProjectsByUserId).mockResolvedValue([project] as never);
    vi.mocked(db.createReviewProject).mockResolvedValue(7);
    const caller = appRouter.createCaller(context());
    await expect(caller.cartographer.search({ query: "sono e cognição", limit: 5 })).resolves.toHaveLength(1);
    await expect(caller.cartographer.projects()).resolves.toEqual([project]);
    await expect(caller.cartographer.createProject({ name: "Revisão de sono" })).resolves.toEqual({ projectId: 7 });
    expect(db.createReviewProject).toHaveBeenCalledWith(42, "Revisão de sono", undefined);
  });

  it("entrega o mapa de citações e o alerta editorial somente ao dono do corpus", async () => {
    vi.mocked(academicDiscovery.buildCitationMap).mockResolvedValue({ nodes: [{ id: "paper-9", title: article.title }], edges: [], warnings: [], source: "Semantic Scholar", generatedAt: "2026-08-20T00:00:00.000Z" } as never);
    vi.mocked(academicDiscovery.inspectReferenceIntegrity).mockResolvedValue({ status: "no_relation_reported", source: "Crossref", detail: "Sem relação reportada." } as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.cartographer.citationMap({ projectId: 7 })).resolves.toMatchObject({ nodes: [{ id: "paper-9" }] });
    await expect(caller.cartographer.referenceIntegrity({ projectId: 7, articleId: 9 })).resolves.toMatchObject({ articleId: 9, status: "no_relation_reported" });
    expect(academicDiscovery.buildCitationMap).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ externalId: "paper-9" })]));
    expect(academicDiscovery.inspectReferenceIntegrity).toHaveBeenCalledWith("10.1/example");
  });

  it("persiste a consulta de registros acadêmicos no caderno autorizado", async () => {
    vi.mocked(academicDiscovery.searchAcademicRecords).mockResolvedValue({ query: "sono e cognição", retrievedAt: "2026-08-20T00:00:00.000Z", sources: [{ source: "openalex", status: "ok" }], records: [{ source: "openalex", externalId: "W1", title: "Registro" }] } as never);
    vi.mocked(db.createLapisAcademicRecordSearch).mockResolvedValue(31 as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.lapis.searchAcademicRecords({ lapisProjectId: 13, query: "sono e cognição", criteria: "Projetos e registros públicos" })).resolves.toMatchObject({ searchId: 31, records: [{ externalId: "W1" }] });
    expect(db.createLapisAcademicRecordSearch).toHaveBeenCalledWith(13, expect.objectContaining({ queryText: "sono e cognição", resultCount: 1 }));
  });

  it("carrega a visão geral autenticada com métricas, extração e síntese auditável", async () => {
    vi.mocked(db.getProjectMetrics).mockResolvedValue({ saved: 1, read: 1, extracted: 1 });
    vi.mocked(db.getExtraction).mockResolvedValue({ id: 3, articleId: 9, objective: "Avaliar atenção", methodology: "Observacional", sample: "80 estudantes", mainFindings: "Atenção reduzida", limitations: "Amostra local", evidenceJson: '[{"field":"objective","sourceText":"O estudo avaliou"}]', model: "gpt-5-mini", createdAt: new Date(), updatedAt: new Date() } as never);
    vi.mocked(db.getProjectSynthesis).mockResolvedValue({ id: 2, projectId: 7, status: "ready", content: "Atenção foi reduzida [1].", citationsJson: '[{"referenceNumber":1,"articleId":9}]', model: "gpt-5-mini", errorMessage: null, createdAt: new Date(), updatedAt: new Date() } as never);
    const caller = appRouter.createCaller(context());
    const overview = await caller.cartographer.projectOverview({ projectId: 7 });
    expect(overview).toMatchObject({ project, metrics: { saved: 1, read: 1, extracted: 1 }, synthesis: { status: "ready", content: "Atenção foi reduzida [1]." } });
    expect(overview.articles[0]).toMatchObject({ title: article.title, authors: ["Ada"], extraction: { objective: "Avaliar atenção" } });
    expect(overview.synthesis?.citations).toEqual([{ referenceNumber: 1, articleId: 9 }]);
  });

  it("oferece pares semelhantes para revisão e persiste a decisão sem excluir artigos", async () => {
    const similarArticle = { ...article, id: 10, externalId: "paper-10", title: "Sono e cognição em estudantes universitários", publicationYear: 2024, authorsJson: '["Ada, Silva"]' };
    vi.mocked(db.getSavedArticles).mockResolvedValue([{ ...article, title: "Efeitos do sono na cognição de estudantes universitários", authorsJson: '["Ada, Souza"]' }, similarArticle] as never);
    vi.mocked(db.getArticleForProject).mockImplementation(async articleId => (articleId === 9 ? { ...article, title: "Efeitos do sono na cognição de estudantes universitários", authorsJson: '["Ada, Souza"]' } : similarArticle) as never);
    const caller = appRouter.createCaller(context());
    const candidates = await caller.cartographer.duplicateReviewCandidates({ projectId: 7 });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ articleIdA: 9, articleIdB: 10, articleA: { title: "Efeitos do sono na cognição de estudantes universitários" }, articleB: { title: "Sono e cognição em estudantes universitários" } });
    await expect(caller.cartographer.reviewDuplicateCandidate({ projectId: 7, articleIdA: 10, articleIdB: 9, decision: "distinct", reviewerNote: "Amostras e objetivos distintos." })).resolves.toMatchObject({ success: true });
    expect(db.upsertArticleDuplicateReview).toHaveBeenCalledWith(expect.objectContaining({ projectId: 7, articleIdA: 9, articleIdB: 10, decision: "distinct" }));
    expect(db.removeSavedArticle).not.toHaveBeenCalled();
  });

  it("normaliza citações vazias persistidas para manter a síntese acessível", async () => {
    vi.mocked(db.getProjectMetrics).mockResolvedValue({ saved: 1, read: 0, extracted: 0 });
    vi.mocked(db.getProjectSynthesis).mockResolvedValue({ id: 2, projectId: 7, status: "error", content: null, citationsJson: "", model: null, errorMessage: "Falha temporária", createdAt: new Date(), updatedAt: new Date() } as never);
    const caller = appRouter.createCaller(context());

    await expect(caller.cartographer.projectOverview({ projectId: 7 })).resolves.toMatchObject({
      synthesis: { status: "error", citations: [] },
    });
  });

  it("salva, marca como lido e remove um artigo do projeto correto", async () => {
    const caller = appRouter.createCaller(context());
    const searchArticle = { externalId: "paper-9", source: "semantic_scholar" as const, title: "Sono e cognição", authors: ["Ada"], year: 2024, abstract: article.abstract, doi: null, citationCount: 12, relevanceScore: 95, url: null };
    await expect(caller.cartographer.saveArticle({ projectId: 7, article: searchArticle })).resolves.toEqual({ success: true });
    await expect(caller.cartographer.toggleArticleRead({ projectId: 7, articleId: 9, isRead: true })).resolves.toEqual({ success: true });
    await expect(caller.cartographer.removeArticle({ projectId: 7, articleId: 9 })).resolves.toEqual({ success: true });
    expect(db.saveArticle).toHaveBeenCalledWith(7, searchArticle);
    expect(db.setArticleReadState).toHaveBeenCalledWith(9, true);
    expect(db.removeSavedArticle).toHaveBeenCalledWith(9);
  });

  it("persiste uma extração e uma síntese apenas pelos contratos autenticados", async () => {
    const extraction = { objective: "Avaliar atenção", methodology: "Estudo observacional", sample: "80 estudantes", mainFindings: "Atenção reduzida", limitations: "Amostra local", evidence: [{ field: "objective" as const, sourceText: "O estudo avaliou" }] };
    vi.mocked(ai.extractArticleData).mockResolvedValue({ extraction, model: "gpt-5-mini" });
    vi.mocked(ai.createAuditableSynthesis).mockResolvedValue({ paragraph: "Atenção foi reduzida [1].", citations: [{ referenceNumber: 1, articleId: 9, articleTitle: article.title, sourceText: "encontrou redução da atenção", claim: "Atenção reduzida." }], model: "gpt-5-mini" });
    const caller = appRouter.createCaller(context());
    await expect(caller.cartographer.extractArticle({ projectId: 7, articleId: 9 })).resolves.toEqual(extraction);
    await expect(caller.cartographer.generateSynthesis({ projectId: 7 })).resolves.toMatchObject({ paragraph: "Atenção foi reduzida [1]." });
    expect(db.upsertExtraction).toHaveBeenCalledWith(9, expect.objectContaining({ evidenceJson: JSON.stringify(extraction.evidence) }));
    expect(db.setProjectSynthesis).toHaveBeenNthCalledWith(1, 7, expect.objectContaining({ status: "generating" }));
    expect(db.setProjectSynthesis).toHaveBeenLastCalledWith(7, expect.objectContaining({ status: "ready", content: "Atenção foi reduzida [1]." }));
  });

  it("registra triagem e temas narrativos somente com estudos pertencentes ao corpus", async () => {
    vi.mocked(db.createNarrativeTheme).mockResolvedValue(19);
    const caller = appRouter.createCaller(context());
    const screening = { projectId: 7, articleId: 9, stage: "title_abstract" as const, decision: "excluded" as const, reason: "População fora do escopo" };
    const theme = { title: "Barreiras de sono", interpretation: "O corpus aponta barreiras relacionadas à privação de sono.", articleIds: [9] };

    await expect(caller.cartographer.screenArticle(screening)).resolves.toEqual({ success: true });
    await expect(caller.cartographer.createNarrativeTheme({ projectId: 7, theme })).resolves.toEqual({ themeId: 19 });
    await expect(caller.cartographer.createNarrativeTheme({ projectId: 7, theme: { ...theme, articleIds: [999] } })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(db.upsertArticleScreening).toHaveBeenCalledWith(7, 9, screening);
    expect(db.createNarrativeTheme).toHaveBeenCalledWith(7, expect.objectContaining({ title: theme.title, articleIdsJson: "[9]" }));
  });

  it("cria e carrega um caderno Lapis apenas para o usuário autenticado", async () => {
    vi.mocked(db.getLapisProjectsByUserId).mockResolvedValue([lapisProject] as never);
    vi.mocked(db.createLapisProject).mockResolvedValue(13);
    vi.mocked(db.getLapisAnalyses).mockResolvedValue([{ id: 2, lapisProjectId: 13, kind: "gaps", status: "ready", content: "Uma lacuna foi identificada.", evidenceJson: '[{"source":"Cartographer"}]', model: "gpt-5-mini", errorMessage: null, createdAt: new Date(), updatedAt: new Date() }] as never);
    const caller = appRouter.createCaller(context());
    const input = { title: lapisProject.title, researchIdea: lapisProject.researchIdea, reviewProjectId: 7 };

    await expect(caller.lapis.projects()).resolves.toEqual([lapisProject]);
    await expect(caller.lapis.createProject(input)).resolves.toEqual({ lapisProjectId: 13 });
    await expect(caller.lapis.workspace({ lapisProjectId: 13 })).resolves.toMatchObject({
      project: lapisProject,
      reviewProject: project,
      analyses: [{ kind: "gaps", evidence: [{ source: "Cartographer" }] }],
    });
    expect(db.createLapisProject).toHaveBeenCalledWith(42, input);
  });

  it("atualiza o caderno Lapis e preserva a autorização do projeto Cartographer associado", async () => {
    const caller = appRouter.createCaller(context());
    const updatedProject = {
      title: "Sono, cognição e permanência", researchIdea: lapisProject.researchIdea,
      problemStatement: lapisProject.problemStatement, researchQuestion: lapisProject.researchQuestion,
      targetAgency: "CNPq", resources: "Dados longitudinais", reviewProjectId: 7, status: "ready" as const,
    };

    await expect(caller.lapis.updateProject({ lapisProjectId: 13, project: updatedProject })).resolves.toEqual({ success: true });
    expect(db.getLapisProjectForUser).toHaveBeenCalledWith(13, 42);
    expect(db.getProjectForUser).toHaveBeenCalledWith(7, 42);
    expect(db.updateLapisProject).toHaveBeenCalledWith(13, updatedProject);
  });

  it("persiste o protocolo de método e o cronograma somente no caderno Lapis autorizado", async () => {
    vi.mocked(db.createLapisMilestone).mockResolvedValue(23);
    const caller = appRouter.createCaller(context());
    const method = { studyDesign: "coorte prospectiva", population: "Estudantes universitários", setting: "Universidade pública", inclusionCriteria: "Matrícula ativa", exclusionCriteria: "Condição neurológica prévia", outcomes: "Atenção sustentada", dataCollection: "Questionários e testes", analysisPlan: "Regressão multivariada", ethicalConsiderations: "Consentimento livre e esclarecido" };
    const milestone = { title: "Submeter ao comitê de ética", description: "Anexar instrumentos de coleta", startDate: new Date("2026-09-01T12:00:00Z"), endDate: new Date("2026-10-01T12:00:00Z"), status: "planned" as const, sortOrder: 0 };

    await expect(caller.lapis.updateMethod({ lapisProjectId: 13, method })).resolves.toEqual({ success: true });
    await expect(caller.lapis.createMilestone({ lapisProjectId: 13, milestone })).resolves.toEqual({ milestoneId: 23 });
    await expect(caller.lapis.updateMilestone({ lapisProjectId: 13, milestoneId: 23, milestone: { ...milestone, status: "in_progress" } })).resolves.toEqual({ success: true });
    await expect(caller.lapis.removeMilestone({ lapisProjectId: 13, milestoneId: 23 })).resolves.toEqual({ success: true });

    expect(db.upsertLapisMethod).toHaveBeenCalledWith(13, expect.objectContaining({ studyDesign: method.studyDesign, population: method.population, inclusionCriteria: method.inclusionCriteria, analysisPlan: method.analysisPlan }));
    expect(db.createLapisMilestone).toHaveBeenCalledWith(13, milestone);
    expect(db.updateLapisMilestone).toHaveBeenCalledWith(13, 23, expect.objectContaining({ status: "in_progress" }));
    expect(db.removeLapisMilestone).toHaveBeenCalledWith(13, 23);
  });

  it("salva um pré-registro com hash de integridade e bloqueia versões prontas", async () => {
    const caller = appRouter.createCaller(context());
    const preregistration = {
      title: "Sono e cognição: pré-registro", researchQuestion: "Como o sono afeta a cognição?", hypotheses: "Menor duração do sono se associa a pior atenção.", studyDesign: "Coorte prospectiva", primaryOutcomes: "Escore de atenção", secondaryOutcomes: "Memória de trabalho", samplingPlan: "Estudantes elegíveis", dataCollection: "Questionários e testes", analysisPlan: "Regressão ajustada", exclusionRules: "Definidas antes da análise", ethicsAndTransparency: "Consentimento livre e esclarecido", deviations: "Desvios serão registrados", status: "review" as const,
    };

    await expect(caller.lapis.updatePreregistration({ lapisProjectId: 13, preregistration })).resolves.toMatchObject({ success: true, integrityHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(db.upsertLapisPreregistration).toHaveBeenCalledWith(13, expect.objectContaining({ title: preregistration.title, status: "review", integrityHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));

    vi.mocked(db.getLapisPreregistration).mockResolvedValue({ id: 3, lapisProjectId: 13, status: "review" } as never);
    await expect(caller.lapis.lockPreregistration({ lapisProjectId: 13 })).resolves.toEqual({ success: true });
    expect(db.lockLapisPreregistration).toHaveBeenCalledWith(13);

    vi.mocked(db.getLapisPreregistration).mockResolvedValue({ id: 3, lapisProjectId: 13, status: "locked" } as never);
    await expect(caller.lapis.updatePreregistration({ lapisProjectId: 13, preregistration })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("gera e persiste uma revisão Advogado do Diabo vinculada ao hash do protocolo", async () => {
    const protocol = {
      id: 3, lapisProjectId: 13, title: "Sono e cognição", researchQuestion: "Como o sono afeta a atenção?", hypotheses: "Menos sono reduz atenção.", studyDesign: "Coorte", primaryOutcomes: "Escore de atenção", secondaryOutcomes: null, samplingPlan: null, dataCollection: "Questionários", analysisPlan: null, exclusionRules: "Pré-especificadas", ethicsAndTransparency: "Consentimento", deviations: "Registradas", integrityHash: "a".repeat(64), status: "review",
    };
    const review = { summary: "Revisão crítica vinculada ao protocolo ativo e destinada a apoiar o julgamento metodológico.", findings: [{ category: "vies", severity: "important", concern: "O plano amostral não descreve critérios verificáveis de seleção.", recommendation: "Defina população, recrutamento, perdas e tamanho amostral.", protocolField: "researchQuestion", sourceText: "Como o sono afeta a atenção?" }], scopeLimit: "Não substitui avaliação ética, estatística ou por pares." };
    vi.mocked(db.getLapisPreregistration).mockResolvedValue(protocol as never);
    vi.mocked(preregDevil.generateDevilsAdvocateReview).mockResolvedValue({ review, model: "fallback auditável" } as never);
    vi.mocked(db.createLapisPreregistrationDevilReview).mockResolvedValue(44 as never);
    const caller = appRouter.createCaller(context());

    await expect(caller.lapis.generateDevilsAdvocateReview({ lapisProjectId: 13 })).resolves.toMatchObject({ reviewId: 44, preregistrationHash: "a".repeat(64), review });
    expect(db.createLapisPreregistrationDevilReview).toHaveBeenCalledWith(13, expect.objectContaining({ preregistrationHash: "a".repeat(64), model: "fallback auditável" }));
  });

  it("deriva o PRISMA, importa PDF e persiste as fontes e o manuscrito pelo contrato autenticado", async () => {
    const officialOpportunity = { id: 77, provider: "cnpq" as const, sourceUrl: "https://www.gov.br/cnpq/pt-br", sourceKey: "cnpq-teste", title: "Chamada oficial de teste", summaryLiteral: "Resumo oficial.", statusLabel: "Aberto", publishedAt: null, deadlineAt: null, sourceFetchedAt: new Date("2026-08-20T00:00:00Z") };
    vi.mocked(db.getProjectScreenings).mockResolvedValue([{ projectId: 7, articleId: 9, stage: "full_text", decision: "included", reason: null }] as never);
    vi.mocked(pdfText.extractPdfText).mockResolvedValue({ text: "Texto integral extraído para auditoria.", pageCount: 2 } as never);
    vi.mocked(storage.storagePut).mockResolvedValue({ key: "users/42/reviews/7/articles/9/artigo.pdf", url: "https://storage.example/artigo.pdf" } as never);
    vi.mocked(grantSources.fetchOfficialGrantOpportunities).mockResolvedValue([officialOpportunity] as never);
    vi.mocked(db.getGrantOpportunities).mockResolvedValue([officialOpportunity] as never);
    const caller = appRouter.createCaller(context());

    await expect(caller.cartographer.prisma({ projectId: 7 })).resolves.toMatchObject({ recordsIdentified: 1, reportsAssessed: 1, studiesIncluded: 1 });
    await expect(caller.cartographer.importArticlePdf({ projectId: 7, articleId: 9, filename: "artigo de teste.pdf", mimeType: "application/pdf", base64: Buffer.from("%PDF-1.4 teste de regressão").toString("base64") })).resolves.toEqual({ status: "ready", pageCount: 2, charactersExtracted: 39 });
    expect(db.upsertArticleDocument).toHaveBeenCalledWith(expect.objectContaining({ projectId: 7, articleId: 9, extractionStatus: "ready", fullText: "Texto integral extraído para auditoria." }));

    await expect(caller.lapis.syncOfficialGrants()).resolves.toMatchObject({ synced: 1 });
    await expect(caller.lapis.selectGrantOpportunity({ lapisProjectId: 13, grantOpportunityId: 77 })).resolves.toEqual({ success: true });
    await expect(caller.lapis.removeGrantOpportunitySelection({ lapisProjectId: 13, grantOpportunityId: 77 })).resolves.toEqual({ success: true });
    expect(db.upsertGrantOpportunity).toHaveBeenCalledWith(officialOpportunity);
    expect(db.selectLapisGrant).toHaveBeenCalledWith(13, 77);
    expect(db.removeLapisGrantSelection).toHaveBeenCalledWith(13, 77);

    const manuscript = { title: "Sono e cognição", abstract: "Resumo de trabalho.", keywords: "sono, cognição", sections: [{ id: "metodo", heading: "Método", content: "Coorte prospectiva.", source: "method" as const }], status: "draft" as const };
    await expect(caller.lapis.updateManuscript({ lapisProjectId: 13, manuscript })).resolves.toEqual({ success: true });
    expect(db.upsertLapisManuscript).toHaveBeenCalledWith(13, expect.objectContaining({ title: manuscript.title, sectionsJson: JSON.stringify(manuscript.sections), status: "draft" }));
  });

  it("pré-visualiza RIS sem gravar e exige confirmação literal antes de criar o lote auditável", async () => {
    const ris = "TY  - JOUR\nTI  - Estudo importado do Retícula\nAU  - Silva, Ana\nPY  - 2026\nDO  - 10.1234/reticula\nN1  - Retícula — Atlas de Literatura Científica | consulta: ondas internas\nER  - ";
    vi.mocked(db.getSavedArticles).mockResolvedValue([] as never);
    vi.mocked(db.saveRisImportBatch).mockResolvedValue(88 as never);
    const caller = appRouter.createCaller(context());

    await expect(caller.cartographer.previewRisImport({ projectId: 7, filename: "reticula.ris", content: ris })).resolves.toMatchObject({ total: 1, candidateCount: 1, duplicateCount: 0 });
    expect(db.saveRisImportBatch).not.toHaveBeenCalled();

    await expect(caller.cartographer.confirmRisImport({ projectId: 7, filename: "reticula.ris", content: ris, selectedExternalIds: ["doi:10.1234/reticula"], acknowledged: false as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.saveRisImportBatch).not.toHaveBeenCalled();

    await expect(caller.cartographer.confirmRisImport({ projectId: 7, filename: "reticula.ris", content: ris, selectedExternalIds: ["doi:10.1234/reticula"], acknowledged: true })).resolves.toEqual({ importBatchId: 88, importedCount: 1, skippedDuplicates: 0 });
    expect(db.saveRisImportBatch).toHaveBeenCalledWith(expect.objectContaining({ projectId: 7, originalFilename: "reticula.ris", selectedRecords: 1, provenanceJson: expect.stringContaining("Retícula") }));
  });

  it("remove um caderno Lapis autorizado junto com as análises associadas", async () => {
    const caller = appRouter.createCaller(context());

    await expect(caller.lapis.removeProject({ lapisProjectId: 13 })).resolves.toEqual({ success: true });
    expect(db.getLapisProjectForUser).toHaveBeenCalledWith(13, 42);
    expect(db.removeLapisProject).toHaveBeenCalledWith(13);
  });

  it("gera e persiste as quatro análises Lapis com artigos do projeto associado", async () => {
    vi.mocked(lapisAi.generateLapisAnalysis).mockResolvedValue({
      content: "Análise rastreável baseada no caderno e no artigo associado.",
      evidence: [{ sourceId: "article-9", sourceLabel: article.title, sourceText: article.abstract }],
      model: "gpt-5-mini",
    });
    const caller = appRouter.createCaller(context());
    const kinds = ["gaps", "originality", "grant", "feasibility"] as const;

    for (const kind of kinds) {
      await expect(caller.lapis.generateAnalysis({ lapisProjectId: 13, kind })).resolves.toMatchObject({ model: "gpt-5-mini" });
    }

    expect(lapisAi.generateLapisAnalysis).toHaveBeenCalledTimes(4);
    expect(lapisAi.generateLapisAnalysis).toHaveBeenCalledWith("gaps", lapisProject, [{ id: 9, title: article.title, abstract: article.abstract }]);
    expect(db.setLapisAnalysis).toHaveBeenCalledTimes(8);
    expect(db.setLapisAnalysis).toHaveBeenNthCalledWith(1, 13, expect.objectContaining({ kind: "gaps", status: "generating" }));
    expect(db.setLapisAnalysis).toHaveBeenLastCalledWith(13, expect.objectContaining({ kind: "feasibility", status: "ready", evidenceJson: expect.stringContaining("article-9") }));
  });

  it("não expõe nem gera análises de um caderno Lapis de outro usuário", async () => {
    vi.mocked(db.getLapisProjectForUser).mockResolvedValue(null as never);
    const caller = appRouter.createCaller(context());

    await expect(caller.lapis.workspace({ lapisProjectId: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.lapis.generateAnalysis({ lapisProjectId: 999, kind: "gaps" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.lapis.removeProject({ lapisProjectId: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.setLapisAnalysis).not.toHaveBeenCalled();
    expect(lapisAi.generateLapisAnalysis).not.toHaveBeenCalled();
    expect(db.removeLapisProject).not.toHaveBeenCalled();
  });
});
