import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { analystNotebooks, analystPlanVersions, analystPlans, analystVisualizations, articleDocuments, articleExtractions, ArticleExtraction, articleScreenings, grantOpportunities, InsertUser, lapisAcademicRecordSearches, lapisAnalyses, lapisGrantSelections, lapisManuscripts, lapisMethods, lapisMilestones, lapisPreregistrationDevilReviews, lapisPreregistrations, lapisProjects, matchmakerSubmissions, narrativeThemes, projectSyntheses, qualiaCodeSuggestions, qualiaCodes, qualiaCodingDecisions, qualiaCorpora, qualiaExcerpts, qualiaMemos, qualiaSources, reviewProjects, savedArticles, scriptoriumDocuments, scriptoriumSubstanceReviews, scriptoriumVersions, scriptoriumZoteroConnections, scriptoriumZoteroItems, users, vaultDataDictionaries, vaultDatasetVersions, vaultDatasets, vaultFiles, vaultGovernanceRecords, vaultRepositoryAuthorizations, vaultRepositoryPlans, vigilAssessments } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getProjectsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewProjects).where(eq(reviewProjects.userId, userId)).orderBy(desc(reviewProjects.updatedAt));
}

export async function getProjectForUser(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(reviewProjects).where(and(eq(reviewProjects.id, projectId), eq(reviewProjects.userId, userId))).limit(1);
  return rows[0];
}

export async function createReviewProject(userId: number, name: string, researchQuestion?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(reviewProjects).values({ userId, name, researchQuestion: researchQuestion || null });
  return Number(result[0].insertId);
}

export async function getSavedArticles(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedArticles).where(eq(savedArticles.projectId, projectId)).orderBy(desc(savedArticles.savedAt));
}

export async function getArticleForProject(articleId: number, projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(savedArticles).where(and(eq(savedArticles.id, articleId), eq(savedArticles.projectId, projectId))).limit(1);
  return rows[0];
}

export async function getExtraction(articleId: number): Promise<ArticleExtraction | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(articleExtractions).where(eq(articleExtractions.articleId, articleId)).limit(1);
  return rows[0];
}

export async function getProjectSynthesis(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(projectSyntheses).where(eq(projectSyntheses.projectId, projectId)).limit(1);
  return rows[0];
}

export async function getProjectMetrics(projectId: number) {
  const db = await getDb();
  if (!db) return { saved: 0, read: 0, extracted: 0 };
  const rows = await db
    .select({
      saved: sql<number>`count(${savedArticles.id})`,
      read: sql<number>`sum(case when ${savedArticles.isRead} then 1 else 0 end)`,
      extracted: sql<number>`sum(case when ${articleExtractions.id} is not null then 1 else 0 end)`,
    })
    .from(savedArticles)
    .leftJoin(articleExtractions, eq(articleExtractions.articleId, savedArticles.id))
    .where(eq(savedArticles.projectId, projectId));
  return { saved: Number(rows[0]?.saved ?? 0), read: Number(rows[0]?.read ?? 0), extracted: Number(rows[0]?.extracted ?? 0) };
}

