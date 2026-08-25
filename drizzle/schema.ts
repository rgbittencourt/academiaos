import { boolean, index, int, longtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const reviewProjects = mysqlTable("review_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  researchQuestion: text("researchQuestion"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("review_projects_user_idx").on(table.userId)]);

export const literatureImportBatches = mysqlTable("literature_import_batches", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  source: mysqlEnum("source", ["reticula"]).notNull(),
  format: mysqlEnum("format", ["ris"]).notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  contentHash: varchar("contentHash", { length: 64 }).notNull(),
  totalRecords: int("totalRecords").notNull(),
  candidateRecords: int("candidateRecords").notNull(),
  duplicateRecords: int("duplicateRecords").notNull(),
  selectedRecords: int("selectedRecords").notNull(),
  provenanceJson: text("provenanceJson").notNull(),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
}, table => [
  index("literature_import_batches_project_idx").on(table.projectId),
  index("literature_import_batches_project_imported_idx").on(table.projectId, table.importedAt),
]);

export const savedArticles = mysqlTable("saved_articles", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  importBatchId: int("importBatchId"),
  externalId: varchar("externalId", { length: 255 }).notNull(),
  source: mysqlEnum("source", ["semantic_scholar", "openalex", "europe_pmc", "pubmed", "crossref", "scielo", "openaire", "arxiv", "core", "reticula"]).notNull(),
  title: text("title").notNull(),
  authorsJson: text("authorsJson").notNull(),
  publicationYear: int("publicationYear"),
  abstract: text("abstract"),
  doi: varchar("doi", { length: 255 }),
  citationCount: int("citationCount").default(0).notNull(),
  relevanceScore: int("relevanceScore").notNull(),
  sourceUrl: text("sourceUrl"),
  isRead: boolean("isRead").default(false).notNull(),
  savedAt: timestamp("savedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("saved_articles_project_idx").on(table.projectId),
  index("saved_articles_import_batch_idx").on(table.importBatchId),
  uniqueIndex("saved_articles_project_external_unique").on(table.projectId, table.externalId),
]);

export const articleDuplicateReviews = mysqlTable("article_duplicate_reviews", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  articleIdA: int("articleIdA").notNull(),
  articleIdB: int("articleIdB").notNull(),
  similarityScore: int("similarityScore").notNull(),
  decision: mysqlEnum("decision", ["same_study", "distinct"]).notNull(),
  reviewerNote: text("reviewerNote"),
  reviewedAt: timestamp("reviewedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("article_duplicate_reviews_project_pair_unique").on(table.projectId, table.articleIdA, table.articleIdB),
  index("article_duplicate_reviews_project_idx").on(table.projectId),
]);

export const articleExtractions = mysqlTable("article_extractions", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  objective: text("objective").notNull(),
  methodology: text("methodology").notNull(),
  sample: text("sample").notNull(),
  mainFindings: text("mainFindings").notNull(),
  limitations: text("limitations").notNull(),
  evidenceJson: text("evidenceJson").notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("article_extractions_article_unique").on(table.articleId)]);

