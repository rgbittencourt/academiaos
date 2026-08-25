# Desenho da expansão: revisão enriquecida e produção científica

## Princípio de proveniência

Cada novo artefato mantém uma ligação explícita com sua origem. O diagrama PRISMA é sempre calculado a partir dos artigos salvos, dos agrupamentos heurísticos de duplicidade e das decisões de triagem registradas. O texto integral é vinculado ao artigo e ao objeto guardado em armazenamento. Editais são preservados com órgão, URL institucional, resumo literal e momento de consulta. O Manuscrito referencia o caderno Lapis que já agrega problema, método, cronograma e análise de literatura.

| Artefato | Persistência | Origem verificável | Limite de responsabilidade |
|---|---|---|---|
| Fluxo PRISMA | Derivado em tempo de consulta | `saved_articles` e `article_screenings` | Não declara registros ou decisões não presentes no projeto. |
| Documento integral | `article_documents` + armazenamento de objetos | PDF enviado pelo usuário e metadados do artigo | Aceita apenas PDF e limita tamanho antes de extrair texto. |
| Edital | `grant_opportunities` | Página institucional CNPq ou CAPES e horário de consulta | Não infere prazo, elegibilidade ou critérios ausentes da fonte. |
| Seleção de edital | `lapis_grant_selections` | Caderno Lapis e edital de origem | Permite alimentar a análise de grant somente com fontes selecionadas. |
| Manuscrito | `lapis_manuscripts` | Caderno Lapis associado | Oferece estrutura rastreável; não se apresenta como submissão ou parecer final. |

## Regras de derivação do PRISMA

O fluxo mostra: registros identificados no corpus, registros analisados após grupos de possível duplicidade, decisões em título/resumo, avaliações de texto integral e estudos incluídos. Grupos de duplicidade são sempre rotulados como **possíveis** e removem apenas o excedente estimado da contagem derivada; a revisão humana continua obrigatória. O exportador incorpora a data de geração, o nome do projeto e o aviso de derivação.

## Segurança de PDF

O upload é autenticado, tem escopo de projeto e artigo, exige MIME de PDF, valida assinatura `%PDF-`, limita o arquivo a 10 MiB e armazena o binário fora do banco. A extração ocorre no servidor e registra estado, texto e erro técnico não sensível. Um novo arquivo substitui somente a referência do próprio artigo, sem expor documentos de outros projetos.

## Fontes oficiais de edital

Não foi encontrada uma API pública estável e documentada para CNPq ou CAPES. Por isso, a integração inicial consulta as páginas oficiais mapeadas em `OFFICIAL_GRANTS_SOURCES.md`, extrai links e texto publicamente exibidos, guarda URL e instante de consulta, e fornece ao Lapis somente esses dados. A atualização é manual por ação explícita do usuário; não há coleta agendada.

## Próxima etapa: Manuscrito

O workspace Manuscrito será vinculado a um caderno Lapis e composto por título, resumo, palavras-chave e seções estruturadas. Ele inicia com uma estrutura editorial vazia e pode exibir referências para o Método e para a síntese vinculada, sem preencher afirmações científicas não verificadas.