export async function saveArticle(projectId: number, article: {
  externalId: string;
  source: "semantic_scholar" | "openalex" | "europe_pmc" | "pubmed" | "crossref" | "scielo" | "openaire" | "arxiv" | "core";
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  doi: string | null;
  citationCount: number;
  relevanceScore: number;
  url: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(savedArticles).values({
    projectId,
    externalId: article.externalId,
    source: article.source,
    title: article.title,
    authorsJson: JSON.stringify(article.authors),
    publicationYear: article.year,
    abstract: article.abstract,
    doi: article.doi,
    citationCount: article.citationCount,
    relevanceScore: article.relevanceScore,
    sourceUrl: article.url,
  }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
}

export async function setArticleReadState(articleId: number, isRead: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(savedArticles).set({ isRead }).where(eq(savedArticles.id, articleId));
}

export async function removeSavedArticle(articleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(articleExtractions).where(eq(articleExtractions.articleId, articleId));
  await db.delete(articleScreenings).where(eq(articleScreenings.articleId, articleId));
  await db.delete(articleDocuments).where(eq(articleDocuments.articleId, articleId));
  await db.delete(savedArticles).where(eq(savedArticles.id, articleId));
}

export async function getArticleDocument(articleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(articleDocuments).where(eq(articleDocuments.articleId, articleId)).limit(1);
  return rows[0];
}

export async function upsertArticleDocument(document: {
  projectId: number;
  articleId: number;
  originalFilename: string;
  storageKey: string;
  storageUrl: string;
  mimeType: string;
  byteSize: number;
  pageCount?: number | null;
  extractionStatus: "pending" | "ready" | "error";
  fullText?: string | null;
  errorMessage?: string | null;
  extractedAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(articleDocuments).values(document).onDuplicateKeyUpdate({
    set: { ...document, updatedAt: new Date() },
  });
}

export async function upsertExtraction(articleId: number, extraction: {
  objective: string;
  methodology: string;
  sample: string;
  mainFindings: string;
  limitations: string;
  evidenceJson: string;
  model: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(articleExtractions).values({ articleId, ...extraction }).onDuplicateKeyUpdate({
    set: { ...extraction, updatedAt: new Date() },
  });
}

export async function setProjectSynthesis(projectId: number, synthesis: {
  status: "idle" | "generating" | "ready" | "error";
  content?: string | null;
  citationsJson: string;
  model?: string | null;
  errorMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(projectSyntheses).values({ projectId, ...synthesis }).onDuplicateKeyUpdate({
    set: { ...synthesis, updatedAt: new Date() },
  });
}

export async function getLapisProjectsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lapisProjects).where(eq(lapisProjects.userId, userId)).orderBy(desc(lapisProjects.updatedAt));
}

export async function getLapisProjectForUser(lapisProjectId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(lapisProjects).where(and(eq(lapisProjects.id, lapisProjectId), eq(lapisProjects.userId, userId))).limit(1);
  return rows[0];
}

export async function createLapisProject(userId: number, project: {
  title: string;
  researchIdea: string;
  problemStatement?: string;
  researchQuestion?: string;
  targetAgency?: string;
  resources?: string;
  reviewProjectId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(lapisProjects).values({
    userId,
    title: project.title,
    researchIdea: project.researchIdea,
    problemStatement: project.problemStatement || null,
    researchQuestion: project.researchQuestion || null,
    targetAgency: project.targetAgency || null,
    resources: project.resources || null,
    reviewProjectId: project.reviewProjectId ?? null,
  });
  return Number(result[0].insertId);
}

export async function updateLapisProject(lapisProjectId: number, project: {
  title: string;
  researchIdea: string;
  problemStatement?: string;
  researchQuestion?: string;
  targetAgency?: string;
  resources?: string;
  reviewProjectId?: number | null;
  status?: "draft" | "maturing" | "ready";
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(lapisProjects).set({
    title: project.title,
    researchIdea: project.researchIdea,
    problemStatement: project.problemStatement || null,
    researchQuestion: project.researchQuestion || null,
    targetAgency: project.targetAgency || null,
    resources: project.resources || null,
    reviewProjectId: project.reviewProjectId ?? null,
    status: project.status ?? "draft",
    updatedAt: new Date(),
  }).where(eq(lapisProjects.id, lapisProjectId));
}

export async function removeLapisProject(lapisProjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const corpora = await db.select({ id: qualiaCorpora.id }).from(qualiaCorpora).where(eq(qualiaCorpora.lapisProjectId, lapisProjectId));
  for (const corpus of corpora) {
    await db.delete(qualiaExcerpts).where(eq(qualiaExcerpts.corpusId, corpus.id));
    await db.delete(qualiaCodes).where(eq(qualiaCodes.corpusId, corpus.id));
  }
  const plans = await db.select({ id: analystPlans.id }).from(analystPlans).where(eq(analystPlans.lapisProjectId, lapisProjectId));
  for (const plan of plans) await db.delete(analystPlanVersions).where(eq(analystPlanVersions.analystPlanId, plan.id));
  const documents = await db.select({ id: scriptoriumDocuments.id }).from(scriptoriumDocuments).where(eq(scriptoriumDocuments.lapisProjectId, lapisProjectId));
  for (const document of documents) await db.delete(scriptoriumVersions).where(eq(scriptoriumVersions.documentId, document.id));
  await db.delete(qualiaCorpora).where(eq(qualiaCorpora.lapisProjectId, lapisProjectId));
  await db.delete(analystPlans).where(eq(analystPlans.lapisProjectId, lapisProjectId));
  await db.delete(scriptoriumDocuments).where(eq(scriptoriumDocuments.lapisProjectId, lapisProjectId));
  await db.delete(vaultDatasets).where(eq(vaultDatasets.lapisProjectId, lapisProjectId));
  await db.delete(lapisAcademicRecordSearches).where(eq(lapisAcademicRecordSearches.lapisProjectId, lapisProjectId));
  await db.delete(lapisAnalyses).where(eq(lapisAnalyses.lapisProjectId, lapisProjectId));
  await db.delete(lapisMilestones).where(eq(lapisMilestones.lapisProjectId, lapisProjectId));
  await db.delete(lapisMethods).where(eq(lapisMethods.lapisProjectId, lapisProjectId));
  await db.delete(lapisPreregistrations).where(eq(lapisPreregistrations.lapisProjectId, lapisProjectId));
  await db.delete(lapisGrantSelections).where(eq(lapisGrantSelections.lapisProjectId, lapisProjectId));
  await db.delete(lapisManuscripts).where(eq(lapisManuscripts.lapisProjectId, lapisProjectId));
  await db.delete(lapisProjects).where(eq(lapisProjects.id, lapisProjectId));
}

export async function getLapisAnalyses(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lapisAnalyses).where(eq(lapisAnalyses.lapisProjectId, lapisProjectId));
}

export type LapisAcademicRecordSearchInput = {
  queryText: string;
  criteriaText: string;
  sourcesJson: string;
  resultCount: number;
  resultsJson: string;
};

export async function createLapisAcademicRecordSearch(lapisProjectId: number, search: LapisAcademicRecordSearchInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(lapisAcademicRecordSearches).values({ lapisProjectId, ...search });
  return Number(result[0].insertId);
}

export async function getLapisAcademicRecordSearches(lapisProjectId: number, limit = 8) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lapisAcademicRecordSearches).where(eq(lapisAcademicRecordSearches.lapisProjectId, lapisProjectId)).orderBy(desc(lapisAcademicRecordSearches.queriedAt)).limit(limit);
}

export async function getLapisMethod(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(lapisMethods).where(eq(lapisMethods.lapisProjectId, lapisProjectId)).limit(1);
  return rows[0];
}

export type LapisMethodInput = {
  studyDesign?: string | null;
  setting?: string | null;
  population?: string | null;
  sampling?: string | null;
  inclusionCriteria?: string | null;
  exclusionCriteria?: string | null;
  variables?: string | null;
  dataCollection?: string | null;
  analysisPlan?: string | null;
  ethicsConsiderations?: string | null;
};

export async function upsertLapisMethod(lapisProjectId: number, method: LapisMethodInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(lapisMethods).values({ lapisProjectId, ...method }).onDuplicateKeyUpdate({
    set: { ...method, updatedAt: new Date() },
  });
}

export async function getLapisPreregistration(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(lapisPreregistrations).where(eq(lapisPreregistrations.lapisProjectId, lapisProjectId)).limit(1);
  return rows[0];
}

export type LapisPreregistrationInput = {
  title: string;
  researchQuestion?: string | null;
  hypotheses?: string | null;
  studyDesign?: string | null;
  primaryOutcomes?: string | null;
  secondaryOutcomes?: string | null;
  samplingPlan?: string | null;
  dataCollection?: string | null;
  analysisPlan?: string | null;
  exclusionRules?: string | null;
  ethicsAndTransparency?: string | null;
  deviations?: string | null;
  status: "draft" | "review";
  integrityHash: string;
};

export async function upsertLapisPreregistration(lapisProjectId: number, preregistration: LapisPreregistrationInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(lapisPreregistrations).values({ lapisProjectId, ...preregistration }).onDuplicateKeyUpdate({
    set: { ...preregistration, updatedAt: new Date() },
  });
}

export async function lockLapisPreregistration(lapisProjectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(lapisPreregistrations).set({ status: "locked", registeredAt: new Date(), updatedAt: new Date() }).where(eq(lapisPreregistrations.lapisProjectId, lapisProjectId));
}

export async function getLapisPreregistrationDevilReviews(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lapisPreregistrationDevilReviews).where(eq(lapisPreregistrationDevilReviews.lapisProjectId, lapisProjectId)).orderBy(lapisPreregistrationDevilReviews.createdAt);
}

export async function createLapisPreregistrationDevilReview(lapisProjectId: number, review: { preregistrationHash: string; reviewJson: string; model: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(lapisPreregistrationDevilReviews).values({ lapisProjectId, ...review });
  return Number(result[0].insertId);
}

export async function getLapisMilestones(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lapisMilestones).where(eq(lapisMilestones.lapisProjectId, lapisProjectId)).orderBy(lapisMilestones.sortOrder, lapisMilestones.startDate);
}

export type LapisMilestoneInput = {
  title: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  status: "planned" | "in_progress" | "done";
  sortOrder: number;
};

export async function createLapisMilestone(lapisProjectId: number, milestone: LapisMilestoneInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(lapisMilestones).values({ lapisProjectId, ...milestone });
  return Number(result[0].insertId);
}

export async function updateLapisMilestone(lapisProjectId: number, milestoneId: number, milestone: LapisMilestoneInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(lapisMilestones).set({ ...milestone, updatedAt: new Date() }).where(and(eq(lapisMilestones.id, milestoneId), eq(lapisMilestones.lapisProjectId, lapisProjectId)));
}

export async function removeLapisMilestone(lapisProjectId: number, milestoneId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(lapisMilestones).where(and(eq(lapisMilestones.id, milestoneId), eq(lapisMilestones.lapisProjectId, lapisProjectId)));
}

export async function setLapisAnalysis(lapisProjectId: number, analysis: {
  kind: "gaps" | "originality" | "grant" | "feasibility";
  status: "idle" | "generating" | "ready" | "error";
  content?: string | null;
  evidenceJson: string;
  model?: string | null;
  errorMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(lapisAnalyses).values({ lapisProjectId, ...analysis }).onDuplicateKeyUpdate({
    set: { ...analysis, updatedAt: new Date() },
  });
}

export async function getProjectScreenings(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(articleScreenings).where(eq(articleScreenings.projectId, projectId));
}

export async function upsertArticleScreening(projectId: number, articleId: number, screening: {
  stage: "title_abstract" | "full_text";
  decision: "pending" | "included" | "excluded";
  reason?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(articleScreenings).values({ projectId, articleId, ...screening }).onDuplicateKeyUpdate({
    set: { ...screening, updatedAt: new Date() },
  });
}

export async function getNarrativeThemes(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(narrativeThemes).where(eq(narrativeThemes.projectId, projectId)).orderBy(desc(narrativeThemes.updatedAt));
}

export async function createNarrativeTheme(projectId: number, theme: { title: string; interpretation: string; articleIdsJson: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(narrativeThemes).values({ projectId, ...theme });
  return Number(result[0].insertId);
}

export async function updateNarrativeTheme(projectId: number, themeId: number, theme: { title: string; interpretation: string; articleIdsJson: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(narrativeThemes).set({ ...theme, updatedAt: new Date() }).where(and(eq(narrativeThemes.id, themeId), eq(narrativeThemes.projectId, projectId)));
}

export async function removeNarrativeTheme(projectId: number, themeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(narrativeThemes).where(and(eq(narrativeThemes.id, themeId), eq(narrativeThemes.projectId, projectId)));
}

export async function getGrantOpportunities(provider?: "cnpq" | "capes") {
  const db = await getDb();
  if (!db) return [];
  return provider
    ? db.select().from(grantOpportunities).where(eq(grantOpportunities.provider, provider)).orderBy(desc(grantOpportunities.sourceFetchedAt))
    : db.select().from(grantOpportunities).orderBy(desc(grantOpportunities.sourceFetchedAt));
}

export type GrantOpportunityInput = {
  provider: "cnpq" | "capes";
  sourceUrl: string;
  sourceKey: string;
  title: string;
  summaryLiteral?: string | null;
  statusLabel?: string | null;
  publishedAt?: Date | null;
  deadlineAt?: Date | null;
  sourceFetchedAt: Date;
};

export async function upsertGrantOpportunity(opportunity: GrantOpportunityInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(grantOpportunities).values(opportunity).onDuplicateKeyUpdate({
    set: { ...opportunity, updatedAt: new Date() },
  });
}

export async function getLapisGrantSelections(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ opportunity: grantOpportunities, selection: lapisGrantSelections })
    .from(lapisGrantSelections)
    .innerJoin(grantOpportunities, eq(lapisGrantSelections.grantOpportunityId, grantOpportunities.id))
    .where(eq(lapisGrantSelections.lapisProjectId, lapisProjectId))
    .orderBy(desc(lapisGrantSelections.createdAt));
}

export async function selectLapisGrant(lapisProjectId: number, grantOpportunityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(lapisGrantSelections).values({ lapisProjectId, grantOpportunityId }).onDuplicateKeyUpdate({ set: { createdAt: new Date() } });
}

export async function removeLapisGrantSelection(lapisProjectId: number, grantOpportunityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(lapisGrantSelections).where(and(eq(lapisGrantSelections.lapisProjectId, lapisProjectId), eq(lapisGrantSelections.grantOpportunityId, grantOpportunityId)));
}

export async function getLapisManuscript(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(lapisManuscripts).where(eq(lapisManuscripts.lapisProjectId, lapisProjectId)).limit(1);
  return rows[0];
}

export async function upsertLapisManuscript(lapisProjectId: number, manuscript: {
  title: string;
  abstract?: string | null;
  keywords?: string | null;
  sectionsJson: string;
  status: "draft" | "review" | "ready";
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(lapisManuscripts).values({ lapisProjectId, ...manuscript }).onDuplicateKeyUpdate({
    set: { ...manuscript, updatedAt: new Date() },
  });
}

export type VaultDatasetInput = {
  title: string; description: string; dataType: "tabular" | "qualitative" | "image" | "audio" | "other";
  storageLocation?: string | null; persistentIdentifier?: string | null; license?: string | null;
  accessLevel: "open" | "restricted" | "controlled" | "private"; containsPersonalData: boolean;
  lawfulBasis?: string | null; consentStatus: "not_applicable" | "pending" | "documented" | "withdrawn";
  anonymizationPlan?: string | null; retentionPolicy?: string | null; metadataJson: string;
};

export async function getVaultDatasets(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vaultDatasets).where(eq(vaultDatasets.lapisProjectId, lapisProjectId)).orderBy(desc(vaultDatasets.updatedAt));
}

export async function createVaultDataset(lapisProjectId: number, dataset: VaultDatasetInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(vaultDatasets).values({ lapisProjectId, ...dataset });
  return Number(result[0].insertId);
}

export async function updateVaultDataset(lapisProjectId: number, datasetId: number, dataset: VaultDatasetInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(vaultDatasets).set({ ...dataset, updatedAt: new Date() }).where(and(eq(vaultDatasets.id, datasetId), eq(vaultDatasets.lapisProjectId, lapisProjectId)));
}

export async function getVaultDataset(lapisProjectId: number, datasetId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(vaultDatasets).where(and(eq(vaultDatasets.id, datasetId), eq(vaultDatasets.lapisProjectId, lapisProjectId))).limit(1);
  return rows[0];
}

export type VaultFileInput = { originalFilename: string; storageKey: string; storageUrl: string; mimeType: string; byteSize: number; sha256: string; personalDataCategory: "none" | "identifiable" | "sensitive" | "pseudonymized" | "anonymized"; processingPurpose: string; lawfulBasis?: string | null; consentReference?: string | null; consentConfirmed: boolean; uploadedByUserId: number };

export async function getVaultFiles(datasetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vaultFiles).where(eq(vaultFiles.datasetId, datasetId)).orderBy(desc(vaultFiles.createdAt));
}

export async function createVaultFile(datasetId: number, file: VaultFileInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(vaultFiles).values({ datasetId, ...file, lawfulBasis: file.lawfulBasis ?? null, consentReference: file.consentReference ?? null });
  return Number(result[0].insertId);
}

export async function getVaultDatasetVersions(datasetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vaultDatasetVersions).where(eq(vaultDatasetVersions.datasetId, datasetId)).orderBy(desc(vaultDatasetVersions.versionNumber));
}

export async function createVaultDatasetVersion(datasetId: number, createdByUserId: number, changeSummary: string, snapshotJson: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const current = await db.select({ versionNumber: vaultDatasetVersions.versionNumber }).from(vaultDatasetVersions).where(eq(vaultDatasetVersions.datasetId, datasetId)).orderBy(desc(vaultDatasetVersions.versionNumber)).limit(1);
  const versionNumber = (current[0]?.versionNumber ?? 0) + 1;
  const result = await db.insert(vaultDatasetVersions).values({ datasetId, versionNumber, changeSummary, snapshotJson, createdByUserId });
  return { versionId: Number(result[0].insertId), versionNumber };
}

export type VaultDataDictionaryInput = {
  variableName: string;
  variableType: "unknown" | "identifier" | "integer" | "number" | "text" | "boolean" | "date" | "categorical" | "other";
  description: string;
  allowedValuesJson: string;
  units?: string | null;
  missingValueRule?: string | null;
  source: "manual" | "csv_header" | "cleaning_code";
  sourceDetail?: string | null;
};

export async function getVaultDataDictionary(datasetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vaultDataDictionaries).where(eq(vaultDataDictionaries.datasetId, datasetId)).orderBy(vaultDataDictionaries.variableName);
}

