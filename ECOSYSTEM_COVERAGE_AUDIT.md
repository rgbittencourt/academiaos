# AcademiaOS — Auditoria de Cobertura do Ecossistema

**Base da auditoria:** apresentação AcademiaOS (slides 3 a 9) e capítulos 3 e 4 de *Ecossistema Ideal de Ferramentas para o Desenvolvimento de Pesquisas Acadêmicas*, recebidos em 20 de agosto de 2026.

## Decisão de priorização

O fluxo proposto é concepção → literatura → pré-registro → dados → análise → escrita → publicação → pós-publicação. Lapis, Cartographer, Método e Manuscrito já materializam as primeiras transições e a escrita inicial. A próxima lacuna sequencial é o **Prereg**, não Vault ou análise: ele transforma o protocolo já estruturado no Lapis em um registro metodológico verificável antes da coleta de dados.

> O Prereg será implementado como um módulo de pré-registro guiado, local e exportável. Ele não alegará publicar no OSF, AsPredicted, atribuir DOI ou emitir certificado externo sem uma integração autenticada e explicitamente configurada.

## Cobertura por ferramenta

| Ferramenta | Estado atual | Cobertura implementada | Lacunas relevantes |
|---|---|---|---|
| **Lapis** | Implementada parcialmente | Caderno, lacunas, originalidade, viabilidade, editais CNPq/CAPES, método, cronograma e manuscrito inicial | Fontes OSF/teses, FAPs/NIH/Horizon/ERC e integrações externas ainda ausentes |
| **Cartographer** | Implementada em núcleo | Busca Semantic Scholar/OpenAlex, biblioteca, PDF, extração, síntese auditável, triagem, PRISMA, duplicidade e narrativa | PubMed, mapa de citações e monitoramento de retratações ainda ausentes |
| **Prereg** | Próxima implementação | — | Wizard, coerência pergunta–hipótese–método–análise, registro de decisões, hash e exportação |
| **Vault** | Não implementada | Armazenamento pontual de PDFs e metadados | FAIR, versionamento de dados, dicionário, LGPD/CEP-Conep e repositórios |
| **Qualia** | Não implementada | Síntese qualitativa narrativa no Cartographer | Codificação, memos, dupla codificação, concordância e multimídia |
| **Analista** | Não implementada | Plano analítico textual no Método | Dataset, execução reproduzível, notebooks e resultados estatísticos |
| **Scriptorium** | Implementação inicial dentro do Lapis | Manuscrito estruturado, vínculo Método/Síntese e persistência | Versionamento por parágrafo, referências vivas e revisor de substância |
| **Matchmaker** | Não implementada | — | Recomendação de revistas, formatação e resposta a revisores |
| **Vigil** | Não implementada | Alertas internos de duplicidade/sobreposição | Retratações, integridade, suplementares e difusão |
| **AcademiaOS** | Hub parcial | Dashboard, fluxo visual, autenticação e navegação por etapa | Equipe, multi-instituição, integrações Zotero/OSF/Overleaf/RStudio/Jupyter/GitHub, ética e carreira |

## Aderência às telas e ao menu propostos

O dashboard atual preserva a identidade visual AcademiaOS — navegação azul-marinho, acento âmbar, foco no projeto ativo e linha de pesquisa — e já mostra Concepção, Literatura, Método, Manuscrito e Publicação. A apresentação, porém, prevê um ciclo mais completo e uma sidebar organizada por módulos, não apenas pelas duas primeiras etapas.

Nesta entrega, o menu ganhará uma terceira seção explícita: **3. Protocolo e pré-registro → Prereg**. As demais ferramentas continuarão fora da navegação funcional até que tenham uma tela e um fluxo reais; isso evita apresentar promessas como recursos disponíveis. A etapa de Escrita permanece no Lapis/Manuscrito, agora com exportação DOCX e LaTeX, e será a ponte incremental para o futuro Scriptorium.

## Guardrails de produto

1. Todo parecer automatizado deve ser tratado como apoio explicável e nunca como decisão metodológica.
2. O pré-registro preservará um snapshot dos campos e um hash de integridade calculado no servidor, mas esse hash não equivale a DOI, notarização externa ou publicação em registro público.
3. A exportação de Manuscrito deve manter a proveniência declarada das seções, distinguindo conteúdo de Método, Síntese e redação manual.
4. Dados sensíveis, conectores institucionais e integrações externas permanecem fora do escopo até que haja controles de privacidade, credenciais e consentimento adequados.
