# QA — Expansão de Dados, Escrita, Publicação e Integridade

## Validação autenticada inicial

| Área | Rota | Evidência observada |
|---|---|---|
| Vault | `/vault` | O menu apresentou o nome da ferramenta na etapa **4. Dados · FAIR e LGPD**. O workspace exibiu cadastro de ativo, níveis de acesso, identificador persistente, licença e checklist de governança antes do fluxo de upload. |
| Analista | `/analista` | O menu apresentou **Analista** na etapa 5. O workspace expôs pergunta, desfecho, natureza do desfecho, preditores, desenho e dados ausentes, seguidos pela recomendação explicável, plano de visualização e código R/Python. |
| Scriptorium | `/scriptorium` | A interface apresentou conexão **Zotero individual** por biblioteca pessoal ou de grupo, com chave privada mascarada, indicação de cifragem no servidor, revisão de substância, editor por seções, histórico restaurável e referências vivas. |
| Matchmaker | `/matchmaker` | A etapa 7 apresentou matriz de adequação de veículos, requisitos de fonte declarada, estado editorial, checklist, carta de apresentação e registro de respostas a pareceristas. |
| Vigil | `/vigil` | A etapa 8 apresentou checklist de integridade, fontes/evidências por verificação, alertas de referências, materiais suplementares e difusão responsável. O aviso explícito impede que o painel seja interpretado como acusação automática de plágio ou fraude. |

As operações de upload e visualização exigem que o pesquisador primeiro crie o ativo de dados ou salve o plano de análise correspondente; esta validação não criou dados acadêmicos adicionais. A conexão Zotero exige que cada pesquisador informe sua própria biblioteca e chave, portanto nenhuma credencial de terceiro foi utilizada no QA.

## Regressão automatizada

Após a implementação, `pnpm check && pnpm test` concluiu sem erros: **12 arquivos de teste e 83 testes aprovados**. A suíte cobre o bloqueio de upload sensível sem base legal e confirmação, o armazenamento com hash SHA-256 e escopo do usuário, a criação de visualização vinculada ao plano salvo, o mascaramento/cifragem da credencial Zotero, e a persistência revisável de Matchmaker e Vigil.

O Zotero foi deliberadamente validado por contrato e não por uma biblioteca real: a conta, a biblioteca e a chave são fornecidas posteriormente pelo próprio pesquisador durante o uso. Nenhuma chave Zotero é retornada ao navegador nem registrada neste relatório.

## Navegação e dashboard do ciclo de pesquisa

O dashboard foi validado em sessão autenticada nas larguras de **1440 px** e **390 px**. Em desktop, a barra lateral azul-marinho apresentou o logotipo AcademiaOS, a seleção dourada do Dashboard, as macroentradas **Meus Projetos**, **Lapis**, **Literatura**, **Prereg**, **Dados & FAIR**, **Escrita**, **Publicação** e **Integrações**, além do perfil e das configurações no rodapé. A entrada **Equipe** não está presente. Cada macroentrada apresenta a respectiva ferramenta ou grupo de ferramentas como contexto, preservando a navegação exigida sem ocultar os módulos implementados.

O painel inicial exibiu uma timeline clicável de nove marcos — Ideia, Literatura, Protocolo, Pré-registro, Coleta & dados, Análise, Escrita, Submissão e Publicação — e deriva seu estado de artefatos persistidos do Lapis, Cartographer, Método, Prereg, Vault, Analista/Qualia, Scriptorium, Matchmaker e Vigil. O mesmo estado real alimenta o projeto ativo, os próximos movimentos, o assistente de IA e os indicadores; não foram inseridas tarefas, alertas ou métricas simuladas. Em celular, a navegação lateral tornou-se acionável pelo botão de menu e o conteúdo permaneceu em uma coluna legível, com a timeline horizontal rolável.

Após o redesenho, `pnpm check && pnpm test` concluiu sem erros: **13 arquivos de teste e 85 testes aprovados**. Os dois novos testes verificam que o ciclo seleciona a primeira etapa sem artefato como o próximo movimento e chega a 100% somente quando os nove marcos possuem evidência persistida.