export async function upsertVaultDataDictionaryEntry(datasetId: number, entry: VaultDataDictionaryInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(vaultDataDictionaries).values({ datasetId, ...entry, units: entry.units ?? null, missingValueRule: entry.missingValueRule ?? null, sourceDetail: entry.sourceDetail ?? null }).onDuplicateKeyUpdate({
    set: { ...entry, units: entry.units ?? null, missingValueRule: entry.missingValueRule ?? null, sourceDetail: entry.sourceDetail ?? null, updatedAt: new Date() },
  });
}

export type VaultGovernanceInput = {
  humanSubjects: boolean;
  cepConepStatus: "not_applicable" | "planning" | "submitted" | "approved" | "amendment_required" | "closed";
  approvalReference?: string | null;
  riskLevel: "not_assessed" | "minimal" | "moderate" | "high";
  dataProcessingAgreementStatus: "not_applicable" | "pending" | "documented";
  privacyImpactSummary?: string | null;
  pendingItemsJson: string;
  lastReviewedAt?: Date | null;
};

export async function getVaultGovernanceRecord(datasetId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(vaultGovernanceRecords).where(eq(vaultGovernanceRecords.datasetId, datasetId)).limit(1);
  return rows[0];
}

export async function upsertVaultGovernanceRecord(datasetId: number, governance: VaultGovernanceInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const values = { datasetId, ...governance, approvalReference: governance.approvalReference ?? null, privacyImpactSummary: governance.privacyImpactSummary ?? null, lastReviewedAt: governance.lastReviewedAt ?? null };
  await db.insert(vaultGovernanceRecords).values(values).onDuplicateKeyUpdate({ set: { ...governance, approvalReference: governance.approvalReference ?? null, privacyImpactSummary: governance.privacyImpactSummary ?? null, lastReviewedAt: governance.lastReviewedAt ?? null, updatedAt: new Date() } });
}