export const projectSyntheses = mysqlTable("project_syntheses", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  status: mysqlEnum("status", ["idle", "generating", "ready", "error"]).default("idle").notNull(),
  content: text("content"),
  citationsJson: text("citationsJson").notNull(),
  model: varchar("model", { length: 100 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("project_syntheses_project_unique").on(table.projectId)]);

export const lapisProjects = mysqlTable("lapis_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reviewProjectId: int("reviewProjectId"),
  title: varchar("title", { length: 180 }).notNull(),
  researchIdea: text("researchIdea").notNull(),
  problemStatement: text("problemStatement"),
  researchQuestion: text("researchQuestion"),
  targetAgency: varchar("targetAgency", { length: 180 }),
  resources: text("resources"),
  status: mysqlEnum("status", ["draft", "maturing", "ready"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("lapis_projects_user_idx").on(table.userId), index("lapis_projects_review_idx").on(table.reviewProjectId)]);

export const lapisAnalyses = mysqlTable("lapis_analyses", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  kind: mysqlEnum("kind", ["gaps", "originality", "grant", "feasibility"]).notNull(),
  status: mysqlEnum("status", ["idle", "generating", "ready", "error"]).default("idle").notNull(),
  content: text("content"),
  evidenceJson: text("evidenceJson").notNull(),
  model: varchar("model", { length: 100 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("lapis_analyses_project_kind_unique").on(table.lapisProjectId, table.kind)]);

export const lapisAcademicRecordSearches = mysqlTable("lapis_academic_record_searches", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  queryText: text("queryText").notNull(),
  criteriaText: text("criteriaText").notNull(),
  sourcesJson: text("sourcesJson").notNull(),
  resultCount: int("resultCount").notNull(),
  resultsJson: longtext("resultsJson").notNull(),
  queriedAt: timestamp("queriedAt").defaultNow().notNull(),
}, table => [index("lapis_record_searches_project_idx").on(table.lapisProjectId), index("lapis_record_searches_queried_idx").on(table.queriedAt)]);

export const lapisMethods = mysqlTable("lapis_methods", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  studyDesign: varchar("studyDesign", { length: 180 }),
  setting: text("setting"),
  population: text("population"),
  sampling: text("sampling"),
  inclusionCriteria: text("inclusionCriteria"),
  exclusionCriteria: text("exclusionCriteria"),
  variables: text("variables"),
  dataCollection: text("dataCollection"),
  analysisPlan: text("analysisPlan"),
  ethicsConsiderations: text("ethicsConsiderations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("lapis_methods_project_unique").on(table.lapisProjectId)]);

export const lapisPreregistrations = mysqlTable("lapis_preregistrations", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  researchQuestion: text("researchQuestion"),
  hypotheses: text("hypotheses"),
  studyDesign: varchar("studyDesign", { length: 180 }),
  primaryOutcomes: text("primaryOutcomes"),
  secondaryOutcomes: text("secondaryOutcomes"),
  samplingPlan: text("samplingPlan"),
  dataCollection: text("dataCollection"),
  analysisPlan: text("analysisPlan"),
  exclusionRules: text("exclusionRules"),
  ethicsAndTransparency: text("ethicsAndTransparency"),
  deviations: text("deviations"),
  status: mysqlEnum("status", ["draft", "review", "locked"]).default("draft").notNull(),
  integrityHash: varchar("integrityHash", { length: 128 }).notNull(),
  registeredAt: timestamp("registeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("lapis_preregistrations_project_unique").on(table.lapisProjectId)]);

export const lapisPreregistrationDevilReviews = mysqlTable("lapis_preregistration_devil_reviews", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  preregistrationHash: varchar("preregistrationHash", { length: 128 }).notNull(),
  reviewJson: longtext("reviewJson").notNull(),
  model: varchar("model", { length: 180 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("lapis_prereg_devil_reviews_project_idx").on(table.lapisProjectId), index("lapis_prereg_devil_reviews_hash_idx").on(table.preregistrationHash)]);

export const lapisMilestones = mysqlTable("lapis_milestones", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  status: mysqlEnum("status", ["planned", "in_progress", "done"]).default("planned").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("lapis_milestones_project_idx").on(table.lapisProjectId)]);

export const articleScreenings = mysqlTable("article_screenings", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  articleId: int("articleId").notNull(),
  stage: mysqlEnum("stage", ["title_abstract", "full_text"]).default("title_abstract").notNull(),
  decision: mysqlEnum("decision", ["pending", "included", "excluded"]).default("pending").notNull(),
  reason: text("reason"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("article_screenings_project_article_unique").on(table.projectId, table.articleId),
  index("article_screenings_project_idx").on(table.projectId),
]);

export const narrativeThemes = mysqlTable("narrative_themes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  interpretation: text("interpretation").notNull(),
  articleIdsJson: text("articleIdsJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("narrative_themes_project_idx").on(table.projectId)]);

export const articleDocuments = mysqlTable("article_documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  articleId: int("articleId").notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: text("storageUrl").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  byteSize: int("byteSize").notNull(),
  pageCount: int("pageCount"),
  extractionStatus: mysqlEnum("extractionStatus", ["pending", "ready", "error"]).default("pending").notNull(),
  fullText: longtext("fullText"),
  errorMessage: text("errorMessage"),
  extractedAt: timestamp("extractedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("article_documents_article_unique").on(table.articleId),
  index("article_documents_project_idx").on(table.projectId),
]);

export const grantOpportunities = mysqlTable("grant_opportunities", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["cnpq", "capes"]).notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  sourceKey: varchar("sourceKey", { length: 512 }).notNull(),
  title: text("title").notNull(),
  summaryLiteral: text("summaryLiteral"),
  statusLabel: varchar("statusLabel", { length: 160 }),
  publishedAt: timestamp("publishedAt"),
  deadlineAt: timestamp("deadlineAt"),
  sourceFetchedAt: timestamp("sourceFetchedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("grant_opportunities_source_unique").on(table.provider, table.sourceKey),
  index("grant_opportunities_provider_idx").on(table.provider),
]);

export const lapisGrantSelections = mysqlTable("lapis_grant_selections", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  grantOpportunityId: int("grantOpportunityId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("lapis_grant_selections_unique").on(table.lapisProjectId, table.grantOpportunityId),
  index("lapis_grant_selections_project_idx").on(table.lapisProjectId),
]);

export const lapisManuscripts = mysqlTable("lapis_manuscripts", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  abstract: text("abstract"),
  keywords: text("keywords"),
  sectionsJson: longtext("sectionsJson").notNull(),
  status: mysqlEnum("status", ["draft", "review", "ready"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("lapis_manuscripts_project_unique").on(table.lapisProjectId)]);

export const vaultDatasets = mysqlTable("vault_datasets", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  dataType: mysqlEnum("dataType", ["tabular", "qualitative", "image", "audio", "other"]).notNull(),
  storageLocation: text("storageLocation"),
  persistentIdentifier: varchar("persistentIdentifier", { length: 500 }),
  license: varchar("license", { length: 255 }),
  accessLevel: mysqlEnum("accessLevel", ["open", "restricted", "controlled", "private"]).default("private").notNull(),
  containsPersonalData: boolean("containsPersonalData").default(false).notNull(),
  lawfulBasis: text("lawfulBasis"),
  consentStatus: mysqlEnum("consentStatus", ["not_applicable", "pending", "documented", "withdrawn"]).default("not_applicable").notNull(),
  anonymizationPlan: text("anonymizationPlan"),
  retentionPolicy: text("retentionPolicy"),
  metadataJson: longtext("metadataJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("vault_datasets_project_idx").on(table.lapisProjectId)]);

export const qualiaCorpora = mysqlTable("qualia_corpora", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  sourceScope: text("sourceScope"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("qualia_corpora_project_idx").on(table.lapisProjectId)]);

export const qualiaCodes = mysqlTable("qualia_codes", {
  id: int("id").autoincrement().primaryKey(),
  corpusId: int("corpusId").notNull(),
  parentCodeId: int("parentCodeId"),
  label: varchar("label", { length: 180 }).notNull(),
  definition: text("definition").notNull(),
  color: varchar("color", { length: 20 }).default("#B45309").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("qualia_codes_corpus_idx").on(table.corpusId), index("qualia_codes_parent_idx").on(table.parentCodeId)]);

export const qualiaExcerpts = mysqlTable("qualia_excerpts", {
  id: int("id").autoincrement().primaryKey(),
  corpusId: int("corpusId").notNull(),
  codeId: int("codeId"),
  sourceLabel: varchar("sourceLabel", { length: 255 }).notNull(),
  content: longtext("content").notNull(),
  analyticMemo: text("analyticMemo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("qualia_excerpts_corpus_idx").on(table.corpusId), index("qualia_excerpts_code_idx").on(table.codeId)]);

export const qualiaSources = mysqlTable("qualia_sources", {
  id: int("id").autoincrement().primaryKey(),
  corpusId: int("corpusId").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  mediaType: mysqlEnum("mediaType", ["text", "audio", "image", "video", "document"]).notNull(),
  storageKey: varchar("storageKey", { length: 1000 }),
  mediaUrl: text("mediaUrl"),
  mimeType: varchar("mimeType", { length: 180 }),
  transcription: longtext("transcription"),
  researcherDescription: text("researcherDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("qualia_sources_corpus_idx").on(table.corpusId), index("qualia_sources_media_type_idx").on(table.mediaType)]);

export const qualiaCodeSuggestions = mysqlTable("qualia_code_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  corpusId: int("corpusId").notNull(),
  excerptId: int("excerptId").notNull(),
  suggestedLabel: varchar("suggestedLabel", { length: 180 }).notNull(),
  proposedTheme: varchar("proposedTheme", { length: 255 }),
  rationale: text("rationale").notNull(),
  evidence: text("evidence").notNull(),
  confidence: int("confidence").notNull(),
  status: mysqlEnum("status", ["suggested", "accepted", "rejected"]).default("suggested").notNull(),
  researcherNote: text("researcherNote"),
  modelId: varchar("modelId", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("qualia_code_suggestions_corpus_idx").on(table.corpusId), index("qualia_code_suggestions_excerpt_idx").on(table.excerptId), index("qualia_code_suggestions_status_idx").on(table.status)]);

export const qualiaCodingDecisions = mysqlTable("qualia_coding_decisions", {
  id: int("id").autoincrement().primaryKey(),
  corpusId: int("corpusId").notNull(),
  excerptId: int("excerptId").notNull(),
  codeId: int("codeId").notNull(),
  coderLabel: varchar("coderLabel", { length: 180 }).notNull(),
  decision: mysqlEnum("decision", ["applied", "not_applied", "uncertain"]).notNull(),
  rationale: text("rationale"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("qualia_coding_decisions_unique").on(table.corpusId, table.excerptId, table.codeId, table.coderLabel), index("qualia_coding_decisions_corpus_idx").on(table.corpusId), index("qualia_coding_decisions_excerpt_idx").on(table.excerptId)]);

export const qualiaMemos = mysqlTable("qualia_memos", {
  id: int("id").autoincrement().primaryKey(),
  corpusId: int("corpusId").notNull(),
  excerptId: int("excerptId"),
  title: varchar("title", { length: 255 }).notNull(),
  content: longtext("content").notNull(),
  memoType: mysqlEnum("memoType", ["analytic", "reflexive", "methodological"]).default("analytic").notNull(),
  authorLabel: varchar("authorLabel", { length: 180 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("qualia_memos_corpus_idx").on(table.corpusId), index("qualia_memos_excerpt_idx").on(table.excerptId)]);

export const analystPlans = mysqlTable("analyst_plans", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  researchQuestion: text("researchQuestion").notNull(),
  outcomeName: varchar("outcomeName", { length: 255 }).notNull(),
  outcomeType: mysqlEnum("outcomeType", ["continuous", "binary", "count", "ordinal", "time_to_event"]).notNull(),
  predictors: text("predictors").notNull(),
  design: text("design"),
  missingDataPlan: text("missingDataPlan"),
  recommendation: text("recommendation").notNull(),
  rationale: text("rationale").notNull(),
  assumptions: text("assumptions").notNull(),
  rCode: longtext("rCode").notNull(),
  pythonCode: longtext("pythonCode").notNull(),
  graphPlan: text("graphPlan").notNull(),
  resultsTemplate: text("resultsTemplate").notNull(),
  versionNumber: int("versionNumber").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("analyst_plans_project_unique").on(table.lapisProjectId)]);

export const analystPlanVersions = mysqlTable("analyst_plan_versions", {
  id: int("id").autoincrement().primaryKey(),
  analystPlanId: int("analystPlanId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  snapshotJson: longtext("snapshotJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("analyst_plan_versions_unique").on(table.analystPlanId, table.versionNumber), index("analyst_plan_versions_plan_idx").on(table.analystPlanId)]);

export const analystNotebooks = mysqlTable("analyst_notebooks", {
  id: int("id").autoincrement().primaryKey(),
  analystPlanId: int("analystPlanId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  language: mysqlEnum("language", ["r", "python"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  purpose: text("purpose").notNull(),
  code: longtext("code").notNull(),
  executionStatus: mysqlEnum("executionStatus", ["draft", "exported", "not_executed"]).default("not_executed").notNull(),
  inputSnapshotJson: longtext("inputSnapshotJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("analyst_notebooks_unique").on(table.analystPlanId, table.versionNumber, table.language), index("analyst_notebooks_plan_idx").on(table.analystPlanId)]);

export const scriptoriumDocuments = mysqlTable("scriptorium_documents", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  targetJournal: varchar("targetJournal", { length: 255 }),
  abstract: text("abstract"),
  sectionsJson: longtext("sectionsJson").notNull(),
  status: mysqlEnum("status", ["draft", "review", "ready"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("scriptorium_documents_project_unique").on(table.lapisProjectId)]);

export const scriptoriumVersions = mysqlTable("scriptorium_versions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  changeSummary: varchar("changeSummary", { length: 500 }).notNull(),
  snapshotJson: longtext("snapshotJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("scriptorium_versions_unique").on(table.documentId, table.versionNumber), index("scriptorium_versions_document_idx").on(table.documentId)]);

export const vaultFiles = mysqlTable("vault_files", {
  id: int("id").autoincrement().primaryKey(),
  datasetId: int("datasetId").notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: text("storageUrl").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  byteSize: int("byteSize").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  personalDataCategory: mysqlEnum("personalDataCategory", ["none", "identifiable", "sensitive", "pseudonymized", "anonymized"]).notNull(),
  processingPurpose: text("processingPurpose").notNull(),
  lawfulBasis: text("lawfulBasis"),
  consentReference: varchar("consentReference", { length: 255 }),
  consentConfirmed: boolean("consentConfirmed").default(false).notNull(),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("vault_files_dataset_idx").on(table.datasetId), index("vault_files_user_idx").on(table.uploadedByUserId)]);

export const vaultDatasetVersions = mysqlTable("vault_dataset_versions", {
  id: int("id").autoincrement().primaryKey(),
  datasetId: int("datasetId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  changeSummary: varchar("changeSummary", { length: 500 }).notNull(),
  snapshotJson: longtext("snapshotJson").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("vault_dataset_versions_unique").on(table.datasetId, table.versionNumber), index("vault_dataset_versions_dataset_idx").on(table.datasetId), index("vault_dataset_versions_user_idx").on(table.createdByUserId)]);

export const vaultDataDictionaries = mysqlTable("vault_data_dictionaries", {
  id: int("id").autoincrement().primaryKey(),
  datasetId: int("datasetId").notNull(),
  variableName: varchar("variableName", { length: 180 }).notNull(),
  variableType: mysqlEnum("variableType", ["unknown", "identifier", "integer", "number", "text", "boolean", "date", "categorical", "other"]).default("unknown").notNull(),
  description: text("description").notNull(),
  allowedValuesJson: longtext("allowedValuesJson").notNull(),
  units: varchar("units", { length: 180 }),
  missingValueRule: varchar("missingValueRule", { length: 500 }),
  source: mysqlEnum("source", ["manual", "csv_header", "cleaning_code"]).default("manual").notNull(),
  sourceDetail: varchar("sourceDetail", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("vault_data_dictionaries_unique").on(table.datasetId, table.variableName), index("vault_data_dictionaries_dataset_idx").on(table.datasetId)]);

export const vaultGovernanceRecords = mysqlTable("vault_governance_records", {
  id: int("id").autoincrement().primaryKey(),
  datasetId: int("datasetId").notNull(),
  humanSubjects: boolean("humanSubjects").default(false).notNull(),
  cepConepStatus: mysqlEnum("cepConepStatus", ["not_applicable", "planning", "submitted", "approved", "amendment_required", "closed"]).default("not_applicable").notNull(),
  approvalReference: varchar("approvalReference", { length: 255 }),
  riskLevel: mysqlEnum("riskLevel", ["not_assessed", "minimal", "moderate", "high"]).default("not_assessed").notNull(),
  dataProcessingAgreementStatus: mysqlEnum("dataProcessingAgreementStatus", ["not_applicable", "pending", "documented"]).default("not_applicable").notNull(),
  privacyImpactSummary: text("privacyImpactSummary"),
  pendingItemsJson: longtext("pendingItemsJson").notNull(),
  lastReviewedAt: timestamp("lastReviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("vault_governance_records_dataset_unique").on(table.datasetId)]);

export const vaultRepositoryPlans = mysqlTable("vault_repository_plans", {
  id: int("id").autoincrement().primaryKey(),
  datasetId: int("datasetId").notNull(),
  repository: mysqlEnum("repository", ["zenodo", "dataverse", "institutional"]).notNull(),
  status: mysqlEnum("status", ["draft", "metadata_ready", "manual_deposit", "deposited", "published", "blocked"]).default("draft").notNull(),
  destinationUrl: text("destinationUrl"),
  repositoryRecordId: varchar("repositoryRecordId", { length: 255 }),
  requirementsJson: longtext("requirementsJson").notNull(),
  metadataSnapshotJson: longtext("metadataSnapshotJson").notNull(),
  notes: text("notes"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("vault_repository_plans_unique").on(table.datasetId, table.repository), index("vault_repository_plans_dataset_idx").on(table.datasetId), index("vault_repository_plans_user_idx").on(table.createdByUserId)]);

export const vaultRepositoryAuthorizations = mysqlTable("vault_repository_authorizations", {
  id: int("id").autoincrement().primaryKey(),
  repositoryPlanId: int("repositoryPlanId").notNull(),
  action: mysqlEnum("action", ["confirmed", "revoked"]).notNull(),
  scope: mysqlEnum("scope", ["authenticate_and_prepare_deposit"]).default("authenticate_and_prepare_deposit").notNull(),
  confirmationStatement: text("confirmationStatement").notNull(),
  metadataSnapshotJson: longtext("metadataSnapshotJson").notNull(),
  confirmedByUserId: int("confirmedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("vault_repository_authorizations_plan_idx").on(table.repositoryPlanId), index("vault_repository_authorizations_user_idx").on(table.confirmedByUserId), index("vault_repository_authorizations_created_idx").on(table.createdAt)]);

export const analystVisualizations = mysqlTable("analyst_visualizations", {
  id: int("id").autoincrement().primaryKey(),
  analystPlanId: int("analystPlanId").notNull(),
  kind: mysqlEnum("kind", ["distribution", "comparison", "relationship", "effect", "survival"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  dataSourceDescription: text("dataSourceDescription").notNull(),
  specJson: longtext("specJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("analyst_visualizations_plan_idx").on(table.analystPlanId)]);

export const scriptoriumZoteroConnections = mysqlTable("scriptorium_zotero_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  libraryId: varchar("libraryId", { length: 64 }).notNull(),
  libraryType: mysqlEnum("libraryType", ["user", "group"]).default("user").notNull(),
  encryptedApiKey: longtext("encryptedApiKey").notNull(),
  keyHint: varchar("keyHint", { length: 12 }).notNull(),
  syncStatus: mysqlEnum("syncStatus", ["connected", "error", "disconnected"]).default("connected").notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("scriptorium_zotero_user_unique").on(table.userId)]);

export const scriptoriumZoteroItems = mysqlTable("scriptorium_zotero_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  itemKey: varchar("itemKey", { length: 64 }).notNull(),
  title: text("title").notNull(),
  citationKey: varchar("citationKey", { length: 255 }),
  creatorsJson: text("creatorsJson").notNull(),
  publicationYear: int("publicationYear"),
  doi: varchar("doi", { length: 255 }),
  sourceUrl: text("sourceUrl"),
  itemType: varchar("itemType", { length: 120 }),
  sourceUpdatedAt: timestamp("sourceUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("scriptorium_zotero_item_unique").on(table.userId, table.itemKey), index("scriptorium_zotero_items_user_idx").on(table.userId)]);

export const scriptoriumSubstanceReviews = mysqlTable("scriptorium_substance_reviews", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  checklistJson: longtext("checklistJson").notNull(),
  findingsJson: longtext("findingsJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("scriptorium_substance_reviews_document_idx").on(table.documentId)]);

export const matchmakerSubmissions = mysqlTable("matchmaker_submissions", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  manuscriptTitle: varchar("manuscriptTitle", { length: 255 }).notNull(),
  scopeSummary: text("scopeSummary").notNull(),
  rankedVenuesJson: longtext("rankedVenuesJson").notNull(),
  targetVenue: varchar("targetVenue", { length: 255 }),
  coverLetter: longtext("coverLetter"),
  checklistJson: longtext("checklistJson").notNull(),
  reviewerCommentsJson: longtext("reviewerCommentsJson").notNull(),
  responseDraftJson: longtext("responseDraftJson").notNull(),
  status: mysqlEnum("status", ["planning", "submitted", "revision", "accepted"]).default("planning").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("matchmaker_submissions_project_unique").on(table.lapisProjectId)]);

export const vigilAssessments = mysqlTable("vigil_assessments", {
  id: int("id").autoincrement().primaryKey(),
  lapisProjectId: int("lapisProjectId").notNull(),
  documentId: int("documentId"),
  integrityChecklistJson: longtext("integrityChecklistJson").notNull(),
  referenceAlertsJson: longtext("referenceAlertsJson").notNull(),
  supplementaryJson: longtext("supplementaryJson").notNull(),
  disseminationJson: longtext("disseminationJson").notNull(),
  status: mysqlEnum("status", ["draft", "review", "monitoring"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("vigil_assessments_project_unique").on(table.lapisProjectId)]);

export type ReviewProject = typeof reviewProjects.$inferSelect;
export type SavedArticle = typeof savedArticles.$inferSelect;
export type ArticleExtraction = typeof articleExtractions.$inferSelect;
export type ProjectSynthesis = typeof projectSyntheses.$inferSelect;
export type LapisProject = typeof lapisProjects.$inferSelect;
export type LapisAnalysis = typeof lapisAnalyses.$inferSelect;
export type LapisMethod = typeof lapisMethods.$inferSelect;
export type LapisPreregistration = typeof lapisPreregistrations.$inferSelect;
export type LapisMilestone = typeof lapisMilestones.$inferSelect;
export type ArticleScreening = typeof articleScreenings.$inferSelect;
export type NarrativeTheme = typeof narrativeThemes.$inferSelect;
export type ArticleDocument = typeof articleDocuments.$inferSelect;
export type GrantOpportunity = typeof grantOpportunities.$inferSelect;
export type LapisGrantSelection = typeof lapisGrantSelections.$inferSelect;
export type LapisManuscript = typeof lapisManuscripts.$inferSelect;
export type VaultDataset = typeof vaultDatasets.$inferSelect;
export type QualiaCorpus = typeof qualiaCorpora.$inferSelect;
export type QualiaCode = typeof qualiaCodes.$inferSelect;
export type QualiaExcerpt = typeof qualiaExcerpts.$inferSelect;
export type QualiaSource = typeof qualiaSources.$inferSelect;
export type QualiaCodeSuggestion = typeof qualiaCodeSuggestions.$inferSelect;
export type QualiaCodingDecision = typeof qualiaCodingDecisions.$inferSelect;
export type QualiaMemo = typeof qualiaMemos.$inferSelect;
export type AnalystPlan = typeof analystPlans.$inferSelect;
export type AnalystPlanVersion = typeof analystPlanVersions.$inferSelect;
export type AnalystNotebook = typeof analystNotebooks.$inferSelect;
export type ScriptoriumDocument = typeof scriptoriumDocuments.$inferSelect;
export type ScriptoriumVersion = typeof scriptoriumVersions.$inferSelect;
export type VaultFile = typeof vaultFiles.$inferSelect;
export type AnalystVisualization = typeof analystVisualizations.$inferSelect;
export type ScriptoriumZoteroConnection = typeof scriptoriumZoteroConnections.$inferSelect;
export type ScriptoriumZoteroItem = typeof scriptoriumZoteroItems.$inferSelect;
export type ScriptoriumSubstanceReview = typeof scriptoriumSubstanceReviews.$inferSelect;
export type MatchmakerSubmission = typeof matchmakerSubmissions.$inferSelect;
export type VigilAssessment = typeof vigilAssessments.$inferSelect;