As rotas vinculadas pelo ciclo também foram abertas visualmente no ambiente autenticado: `/projects`, `/lapis`, `/prereg`, `/vault`, `/analista`, `/scriptorium`, `/matchmaker` e `/vigil`. Todas renderizaram seus workspaces correspondentes sem erro de resolução de módulo. A verificação confirmou o seletor de projeto nos módulos, a entrada Zotero individual no Scriptorium, o formulário de ativo governado no Vault, o formulário de plano explicável no Analista, a matriz de submissão no Matchmaker e o aviso de limites interpretativos no Vigil.

## Submenus do Lapis

A barra lateral agora apresenta **Lapis** entre Meus Projetos e Literatura, sem a entrada **Equipe**, e permite expandir quatro destinos internos: **Lacunas**, **Originalidade**, **Editais & grants** e **Viabilidade**. A checagem de desktop abriu `/lapis`, `/lapis#lapis-lacunas`, `/lapis#lapis-editais` e `/lapis#lapis-viabilidade`; cada destino exibiu seu painel específico e preservou o mesmo caderno como contexto. A validação móvel confirmou os painéis de Lacunas e Editais & grants em uma única coluna legível.

O módulo de Lacunas mantém a geração auditável a partir do caderno e da literatura associada; Originalidade registra a consulta em fontes públicas de registros acadêmicos, com critérios, fonte, data e resultados persistidos; Editais & grants reúne a seleção oficial disponível para CNPq e CAPES e identifica FAPs, NIH, Horizon Europe e ERC como fontes a verificar até a existência de conectores específicos; e Viabilidade cruza os requisitos registrados no caderno. A navegação e o destino por hash contam com regressões dedicadas. Ao término dessa atualização, `pnpm check && pnpm test` concluiu sem erros: **15 arquivos de teste e 88 testes aprovados**.

## Registros acadêmicos e Cartographer auditável

O painel **Buscar registros acadêmicos** foi validado no submenu **Originalidade** do Lapis. A consulta exige um termo e persiste a consulta vinculada ao caderno, incluindo fontes consultadas, data/hora, critério textual e resultados retornados. A interface explicita que os resultados de projetos, pré-registros e registros abertos são sinais de sobreposição potencial, não um veredito de redundância ou originalidade.

O menu **Literatura · Cartographer** passou a conter os destinos **Descoberta semântica**, **Biblioteca & duplicatas**, **Triagem & PRISMA**, **Extração estruturada**, **Síntese auditável**, **Integridade** e **Mapa de citações**. A busca existente mostra, por resultado, a pontuação de relevância percentual, a fonte, o resumo, a contagem de citações e os metadados que fundamentam a decisão de inclusão.

As telas de **Integridade** e **Mapa de citações** foram abertas em desktop e celular. A primeira só executa consulta editorial após ação explícita do pesquisador e apresenta um estado conservador acompanhado da fonte e do instante da verificação. A segunda constrói a vizinhança pública de citações apenas sob solicitação, permite selecionar nós e inspecionar suas relações, e informa que a cobertura pode ser parcial. Nenhum alerta é interpretado como acusação automática de má conduta ou retratação confirmada. Após esta expansão, `pnpm check && pnpm test` concluiu sem erros: **15 arquivos de teste e 91 testes aprovados**.

## Consolidação: Vault FAIR, fontes e navegação contextual

Em validação desktop e móvel de `/vault`, o painel apresentou os quatro espaços internos — **Ativos & versões**, **Dicionário de dados**, **LGPD & CEP/Conep** e **Publicar em repositório** — além do seletor de ativos, cadastro com versão inicial e trilha de snapshots. A interface informa que o banco conserva metadados, hashes e registros de governança, sem duplicar bytes de arquivos, e que o Vault não substitui avaliação jurídica, ética ou de repositório. Em 390 px, os submenus e o formulário do primeiro ativo foram renderizados em coluna única legível. O documento `VAULT_FAIR_GOVERNANCE.md` registra as capacidades disponíveis e os limites operacionais, inclusive a ausência de criptografia ponta a ponta e privacidade diferencial.