export type VaultRepositoryPlanInput = {
  repository: "zenodo" | "dataverse" | "institutional";
  status: "draft" | "metadata_ready" | "manual_deposit" | "deposited" | "published" | "blocked";
  destinationUrl?: string | null;
  repositoryRecordId?: string | null;
  requirementsJson: string;
  metadataSnapshotJson: string;
  notes?: string | null;
  createdByUserId: number;
};

export async function getVaultRepositoryPlans(datasetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vaultRepositoryPlans).where(eq(vaultRepositoryPlans.datasetId, datasetId)).orderBy(desc(vaultRepositoryPlans.updatedAt));
}

export async function upsertVaultRepositoryPlan(datasetId: number, plan: VaultRepositoryPlanInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const values = { datasetId, ...plan, destinationUrl: plan.destinationUrl ?? null, repositoryRecordId: plan.repositoryRecordId ?? null, notes: plan.notes ?? null };
  await db.insert(vaultRepositoryPlans).values(values).onDuplicateKeyUpdate({
    set: { status: plan.status, destinationUrl: plan.destinationUrl ?? null, repositoryRecordId: plan.repositoryRecordId ?? null, requirementsJson: plan.requirementsJson, metadataSnapshotJson: plan.metadataSnapshotJson, notes: plan.notes ?? null, createdByUserId: plan.createdByUserId, updatedAt: new Date() },
  });
}

