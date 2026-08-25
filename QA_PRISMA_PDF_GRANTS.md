# QA — PRISMA, PDF, Editais e Manuscrito

## Renderização autenticada inicial

Em 20 de agosto de 2026, a sessão autenticada de Rogerio Bittencourt abriu `/lapis` no ambiente de desenvolvimento após a inclusão dos novos módulos. O caderno existente carregou sem erro após a correção de uma guarda de renderização: ficaram visíveis o método com seus dez campos, o cronograma interativo, o bloco de fontes oficiais CNPq/CAPES, as quatro análises rastreáveis e a etapa Manuscrito. O bloco de editais informava corretamente que não havia registros sincronizados antes da primeira atualização. Nenhuma alteração de dados acadêmicos foi efetuada nesta verificação inicial.

Na mesma sessão, a seção Método apresentou o seletor de desenho de estudo, campos de cenário, população, amostragem, inclusão, exclusão, variáveis, coleta, análise e ética, além da mensagem de cronograma vazio e do controle para adicionar marcos. Isso confirma a composição visual e os textos de orientação do protocolo antes do preenchimento pelo pesquisador.

## Sincronização de fontes oficiais

O acionamento autenticado de **Atualizar fontes** concluiu com a mensagem **“26 registro(s) oficial(is) sincronizado(s)”**. A lista renderizada mostrou fontes CAPES e CNPq, cada cartão com instituição, título, data de consulta (19/08/2026), link **Fonte oficial** e ação **Usar no caderno**. Entre os registros visíveis estavam o Programa de Desenvolvimento Profissional para Professores de Língua Inglesa nos Estados Unidos (PDPI), Programa Cátedra Jorge Amado, Ações e Programas (CNPq) e Programa CAPES/MES-CUBA — Projetos. A origem permanece consultável pela URL apresentada em cada cartão.

## Fluxo Lapis e Manuscrito

Na recarga autenticada em `/lapis`, o ciclo de pesquisa passou a exibir **Método — Protocolo e cronograma**, **Análise — Lacunas, edital e viabilidade** e **Escrita — Manuscrito rastreável** como etapas disponíveis, sem indicadores de funcionalidade futura. A página também exibiu a etapa Manuscrito, com título provisório, palavras-chave, resumo, seções de Introdução, Método, Resultados e síntese e Discussão, além dos estados Rascunho, Em revisão e Pronto para revisão. A ação de salvar não foi disparada nesta verificação porque o caderno já contém conteúdo acadêmico real do usuário; a persistência foi coberta por teste autenticado de contrato, sem substituir esse conteúdo.

## PRISMA e PDF

Em `/library`, a sessão autenticada exibiu corretamente o painel **Fluxo PRISMA** com a declaração de proveniência, três registros identificados e os demais totais derivados das decisões de triagem registradas. A ação **Exportar SVG** foi acionada sem erro visível na interface. O ponto de entrada **Importar PDF** também abriu o diálogo **Texto integral auditável**, que restringe o envio a PDF de até 10 MiB e informa que arquivos sem camada textual permanecem preservados, porém sinalizados para OCR externo. Para preservar o corpus acadêmico real, nenhum arquivo foi enviado nesta etapa; a validação de extração, armazenamento e persistência foi executada pelo teste de contrato automatizado.

## Regressão automatizada

Após a expansão, `pnpm check && pnpm test` concluiu sem erros: **8 arquivos de teste e 69 testes aprovados**. A suíte inclui regressão de ciclo de pesquisa, derivação de PRISMA, importação de PDF com texto integral, sincronização e seleção de fontes oficiais, e persistência do Manuscrito.

## Dashboard

O dashboard autenticado em `/` confirmou a atualização do ciclo central: **Método — protocolo e cronograma** e **Manuscrito — rascunho rastreável** agora aparecem como etapas ativas e acionáveis para o Lapis. Apenas Publicação permanece como próxima etapa planejada, mantendo a ordem concepção → literatura → método → manuscrito → publicação coerente com o fluxo de pesquisa entregue.

## QA temporário em andamento

Para concluir a validação ponta a ponta sem alterar material de pesquisa existente, foi iniciado um caderno descartável identificado como **QA temporário — Manuscrito AcademiaOS**. Ele será preenchido somente com texto de teste, validado após recarga e removido ao final do procedimento.

O caderno foi criado com sucesso na sessão autenticada e apareceu na lista de cadernos como **Rascunho**, com a confirmação visual de criação. Nenhum conteúdo do caderno acadêmico existente foi modificado.

No Manuscrito desse caderno foi inserida uma introdução identificável de QA. A seção permaneceu visível no editor e será usada como marcador de confirmação após o salvamento e a recarga.

Também foi definido o título provisório exclusivo **Manuscrito temporário de QA — persistência**, que permitirá verificar se o conteúdo reaberto permanece vinculado ao caderno descartável testado.

O comando **Salvar manuscrito** retornou a confirmação visual **“Rascunho de manuscrito salvo.”**. Após recarregar `/lapis`, o caderno descartável continuou selecionado e a introdução de QA foi reaberta com o mesmo texto. Isso confirma, em sessão autenticada, a persistência da estrutura de Manuscrito vinculada ao caderno temporário.

## Importação de PDF — preparação controlada

Para testar a importação sem modificar a revisão acadêmica já existente, foi aberto o formulário de criação de uma revisão Cartographer independente e temporária. O arquivo de teste é um PDF mínimo, gerado localmente apenas para QA, sem conteúdo do corpus do usuário.

A revisão **QA temporário — Importação PDF AcademiaOS** foi criada com sucesso e ficou selecionada, com uma biblioteca inicialmente vazia. A validação prossegue nessa revisão isolada; o projeto Cartographer do usuário não será alterado.

Uma busca autenticada por **machine learning** retornou 10 resultados pela fonte de continuidade OpenAlex. A referência *Scikit-learn: Machine Learning in Python* foi selecionada como registro de suporte para a importação do PDF de QA.

O artigo foi salvo com a confirmação visual de inclusão na biblioteca. A revisão temporária passou a exibir 1 estudo e o botão **Importar PDF** para esse registro, mantendo o corpus acadêmico principal intacto.

O arquivo `qa_academiaos_import.pdf` foi aceito pelo seletor do diálogo, mas a ação **Importar e extrair** retornou a mensagem **“Cannot transfer object of unsupported type.”**. A persistência e extração ponta a ponta de PDF permanecem bloqueadas por essa falha de serialização/transporte; a correção é necessária antes da publicação.

A correção serializou a leitura de metadados e do texto no parser, evitando a transferência concorrente do mesmo buffer. Uma nova importação autenticada do mesmo PDF temporário foi concluída com sucesso: o cartão do artigo passou a exibir **“PDF · TEXTO INTEGRAL”** e a ação **“Texto integral”**, confirmando que o arquivo, a extração e os metadados foram persistidos. A suíte também passou a ter regressão específica para a ordem de leitura do parser.
