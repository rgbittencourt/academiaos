# Qualia — cobertura metodológica e limites operacionais

O Qualia é um workspace de análise qualitativa rastreável integrado ao AcademiaOS. Ele organiza corpus, fontes, códigos, excertos, decisões de codificação, sugestões assistidas por IA, memos e relatório exportável por caderno de pesquisa. O módulo não produz uma interpretação teórica final nem substitui a deliberação do pesquisador.

| Necessidade metodológica | Cobertura atual | Limite explícito |
| --- | --- | --- |
| Codificação assistida por IA | A partir de um excerto selecionado, o sistema sugere rótulos provisórios, tema proposto, justificativa, confiança e evidência literal copiada do próprio excerto. O pesquisador aceita ou rejeita cada sugestão. | A sugestão não cria verdade analítica nem altera automaticamente o livro de códigos. O envio ao provedor só ocorre após aceite explícito para aquele excerto. |
| Agrupamento temático | As sugestões exibem um tema proposto que pode apoiar a organização comparativa de códigos. | Não há inferência automática de uma teoria ou tema definitivo; a estrutura temática deve ser construída e documentada pelo pesquisador. |
| Corpus multimídia | Fontes textuais, documentos, áudios, imagens e vídeos podem ser catalogados e armazenados no corpus. Áudios enviados podem ser transcritos sob ação explícita do pesquisador. | Imagens e vídeos não recebem interpretação visual automática: o Qualia conserva apenas a descrição contextual fornecida pelo pesquisador. O envio de mídia é limitado a 25 MB e a transcrição automática a áudio de até 16 MB. |
| Dupla codificação | Dois codificadores podem registrar decisões independentes para o mesmo excerto e código, com justificativa opcional de divergência. | A identificação dos codificadores é declarativa; o produto não verifica identidade institucional nem substitui procedimentos de treinamento ou adjudicação. |
| Concordância | Quando existem pares suficientes, o módulo calcula Kappa de Cohen e alfa nominal de Krippendorff a partir das decisões pareadas. | Métricas descrevem consistência observada; não validam categorias, não resolvem divergências teóricas e podem ser indefinidas com dados insuficientes. |
| Memos e auditabilidade | Memos analíticos, reflexivos e metodológicos registram autor, conteúdo, tipo e vínculo opcional a excerto. | A trilha documenta decisões registradas, mas não substitui diário de campo, consentimento ou governança ética externa. |
| Relatório | A exportação DOCX consolida corpus, fontes, livro de códigos, sugestões com evidência, memos e o aviso metodológico. | A exportação não é uma submissão pronta: o pesquisador deve revisar conteúdo, citações, confidencialidade e interpretação antes de qualquer compartilhamento. |

## Submenus do Qualia

O menu lateral e a navegação interna expõem seis áreas: **Corpus & fontes**, **Códigos & excertos**, **Sugestões explicáveis**, **Dupla codificação**, **Memos analíticos** e **Relatório**. Cada entrada também aceita um destino por hash para preservar a continuidade dentro do workspace.

> Recomendações de IA, transcrições e métricas de concordância são artefatos auxiliares. A interpretação teórica, a decisão de codificação e a responsabilidade ética permanecem com a equipe de pesquisa.

## Estado de distribuição

O Qualia está implementado como módulo do AcademiaOS. Esta implementação não declara, por si só, uma licença de software livre nem constitui uma distribuição open source independente. Caso a intenção seja publicar o módulo como projeto open source, será necessário definir licença, repositório público, política de contribuição, documentação de instalação e avaliação de dependências.