export type VaultRepositoryAuthorizationInput = {
  action: "confirmed" | "revoked";
  confirmationStatement: string;
  metadataSnapshotJson: string;
  confirmedByUserId: number;
};

export async function getVaultRepositoryAuthorizations(repositoryPlanId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vaultRepositoryAuthorizations).where(eq(vaultRepositoryAuthorizations.repositoryPlanId, repositoryPlanId)).orderBy(desc(vaultRepositoryAuthorizations.createdAt));
}

export async function createVaultRepositoryAuthorization(repositoryPlanId: number, authorization: VaultRepositoryAuthorizationInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(vaultRepositoryAuthorizations).values({ repositoryPlanId, ...authorization });
  return Number(result[0].insertId);
}

export async function getQualiaCorpora(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qualiaCorpora).where(eq(qualiaCorpora.lapisProjectId, lapisProjectId)).orderBy(desc(qualiaCorpora.updatedAt));
}

export async function getQualiaCorpus(corpusId: number, lapisProjectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(qualiaCorpora).where(and(eq(qualiaCorpora.id, corpusId), eq(qualiaCorpora.lapisProjectId, lapisProjectId))).limit(1);
  return rows[0];
}

export async function createQualiaCorpus(lapisProjectId: number, corpus: { title: string; description: string; sourceScope?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(qualiaCorpora).values({ lapisProjectId, ...corpus });
  return Number(result[0].insertId);
}

export async function getQualiaCodes(corpusId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qualiaCodes).where(eq(qualiaCodes.corpusId, corpusId)).orderBy(qualiaCodes.label);
}

