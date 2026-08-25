import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getLapisProjectForUser: vi.fn(), getVaultDatasets: vi.fn(), getVaultDataset: vi.fn(), createVaultDataset: vi.fn(), updateVaultDataset: vi.fn(), getVaultFiles: vi.fn(), createVaultFile: vi.fn(), getVaultDatasetVersions: vi.fn(), createVaultDatasetVersion: vi.fn(), getVaultDataDictionary: vi.fn(), upsertVaultDataDictionaryEntry: vi.fn(), getVaultGovernanceRecord: vi.fn(), upsertVaultGovernanceRecord: vi.fn(), getVaultRepositoryPlans: vi.fn(), upsertVaultRepositoryPlan: vi.fn(), getVaultRepositoryAuthorizations: vi.fn(), createVaultRepositoryAuthorization: vi.fn(),
  getQualiaCorpora: vi.fn(), getQualiaCorpus: vi.fn(), createQualiaCorpus: vi.fn(), getQualiaCodes: vi.fn(), createQualiaCode: vi.fn(), getQualiaExcerpts: vi.fn(), createQualiaExcerpt: vi.fn(), getQualiaSources: vi.fn(), getQualiaSource: vi.fn(), createQualiaSource: vi.fn(), updateQualiaSourceTranscription: vi.fn(), getQualiaCodeSuggestions: vi.fn(), createQualiaCodeSuggestions: vi.fn(), decideQualiaCodeSuggestion: vi.fn(), getQualiaCodingDecisions: vi.fn(), upsertQualiaCodingDecision: vi.fn(), getQualiaMemos: vi.fn(), createQualiaMemo: vi.fn(),
  getAnalystPlan: vi.fn(), getAnalystPlanVersions: vi.fn(), upsertAnalystPlan: vi.fn(), getAnalystVisualizations: vi.fn(), createAnalystVisualization: vi.fn(), getAnalystNotebooks: vi.fn(), upsertAnalystNotebook: vi.fn(),
  getScriptoriumDocument: vi.fn(), getScriptoriumVersions: vi.fn(), getScriptoriumVersion: vi.fn(), upsertScriptoriumDocument: vi.fn(), getSavedArticles: vi.fn(), getScriptoriumSubstanceReviews: vi.fn(), createScriptoriumSubstanceReview: vi.fn(),
  getZoteroConnection: vi.fn(), upsertZoteroConnection: vi.fn(), replaceZoteroItems: vi.fn(), getZoteroItems: vi.fn(),
  getMatchmakerSubmission: vi.fn(), upsertMatchmakerSubmission: vi.fn(), getVigilAssessment: vi.fn(), upsertVigilAssessment: vi.fn(),
}));
vi.mock("./literature", () => ({ searchAcademicArticles: vi.fn() }));
vi.mock("./academicAi", () => ({ extractArticleData: vi.fn(), createAuditableSynthesis: vi.fn() }));
vi.mock("./lapisAi", () => ({ generateLapisAnalysis: vi.fn() }));
vi.mock("./qualiaAi", () => ({ generateQualiaSuggestions: vi.fn() }));
vi.mock("./pdfText", () => ({ MAX_PDF_BYTES: 10_000_000, validatePdfBuffer: vi.fn(), extractPdfText: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./grantSources", () => ({ fetchOfficialGrantOpportunities: vi.fn() }));
vi.mock("./zotero", () => ({ fetchZoteroLibrary: vi.fn(), encryptZoteroKey: vi.fn(() => "cifra-de-teste"), decryptZoteroKey: vi.fn(() => "chave-de-teste") }));

import * as db from "./db";
import { storagePut } from "./storage";
import { fetchZoteroLibrary } from "./zotero";
import { generateQualiaSuggestions } from "./qualiaAi";
import { appRouter } from "./routers";

const lapisProject = { id: 13, userId: 42, reviewProjectId: null, title: "Projeto de validação", researchIdea: "Uma ideia suficientemente detalhada para validar os módulos de pesquisa.", problemStatement: null, researchQuestion: "Como validar ferramentas acadêmicas?", targetAgency: null, resources: null, status: "maturing", createdAt: new Date(), updatedAt: new Date() };
const context = (): TrpcContext => ({ user: { id: 42, openId: "researcher", email: "r@example.org", name: "Researcher", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
const analystPlan = { researchQuestion: "Qual análise avalia a associação entre exposição e desfecho?", outcomeName: "pontuação", outcomeType: "continuous" as const, predictors: "grupo e idade", design: "coorte", missingDataPlan: "descrever perdas e realizar sensibilidade", recommendation: "Regressão linear", rationale: "O desfecho declarado é contínuo.", assumptions: "Inspecionar resíduos, linearidade e homocedasticidade.", rCode: "modelo <- lm(pontuacao ~ grupo + idade, data = dados)", pythonCode: "modelo = smf.ols('pontuacao ~ grupo + idade', data=df).fit()", graphPlan: "Estimativas com IC de 95%.", resultsTemplate: "Relatar estimativa, IC de 95% e tamanho amostral." };
const scriptoriumDocument = { title: "Manuscrito de validação", targetJournal: "Revista Exemplo", abstract: "Resumo do documento de validação.", status: "draft" as const, sections: [{ id: "intro", heading: "Introdução", content: "Texto inicial e rastreável." }] };

describe("contratos do ecossistema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getLapisProjectForUser).mockResolvedValue(lapisProject as never);
    vi.mocked(db.getVaultDatasets).mockResolvedValue([] as never);
    vi.mocked(db.getVaultFiles).mockResolvedValue([] as never);
    vi.mocked(db.getVaultDatasetVersions).mockResolvedValue([] as never);
    vi.mocked(db.getVaultDataDictionary).mockResolvedValue([] as never);
    vi.mocked(db.getVaultGovernanceRecord).mockResolvedValue(undefined as never);
    vi.mocked(db.getVaultRepositoryPlans).mockResolvedValue([] as never);
    vi.mocked(db.getVaultRepositoryAuthorizations).mockResolvedValue([] as never);
    vi.mocked(db.createVaultDatasetVersion).mockResolvedValue({ versionId: 100, versionNumber: 1 } as never);
    vi.mocked(db.getQualiaCorpora).mockResolvedValue([] as never);
    vi.mocked(db.getQualiaCodes).mockResolvedValue([] as never);
    vi.mocked(db.getQualiaExcerpts).mockResolvedValue([] as never);
    vi.mocked(db.getQualiaSources).mockResolvedValue([] as never);
    vi.mocked(db.getQualiaCodeSuggestions).mockResolvedValue([] as never);
    vi.mocked(db.getQualiaCodingDecisions).mockResolvedValue([] as never);
    vi.mocked(db.getQualiaMemos).mockResolvedValue([] as never);
    vi.mocked(db.getAnalystPlan).mockResolvedValue(null as never);
    vi.mocked(db.getAnalystNotebooks).mockResolvedValue([] as never);
    vi.mocked(db.getScriptoriumDocument).mockResolvedValue(null as never);
    vi.mocked(db.getSavedArticles).mockResolvedValue([] as never);
    vi.mocked(db.getAnalystVisualizations).mockResolvedValue([] as never);
    vi.mocked(db.getScriptoriumSubstanceReviews).mockResolvedValue([] as never);
    vi.mocked(db.getZoteroItems).mockResolvedValue([] as never);
    vi.mocked(db.getZoteroConnection).mockResolvedValue(null as never);
    vi.mocked(db.getMatchmakerSubmission).mockResolvedValue(null as never);
    vi.mocked(db.getVigilAssessment).mockResolvedValue(null as never);
  });

  it("registra um ativo Vault com metadados FAIR e controles LGPD declarados", async () => {
    vi.mocked(db.createVaultDataset).mockResolvedValue(21);
    const caller = appRouter.createCaller(context());
    await expect(caller.lapis.createVaultDataset({ lapisProjectId: 13, dataset: { title: "Base de entrevistas", description: "Entrevistas semiestruturadas coletadas para a pesquisa de validação.", dataType: "qualitative", storageLocation: "Repositório institucional", persistentIdentifier: "doi:10.1234/base", license: "Acesso controlado", accessLevel: "controlled", containsPersonalData: true, lawfulBasis: "Consentimento documentado", consentStatus: "documented", anonymizationPlan: "Remover identificadores diretos e indiretos.", retentionPolicy: "Reter por cinco anos após publicação.", metadata: { creator: "Equipe", keywords: ["entrevista", "validação"], format: "CSV", collectionDate: "2026" } } })).resolves.toEqual({ datasetId: 21 });
    expect(db.createVaultDataset).toHaveBeenCalledWith(13, expect.objectContaining({ accessLevel: "controlled", containsPersonalData: true, metadataJson: expect.stringContaining("entrevista") }));
  });

  it("mantém corpus, códigos e excertos Qualia vinculados ao caderno autorizado", async () => {
    vi.mocked(db.createQualiaCorpus).mockResolvedValue(31); vi.mocked(db.getQualiaCorpus).mockResolvedValue({ id: 31, lapisProjectId: 13, title: "Entrevistas", description: "Corpus de entrevistas", sourceScope: null } as never); vi.mocked(db.createQualiaCode).mockResolvedValue(32); vi.mocked(db.createQualiaExcerpt).mockResolvedValue(33);
    const caller = appRouter.createCaller(context());
    await expect(caller.lapis.createQualiaCorpus({ lapisProjectId: 13, corpus: { title: "Entrevistas", description: "Corpus de entrevistas para análise temática.", sourceScope: "Participantes P01 a P10" } })).resolves.toEqual({ corpusId: 31 });
    await expect(caller.lapis.createQualiaCode({ lapisProjectId: 13, corpusId: 31, code: { label: "Barreira", definition: "Relato de impedimento percebido.", color: "#B45309" } })).resolves.toEqual({ codeId: 32 });
    await expect(caller.lapis.createQualiaExcerpt({ lapisProjectId: 13, corpusId: 31, excerpt: { codeId: 32, sourceLabel: "Entrevista P01", content: "A falta de tempo foi uma barreira.", analyticMemo: "Conferir recorrência." } })).resolves.toEqual({ excerptId: 33 });
  });

  it("mantém fontes, sugestões explicáveis, dupla codificação e memos Qualia auditáveis", async () => {
    const corpus = { id: 31, lapisProjectId: 13, title: "Entrevistas", description: "Corpus de entrevistas", sourceScope: null };
    const excerptRows = [{ excerpt: { id: 33, corpusId: 31, codeId: 32, sourceLabel: "Entrevista P01", content: "A falta de tempo foi uma barreira importante.", analyticMemo: null }, code: null }];
    vi.mocked(db.getQualiaCorpus).mockResolvedValue(corpus as never);
    vi.mocked(db.getQualiaCodes).mockResolvedValue([{ id: 32, corpusId: 31, label: "Barreira", definition: "Impedimento percebido", color: "#B45309" }] as never);
    vi.mocked(db.getQualiaExcerpts).mockResolvedValue(excerptRows as never);
    vi.mocked(db.createQualiaSource).mockResolvedValue(81);
    vi.mocked(db.createQualiaCodeSuggestions).mockResolvedValue([91] as never);
    vi.mocked(db.createQualiaMemo).mockResolvedValue(92);
    vi.mocked(generateQualiaSuggestions).mockResolvedValue({ model: "azure-openai", suggestions: [{ suggestedLabel: "Tempo escasso", proposedTheme: "Barreiras", rationale: "O excerto relata uma limitação de agenda.", evidence: "falta de tempo", confidence: 74 }] });
    vi.mocked(db.getQualiaCodingDecisions).mockResolvedValue([
      { excerptId: 33, codeId: 32, coderLabel: "Codificador A", decision: "applied" }, { excerptId: 33, codeId: 32, coderLabel: "Codificador B", decision: "applied" },
      { excerptId: 34, codeId: 32, coderLabel: "Codificador A", decision: "not_applied" }, { excerptId: 34, codeId: 32, coderLabel: "Codificador B", decision: "uncertain" },
    ] as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.lapis.createQualiaSource({ lapisProjectId: 13, corpusId: 31, source: { label: "Entrevista P01", mediaType: "audio", transcription: "Texto revisado", researcherDescription: "Entrevista semiestruturada." } })).resolves.toEqual({ sourceId: 81 });
    await expect(caller.lapis.generateQualiaSuggestions({ lapisProjectId: 13, corpusId: 31, generation: { excerptId: 33, acknowledgedExternalProcessing: true } })).resolves.toEqual(expect.objectContaining({ suggestionIds: [91], model: "azure-openai" }));
    expect(db.createQualiaCodeSuggestions).toHaveBeenCalledWith(31, [expect.objectContaining({ excerptId: 33, evidence: "falta de tempo", modelId: "azure-openai" })]);
    await expect(caller.lapis.upsertQualiaCodingDecision({ lapisProjectId: 13, corpusId: 31, coding: { excerptId: 33, codeId: 32, coderLabel: "Codificador A", decision: "applied", rationale: "Trecho descreve impedimento." } })).resolves.toEqual({ success: true });
    await expect(caller.lapis.createQualiaMemo({ lapisProjectId: 13, corpusId: 31, memo: { excerptId: 33, title: "Reflexão inicial", content: "Examinar como o tempo se relaciona às condições de trabalho.", memoType: "reflexive", authorLabel: "Codificador A" } })).resolves.toEqual({ memoId: 92 });
    await expect(caller.lapis.qualiaAgreement({ lapisProjectId: 13, corpusId: 31, agreement: { codeId: 32, coderA: "Codificador A", coderB: "Codificador B" } })).resolves.toEqual(expect.objectContaining({ status: "calculated", pairedExcerpts: 2, kappa: expect.any(Number), alpha: expect.any(Number) }));
  });

  it("versiona o plano Analista e o documento Scriptorium com conteúdo reproduzível", async () => {
    vi.mocked(db.upsertAnalystPlan).mockResolvedValue(41); vi.mocked(db.upsertScriptoriumDocument).mockResolvedValue(51);
    const caller = appRouter.createCaller(context());
    await expect(caller.lapis.updateAnalystPlan({ lapisProjectId: 13, plan: analystPlan })).resolves.toEqual({ planId: 41 });
    await expect(caller.lapis.updateScriptoriumDocument({ lapisProjectId: 13, document: scriptoriumDocument, changeSummary: "Primeira versão do manuscrito" })).resolves.toEqual({ documentId: 51 });
    expect(db.upsertAnalystPlan).toHaveBeenCalledWith(13, expect.objectContaining({ outcomeType: "continuous", rCode: expect.stringContaining("lm") }));
    expect(db.upsertScriptoriumDocument).toHaveBeenCalledWith(13, expect.objectContaining({ sectionsJson: expect.stringContaining("Introdução") }), "Primeira versão do manuscrito");
  });

  it("versiona um notebook Analista sem executar dados e preserva seu plano de origem", async () => {
    vi.mocked(db.getAnalystPlan).mockResolvedValue({ id: 41, lapisProjectId: 13, versionNumber: 3 } as never);
    vi.mocked(db.upsertAnalystNotebook).mockResolvedValue({ notebookId: 61, versionNumber: 2 } as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.lapis.createAnalystNotebook({ lapisProjectId: 13, notebook: { language: "python", title: "Modelo principal", purpose: "Análise confirmatória", code: "modelo = smf.ols('pontuacao ~ grupo', data=df).fit()" } })).resolves.toEqual({ notebookId: 61, versionNumber: 2 });
    expect(db.upsertAnalystNotebook).toHaveBeenCalledWith(41, expect.objectContaining({ language: "python", code: expect.stringContaining("ols"), inputSnapshotJson: expect.stringContaining("Código não executado pelo AcademiaOS") }));
  });

  it("restaura uma versão Scriptorium como novo estado auditável", async () => {
    vi.mocked(db.getScriptoriumDocument).mockResolvedValue({ id: 51, lapisProjectId: 13, title: "Atual", sectionsJson: "[]" } as never);
    vi.mocked(db.getScriptoriumVersion).mockResolvedValue({ id: 77, documentId: 51, versionNumber: 2, snapshotJson: JSON.stringify(scriptoriumDocument) } as never);
    vi.mocked(db.upsertScriptoriumDocument).mockResolvedValue(51);
    const caller = appRouter.createCaller(context());
    await expect(caller.lapis.restoreScriptoriumVersion({ lapisProjectId: 13, versionId: 77 })).resolves.toEqual({ success: true });
    expect(db.upsertScriptoriumDocument).toHaveBeenCalledWith(13, expect.objectContaining({ title: "Manuscrito de validação" }), "Restauração da versão 2");
  });

  it("bloqueia upload sensível sem base legal e registra upload governado com integridade", async () => {
    vi.mocked(db.getVaultDataset).mockResolvedValue({ id: 21, lapisProjectId: 13 } as never);
    vi.mocked(storagePut).mockResolvedValue({ key: "vault/42/13/21/dados.csv", url: "https://storage.example/dados.csv" } as never);
    vi.mocked(db.createVaultFile).mockResolvedValue(91);
    const caller = appRouter.createCaller(context());
    const base = { lapisProjectId: 13, datasetId: 21, filename: "dados.csv", mimeType: "text/csv" as const, base64: Buffer.from("a,b\n1,2").toString("base64"), processingPurpose: "Validar modelo estatístico do estudo.", consentReference: "TCLE-2026-01" };
    await expect(caller.lapis.uploadVaultFile({ ...base, personalDataCategory: "sensitive", consentConfirmed: false })).rejects.toThrow("exigem base legal declarada");
    await expect(caller.lapis.uploadVaultFile({ ...base, personalDataCategory: "pseudonymized", lawfulBasis: "Consentimento documentado", consentConfirmed: true })).resolves.toEqual(expect.objectContaining({ fileId: 91, byteSize: 7 }));
    expect(storagePut).toHaveBeenCalledWith(expect.stringMatching(/^vault\/42\/13\/21\/\d+_dados\.csv$/), expect.any(Buffer), "text/csv");
    expect(db.createVaultFile).toHaveBeenCalledWith(21, expect.objectContaining({ personalDataCategory: "pseudonymized", consentConfirmed: true, sha256: expect.stringMatching(/^[a-f0-9]{64}$/) }));
  });

  it("mantém versões, dicionário, checklist CEP/LGPD e plano de depósito auditáveis no Vault", async () => {
    vi.mocked(db.getVaultDataset).mockResolvedValue({ id: 21, lapisProjectId: 13, title: "Base de validação", metadataJson: JSON.stringify({ keywords: ["validação"] }) } as never);
    vi.mocked(db.getVaultFiles).mockResolvedValue([{ id: 91, originalFilename: "dados.csv", mimeType: "text/csv", byteSize: 7, sha256: "a".repeat(64), personalDataCategory: "pseudonymized", processingPurpose: "Validação do modelo", createdAt: new Date() }] as never);
    vi.mocked(db.createVaultDatasetVersion).mockResolvedValue({ versionId: 102, versionNumber: 2 } as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.lapis.createVaultDatasetVersion({ lapisProjectId: 13, datasetId: 21, version: { changeSummary: "Conferência dos metadados" } })).resolves.toEqual({ versionId: 102, versionNumber: 2 });
    await expect(caller.lapis.generateVaultDataDictionary({ lapisProjectId: 13, datasetId: 21, generation: { source: "csv_header", sourceText: "id,idade,grupo" } })).resolves.toEqual(expect.objectContaining({ generated: ["id", "idade", "grupo"] }));
    expect(db.upsertVaultDataDictionaryEntry).toHaveBeenCalledWith(21, expect.objectContaining({ variableName: "idade", source: "csv_header", variableType: "unknown" }));
    await expect(caller.lapis.upsertVaultGovernance({ lapisProjectId: 13, datasetId: 21, governance: { humanSubjects: true, cepConepStatus: "submitted", approvalReference: "CAAE-2026-001", riskLevel: "minimal", dataProcessingAgreementStatus: "documented", privacyImpactSummary: "Acesso controlado e minimização de dados.", pendingItems: ["Aguardar parecer"] } })).resolves.toEqual({ success: true });
    expect(db.upsertVaultGovernanceRecord).toHaveBeenCalledWith(21, expect.objectContaining({ cepConepStatus: "submitted", pendingItemsJson: expect.stringContaining("Aguardar parecer") }));
    await expect(caller.lapis.upsertVaultRepositoryPlan({ lapisProjectId: 13, datasetId: 21, plan: { repository: "zenodo", status: "metadata_ready", destinationUrl: "https://zenodo.org", repositoryRecordId: "", requirements: ["Revisar licença"], notes: "Depósito final será manual." } })).resolves.toEqual({ success: true });
    expect(db.upsertVaultRepositoryPlan).toHaveBeenCalledWith(21, expect.objectContaining({ repository: "zenodo", status: "metadata_ready", requirementsJson: expect.stringContaining("Revisar licença"), metadataSnapshotJson: expect.stringContaining("Base de validação") }));
    await expect(caller.lapis.upsertVaultGovernance({ lapisProjectId: 13, datasetId: 21, governance: { humanSubjects: true, cepConepStatus: "not_applicable", riskLevel: "minimal", dataProcessingAgreementStatus: "pending", pendingItems: [] } })).rejects.toThrow("exigem um estado CEP/Conep");
  });

  it("exige confirmação explícita e preserva a revogação de preparação autenticada sem enviar arquivos", async () => {
    vi.mocked(db.getVaultDataset).mockResolvedValue({ id: 21, lapisProjectId: 13, title: "Base de validação", metadataJson: "{}" } as never);
    vi.mocked(db.getVaultRepositoryPlans).mockResolvedValue([{ id: 33, datasetId: 21, repository: "zenodo", status: "metadata_ready", destinationUrl: "https://zenodo.org/deposit", requirementsJson: "[]", metadataSnapshotJson: "{}", notes: null, createdByUserId: 42 }] as never);
    vi.mocked(db.createVaultRepositoryAuthorization).mockResolvedValue(501);
    const caller = appRouter.createCaller(context());
    const confirmation = { acknowledged: true as const, confirmationStatement: "Autorizo apenas a autenticação e a preparação do depósito deste ativo. Nenhum arquivo será transferido ou publicado sem uma confirmação posterior no repositório." as const };
    await expect(caller.lapis.confirmVaultRepositoryAuthorization({ lapisProjectId: 13, datasetId: 21, repositoryPlanId: 33, confirmation })).resolves.toEqual({ success: true, alreadyConfirmed: false });
    expect(db.createVaultRepositoryAuthorization).toHaveBeenCalledWith(33, expect.objectContaining({ action: "confirmed", confirmedByUserId: 42, metadataSnapshotJson: expect.stringContaining('"transmissionExecuted":false') }));
    vi.mocked(db.getVaultRepositoryAuthorizations).mockResolvedValue([{ id: 501, action: "confirmed", createdAt: new Date() }] as never);
    await expect(caller.lapis.revokeVaultRepositoryAuthorization({ lapisProjectId: 13, datasetId: 21, repositoryPlanId: 33, confirmed: true })).resolves.toEqual({ success: true });
    expect(db.createVaultRepositoryAuthorization).toHaveBeenLastCalledWith(33, expect.objectContaining({ action: "revoked", confirmedByUserId: 42, metadataSnapshotJson: expect.stringContaining('"transmissionExecuted":false') }));
  });

  it("vincula visualização ao plano salvo e mantém a chave Zotero fora do retorno", async () => {
    vi.mocked(db.getAnalystPlan).mockResolvedValue({ id: 41, lapisProjectId: 13 } as never);
    vi.mocked(db.createAnalystVisualization).mockResolvedValue(55);
    vi.mocked(fetchZoteroLibrary).mockResolvedValue([{ zoteroKey: "ABC", title: "Referência", creatorsJson: "[]", year: 2026, doi: null, url: null, itemType: "journalArticle" }] as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.lapis.createAnalystVisualization({ lapisProjectId: 13, visualization: { kind: "comparison", title: "Médias por grupo", dataSourceDescription: "Estimativas ajustadas do plano salvo.", spec: { labels: ["Controle", "Intervenção"], values: [2.1, 3.4], confidenceIntervals: [0.3, 0.4], xLabel: "Grupo", yLabel: "Média" } } })).resolves.toEqual({ visualizationId: 55 });
    await expect(caller.lapis.connectZotero({ libraryId: "12345", libraryType: "user", apiKey: "12345678901234567890" })).resolves.toEqual({ imported: 1 });
    expect(db.upsertZoteroConnection).toHaveBeenCalledWith(42, expect.objectContaining({ encryptedApiKey: "cifra-de-teste", keyHint: "7890" }));
    expect(db.replaceZoteroItems).toHaveBeenCalledWith(42, expect.any(Array));
  });

  it("persiste submissão e monitoramento apenas como registros revisáveis", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.lapis.updateMatchmakerSubmission({ lapisProjectId: 13, submission: { manuscriptTitle: "Manuscrito em validação", scopeSummary: "Contribuição metodológica com evidências rastreáveis e plano de análise transparente.", rankedVenues: [{ title: "Revista Exemplo", scopeFit: 82, accessModel: "Acesso aberto", rationale: "O escopo editorial é compatível com o estudo." }], checklist: [{ framework: "STROBE", item: "Desenho do estudo", completed: true, evidence: "Seção Método" }], reviewerComments: [{ reviewer: "Revisor 1", comment: "Explique os limites.", disposition: "clarified", responseDraft: "Incluímos uma discussão de limites." }], status: "revision" } })).resolves.toEqual({ success: true });
    await expect(caller.lapis.updateVigilAssessment({ lapisProjectId: 13, assessment: { integrityChecklist: [{ id: "refs", label: "Referências retratadas ou erratadas", state: "review", evidence: "Consulta manual pendente." }], referenceAlerts: [], supplementaryMaterials: [], dissemination: [], status: "monitoring" } })).resolves.toEqual({ success: true });
    expect(db.upsertMatchmakerSubmission).toHaveBeenCalledWith(13, expect.objectContaining({ status: "revision", rankedVenuesJson: expect.stringContaining("Revista Exemplo") }));
    expect(db.upsertVigilAssessment).toHaveBeenCalledWith(13, expect.objectContaining({ status: "monitoring", integrityChecklistJson: expect.stringContaining("Referências") }));
  });
});