Em `/prereg`, a barra lateral exibiu os destinos **Protocolo**, **Guardrails**, **Advogado do Diabo** e **Certificado**. O painel do Advogado do Diabo mantém o aviso de escopo: a crítica rastreável antecipa coerência, vieses, confundimento e flexibilidade analítica, sem constituir acusação, avaliação ética ou parecer por pares. Em largura móvel, o protocolo e seus blocos de integridade permaneceram em coluna única navegável.

Em `/search`, a descoberta passou a declarar a cobertura multi-fonte: Semantic Scholar, OpenAlex, Europe PMC/PubMed, Crossref, SciELO, OpenAIRE e arXiv. Após uma busca, a interface lista para cada fonte se a consulta esteve disponível, o total retornado e a proveniência de cada resultado. O **CORE** é exibido como “chave pendente” e não bloqueia as fontes públicas restantes. A superfície de busca e o mapa da revisão também foram verificados em largura móvel.

Após a consolidação da navegação, contratos e cobertura visual, `pnpm check` concluiu sem erros e `pnpm test` concluiu com **15 arquivos de teste e 94 testes aprovados**. A suíte acrescenta a regressão dos submenus de Prereg, Vault e Publicação, além dos contratos de versão, dicionário, governança e planos de repositório do Vault.

## Autorização explícita para preparação de depósito

O painel de **Publicar em repositório** passou a oferecer uma confirmação expressa para cada plano de Zenodo, Dataverse ou repositório institucional. O botão de confirmação permanece indisponível até que o pesquisador aceite a declaração de escopo; a declaração informa que a ação autoriza somente a preparação de uma autenticação futura, sem transferência de arquivos, criação de registros ou publicação. Quando a autorização está ativa, o painel apresenta a data do evento e uma ação de revogação; a revogação preserva, em vez de apagar, o histórico.

Na rota `/vault#vault-repository`, a verificação visual foi realizada sem cadastrar ativos acadêmicos adicionais. O estado vazio apresentou corretamente a seleção de ativo, o menu contextual com **Publicar em repositório** ativo e o cadastro governado do primeiro ativo. A superfície detalhada de confirmação foi validada de forma isolada em jsdom, incluindo bloqueio inicial do botão, desbloqueio somente após aceite, acionamento da confirmação e revogação de uma autorização ativa. A regressão de contratos confirma que os eventos de confirmação e revogação incluem `transmissionExecuted: false` no snapshot auditável. Ao término, `pnpm check && pnpm test` concluiu sem erros: **16 arquivos de teste e 96 testes aprovados**.

## Qualia — análise qualitativa interpretável

O Qualia passou a usar o workspace dedicado `/qualia`, com seis submenus contextuais na barra lateral e na própria ferramenta: **Corpus & fontes**, **Códigos & excertos**, **Sugestões explicáveis**, **Dupla codificação**, **Memos analíticos** e **Relatório**. A navegação foi coberta pela regressão da barra lateral. A captura desktop confirmou a composição do workspace, inclusive o aviso persistente de que a IA não é árbitro teórico e que a decisão analítica é do pesquisador.

Os contratos agora cobrem corpus, fontes multimídia, transcrição de áudio, sugestões com evidência literal e justificativa, decisão independente de codificador, memos e cálculo reprodutível de Kappa de Cohen e alfa nominal de Krippendorff. A suíte registrou o caso de decisões divergentes e dados suficientes para ambas as métricas, sem representar a métrica como validação substantiva do código. `pnpm check && pnpm test` foram concluídos após a inclusão da cobertura: **16 arquivos de teste e 97 testes aprovados**. Os limites de multimídia, IA, concordância e distribuição são detalhados em `QUALIA_METHODS_AND_LIMITS.md`. Em 390 px, a página apresentou título, contexto metodológico, seletor de caderno, indicadores e formulário de criação do corpus em coluna única legível, sem corte horizontal.

## Analista e Scriptorium — reprodutibilidade e escrita rastreável