export async function createQualiaCode(corpusId: number, code: { parentCodeId?: number | null; label: string; definition: string; color?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(qualiaCodes).values({ corpusId, parentCodeId: code.parentCodeId ?? null, label: code.label, definition: code.definition, color: code.color ?? "#B45309" });
  return Number(result[0].insertId);
}

export async function getQualiaExcerpts(corpusId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ excerpt: qualiaExcerpts, code: qualiaCodes }).from(qualiaExcerpts).leftJoin(qualiaCodes, eq(qualiaExcerpts.codeId, qualiaCodes.id)).where(eq(qualiaExcerpts.corpusId, corpusId)).orderBy(desc(qualiaExcerpts.updatedAt));
}

export async function createQualiaExcerpt(corpusId: number, excerpt: { codeId?: number | null; sourceLabel: string; content: string; analyticMemo?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(qualiaExcerpts).values({ corpusId, codeId: excerpt.codeId ?? null, sourceLabel: excerpt.sourceLabel, content: excerpt.content, analyticMemo: excerpt.analyticMemo ?? null });
  return Number(result[0].insertId);
}

export type QualiaSourceInput = { label: string; mediaType: "text" | "audio" | "image" | "video" | "document"; storageKey?: string | null; mediaUrl?: string | null; mimeType?: string | null; transcription?: string | null; researcherDescription?: string | null };
export type QualiaSuggestionInput = { excerptId: number; suggestedLabel: string; proposedTheme?: string | null; rationale: string; evidence: string; confidence: number; modelId?: string | null };
export type QualiaCodingDecisionInput = { excerptId: number; codeId: number; coderLabel: string; decision: "applied" | "not_applied" | "uncertain"; rationale?: string | null };
export type QualiaMemoInput = { excerptId?: number | null; title: string; content: string; memoType: "analytic" | "reflexive" | "methodological"; authorLabel: string };

export async function getQualiaSources(corpusId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qualiaSources).where(eq(qualiaSources.corpusId, corpusId)).orderBy(desc(qualiaSources.updatedAt));
}

export async function getQualiaSource(sourceId: number, corpusId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(qualiaSources).where(and(eq(qualiaSources.id, sourceId), eq(qualiaSources.corpusId, corpusId))).limit(1);
  return rows[0];
}

export async function createQualiaSource(corpusId: number, source: QualiaSourceInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(qualiaSources).values({ corpusId, ...source });
  return Number(result[0].insertId);
}

export async function updateQualiaSourceTranscription(sourceId: number, corpusId: number, transcription: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(qualiaSources).set({ transcription }).where(and(eq(qualiaSources.id, sourceId), eq(qualiaSources.corpusId, corpusId)));
}

export async function getQualiaCodeSuggestions(corpusId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qualiaCodeSuggestions).where(eq(qualiaCodeSuggestions.corpusId, corpusId)).orderBy(desc(qualiaCodeSuggestions.createdAt));
}

export async function createQualiaCodeSuggestions(corpusId: number, suggestions: QualiaSuggestionInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  if (!suggestions.length) return [];
  const rows = suggestions.map(suggestion => {
    const confidence = Math.max(0, Math.min(100, Math.round(suggestion.confidence)));
    return { corpusId, ...suggestion, confidence };
  });
  const result = await db.insert(qualiaCodeSuggestions).values(rows);
  return Array.from({ length: suggestions.length }, (_, index) => Number(result[0].insertId) + index);
}

export async function decideQualiaCodeSuggestion(suggestionId: number, corpusId: number, status: "accepted" | "rejected", researcherNote?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(qualiaCodeSuggestions).set({ status, researcherNote: researcherNote ?? null }).where(and(eq(qualiaCodeSuggestions.id, suggestionId), eq(qualiaCodeSuggestions.corpusId, corpusId)));
}

export async function getQualiaCodingDecisions(corpusId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qualiaCodingDecisions).where(eq(qualiaCodingDecisions.corpusId, corpusId)).orderBy(desc(qualiaCodingDecisions.updatedAt));
}

export async function upsertQualiaCodingDecision(corpusId: number, decision: QualiaCodingDecisionInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(qualiaCodingDecisions).values({ corpusId, ...decision }).onDuplicateKeyUpdate({ set: { decision: decision.decision, rationale: decision.rationale ?? null, updatedAt: new Date() } });
}

export async function getQualiaMemos(corpusId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qualiaMemos).where(eq(qualiaMemos.corpusId, corpusId)).orderBy(desc(qualiaMemos.updatedAt));
}

export async function createQualiaMemo(corpusId: number, memo: QualiaMemoInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(qualiaMemos).values({ corpusId, ...memo, excerptId: memo.excerptId ?? null });
  return Number(result[0].insertId);
}

export type AnalystPlanInput = {
  researchQuestion: string; outcomeName: string; outcomeType: "continuous" | "binary" | "count" | "ordinal" | "time_to_event";
  predictors: string; design?: string | null; missingDataPlan?: string | null; recommendation: string; rationale: string; assumptions: string;
  rCode: string; pythonCode: string; graphPlan: string; resultsTemplate: string;
};

export async function getAnalystPlan(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(analystPlans).where(eq(analystPlans.lapisProjectId, lapisProjectId)).limit(1);
  return rows[0];
}

export async function getAnalystPlanVersions(analystPlanId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analystPlanVersions).where(eq(analystPlanVersions.analystPlanId, analystPlanId)).orderBy(desc(analystPlanVersions.versionNumber));
}

export async function upsertAnalystPlan(lapisProjectId: number, plan: AnalystPlanInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getAnalystPlan(lapisProjectId);
  const versionNumber = (existing?.versionNumber ?? 0) + 1;
  if (existing) {
    await db.update(analystPlans).set({ ...plan, versionNumber, updatedAt: new Date() }).where(eq(analystPlans.id, existing.id));
    await db.insert(analystPlanVersions).values({ analystPlanId: existing.id, versionNumber, snapshotJson: JSON.stringify({ ...plan, versionNumber }) });
    return existing.id;
  }
  const result = await db.insert(analystPlans).values({ lapisProjectId, ...plan, versionNumber });
  const id = Number(result[0].insertId);
  await db.insert(analystPlanVersions).values({ analystPlanId: id, versionNumber, snapshotJson: JSON.stringify({ ...plan, versionNumber }) });
  return id;
}

export type AnalystVisualizationInput = { kind: "distribution" | "comparison" | "relationship" | "effect" | "survival"; title: string; dataSourceDescription: string; specJson: string };

export async function getAnalystVisualizations(analystPlanId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analystVisualizations).where(eq(analystVisualizations.analystPlanId, analystPlanId)).orderBy(desc(analystVisualizations.updatedAt));
}

export async function createAnalystVisualization(analystPlanId: number, visualization: AnalystVisualizationInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(analystVisualizations).values({ analystPlanId, ...visualization });
  return Number(result[0].insertId);
}

export type AnalystNotebookInput = {
  language: "r" | "python";
  title: string;
  purpose: string;
  code: string;
  inputSnapshotJson: string;
};

export async function getAnalystNotebooks(analystPlanId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analystNotebooks).where(eq(analystNotebooks.analystPlanId, analystPlanId)).orderBy(desc(analystNotebooks.createdAt));
}

export async function upsertAnalystNotebook(analystPlanId: number, notebook: AnalystNotebookInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const current = await getAnalystNotebooks(analystPlanId);
  const versionNumber = (current.find(item => item.language === notebook.language)?.versionNumber ?? 0) + 1;
  const result = await db.insert(analystNotebooks).values({
    analystPlanId,
    versionNumber,
    language: notebook.language,
    title: notebook.title,
    purpose: notebook.purpose,
    code: notebook.code,
    inputSnapshotJson: notebook.inputSnapshotJson,
    executionStatus: "not_executed",
  });
  return { notebookId: Number(result[0].insertId), versionNumber };
}

export type ScriptoriumDocumentInput = { title: string; targetJournal?: string | null; abstract?: string | null; sectionsJson: string; status: "draft" | "review" | "ready" };

export async function getScriptoriumDocument(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(scriptoriumDocuments).where(eq(scriptoriumDocuments.lapisProjectId, lapisProjectId)).limit(1);
  return rows[0];
}

export async function getScriptoriumVersions(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scriptoriumVersions).where(eq(scriptoriumVersions.documentId, documentId)).orderBy(desc(scriptoriumVersions.versionNumber));
}