O **Analista** passou a apresentar submenus contextuais para Plano, Recomendação, Notebooks e Visualizações. A recomendação revisável recebe pergunta, desfecho, preditores, desenho e dados ausentes e devolve uma família de análise, justificativa verificável, pressupostos, plano de visualização, código R/Python e molde de resultados. O painel registra snapshots de notebooks por plano, linguagem, finalidade e versão. A interface declara que o sistema não executa R/Python, não acessa datasets e não produz resultados: esses passos exigem revisão e execução posterior pelo pesquisador.

O **Scriptorium** ganhou submenus para Manuscrito, Versões & diferenças, Referências vivas e Revisão de substância. Além do editor por seções, versões restauráveis, Zotero individual e revisão rastreável existentes, a interface apresenta diferenças por seção/parágrafo entre versões e uma pré-visualização tipográfica contínua de título, resumo e seções antes da exportação. A pré-visualização foi coberta por um teste de componente.

As telas `/analista` e `/scriptorium` foram verificadas em desktop e em 390 px. No desktop, os grupos contextuais mantêm a barra lateral recolhível e as áreas de plano/código ou edição/pré-visualização preservam hierarquia visual. No celular, ambos os workspaces tornam-se uma única coluna sem corte horizontal; campos de formulário, controles de versão e o preview permanecem legíveis. A regressão final concluiu com `pnpm check && pnpm test` sem erros: **17 arquivos de teste e 99 testes aprovados**. O documento `ANALISTA_SCRIPTORIUM_METHODS_AND_LIMITS.md` explicita os limites de execução, colaboração, WYSIWYG e verificações externas.

## Identidade AcademiaOS

A identidade pública foi atualizada de “AcademiaOS — Cartographer” para **AcademiaOS**, incluindo título da aba, `theme-color`, favicon próprio e ícone para dispositivos compatíveis. A rota pública `/acesso` foi usada para validar a capa editorial em 1440 × 900 e 390 × 844. Ela preserva uma composição em dois painéis, com manifesto de pesquisa em azul-marinho e dourado no lado esquerdo e entrada protegida com síntese das capacidades no lado direito; em celular, os painéis tornam-se uma sequência vertical legível. A validação automatizada cobre título, favicon, presença da marca, ação de entrada e bloco de evidências rastreáveis.

## Crédito institucional e autoria pública

A capa de acesso foi validada novamente em **1440 × 1000** e **390 × 844** após a reorganização da hierarquia institucional. O painel azul-marinho informa que o AcademiaOS é desenvolvido pelo **Prof. Rogério G. Bittencourt**, dá destaque ao logotipo oficial do **IFSC — Campus Continente** no topo e preserva o **INOVALAB — Laboratório de Inteligência Artificial, Inovação e Criatividade** como assinatura visual de desenvolvimento no rodapé. Em desktop, o crédito ocupa a coluna esquerda do rodapé institucional e o percurso de ferramentas a coluna direita, preservando o manifesto sem compressão. Em tela móvel, o IFSC antecede a marca AcademiaOS e o INOVALAB antecede o percurso; todos os blocos permanecem íntegros. Em ambas as larguras, a leitura mantém contraste e não interfere no botão de autenticação nem na composição responsiva.

Os metadados públicos agora registram o nome da aplicação, a descrição e a autoria institucional. A documentação de marca e o `README.md` do projeto repetem a atribuição e a referência do perfil GitHub. Após o ajuste, `pnpm check && pnpm test` concluiu sem erros, com **20 arquivos de teste e 102 testes aprovados**.

## Assinatura institucional unificada

A capa pública `/acesso` foi verificada em **1440 × 900** e **390 × 844** após adotar uma única faixa de assinatura com **IFSC — Câmpus Florianópolis–Continente** e **INOVALAB** no topo do painel editorial. A distância entre a assinatura e a mensagem “Pesquisa acadêmica, de ponta a ponta” foi ampliada, preservando o respiro observado na referência visual. O crédito de desenvolvimento e o percurso de pesquisa continuam independentes no rodapé. A navegação autenticada passou a usar o mesmo símbolo quadrado do AcademiaOS exibido no painel de acesso; não foi criada uma segunda marca. `pnpm check && pnpm test` foram concluídos sem erro, com **20 arquivos de teste e 102 testes aprovados**.