export async function getScriptoriumVersion(documentId: number, versionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(scriptoriumVersions).where(and(eq(scriptoriumVersions.id, versionId), eq(scriptoriumVersions.documentId, documentId))).limit(1);
  return rows[0];
}

export async function upsertScriptoriumDocument(lapisProjectId: number, document: ScriptoriumDocumentInput, changeSummary: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getScriptoriumDocument(lapisProjectId);
  let documentId: number;
  if (existing) {
    documentId = existing.id;
    await db.update(scriptoriumDocuments).set({ ...document, updatedAt: new Date() }).where(eq(scriptoriumDocuments.id, documentId));
  } else {
    const result = await db.insert(scriptoriumDocuments).values({ lapisProjectId, ...document });
    documentId = Number(result[0].insertId);
  }
  const versions = await getScriptoriumVersions(documentId);
  const versionNumber = (versions[0]?.versionNumber ?? 0) + 1;
  await db.insert(scriptoriumVersions).values({ documentId, versionNumber, changeSummary, snapshotJson: JSON.stringify(document) });
  return documentId;
}

export type ZoteroConnectionInput = { libraryId: string; libraryType: "user" | "group"; encryptedApiKey: string; keyHint: string; syncStatus: "connected" | "error" | "disconnected"; errorMessage?: string | null; lastSyncedAt?: Date | null };

export async function getZoteroConnection(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(scriptoriumZoteroConnections).where(eq(scriptoriumZoteroConnections.userId, userId)).limit(1);
  return rows[0];
}

export async function upsertZoteroConnection(userId: number, connection: ZoteroConnectionInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(scriptoriumZoteroConnections).values({ userId, ...connection, errorMessage: connection.errorMessage ?? null, lastSyncedAt: connection.lastSyncedAt ?? null }).onDuplicateKeyUpdate({ set: { ...connection, errorMessage: connection.errorMessage ?? null, lastSyncedAt: connection.lastSyncedAt ?? null, updatedAt: new Date() } });
}

export type ZoteroItemInput = { itemKey: string; title: string; citationKey?: string | null; creatorsJson: string; publicationYear?: number | null; doi?: string | null; sourceUrl?: string | null; itemType?: string | null; sourceUpdatedAt?: Date | null };

export async function replaceZoteroItems(userId: number, items: ZoteroItemInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(scriptoriumZoteroItems).where(eq(scriptoriumZoteroItems.userId, userId));
  if (items.length) await db.insert(scriptoriumZoteroItems).values(items.map(item => ({ userId, ...item, citationKey: item.citationKey ?? null, publicationYear: item.publicationYear ?? null, doi: item.doi ?? null, sourceUrl: item.sourceUrl ?? null, itemType: item.itemType ?? null, sourceUpdatedAt: item.sourceUpdatedAt ?? null })));
}

export async function getZoteroItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scriptoriumZoteroItems).where(eq(scriptoriumZoteroItems.userId, userId)).orderBy(desc(scriptoriumZoteroItems.updatedAt));
}

export async function createScriptoriumSubstanceReview(documentId: number, versionNumber: number, checklistJson: string, findingsJson: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(scriptoriumSubstanceReviews).values({ documentId, versionNumber, checklistJson, findingsJson });
  return Number(result[0].insertId);
}

export async function getScriptoriumSubstanceReviews(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scriptoriumSubstanceReviews).where(eq(scriptoriumSubstanceReviews.documentId, documentId)).orderBy(desc(scriptoriumSubstanceReviews.createdAt));
}

export type MatchmakerSubmissionInput = { manuscriptTitle: string; scopeSummary: string; rankedVenuesJson: string; targetVenue?: string | null; coverLetter?: string | null; checklistJson: string; reviewerCommentsJson: string; responseDraftJson: string; status: "planning" | "submitted" | "revision" | "accepted" };

export async function getMatchmakerSubmission(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(matchmakerSubmissions).where(eq(matchmakerSubmissions.lapisProjectId, lapisProjectId)).limit(1);
  return rows[0];
}

export async function upsertMatchmakerSubmission(lapisProjectId: number, submission: MatchmakerSubmissionInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(matchmakerSubmissions).values({ lapisProjectId, ...submission, targetVenue: submission.targetVenue ?? null, coverLetter: submission.coverLetter ?? null }).onDuplicateKeyUpdate({ set: { ...submission, targetVenue: submission.targetVenue ?? null, coverLetter: submission.coverLetter ?? null, updatedAt: new Date() } });
}

export type VigilAssessmentInput = { documentId?: number | null; integrityChecklistJson: string; referenceAlertsJson: string; supplementaryJson: string; disseminationJson: string; status: "draft" | "review" | "monitoring" };

export async function getVigilAssessment(lapisProjectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(vigilAssessments).where(eq(vigilAssessments.lapisProjectId, lapisProjectId)).limit(1);
  return rows[0];
}

export async function upsertVigilAssessment(lapisProjectId: number, assessment: VigilAssessmentInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(vigilAssessments).values({ lapisProjectId, ...assessment, documentId: assessment.documentId ?? null }).onDuplicateKeyUpdate({ set: { ...assessment, documentId: assessment.documentId ?? null, updatedAt: new Date() } });
}
