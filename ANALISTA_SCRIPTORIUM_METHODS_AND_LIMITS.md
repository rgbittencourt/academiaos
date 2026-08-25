# Analista e Scriptorium — capacidades e limites operacionais

## Analista

O Analista transforma a pergunta, o desfecho, os preditores, o desenho e as informações sobre dados ausentes em um plano estatístico explícito. A recomendação assistida produz uma família de análise proposta, justificativa, pressupostos e diagnósticos, plano de visualização, texto-base para resultados e código R/Python reprodutível.

Cada plano pode originar um **snapshot de notebook** versionado, contendo o código, a linguagem, a finalidade, o vínculo com o plano e a identificação do pesquisador. Esse registro preserva uma trilha de reprodutibilidade e permite exportar ou executar posteriormente em um ambiente estatístico escolhido pelo pesquisador.

> O AcademiaOS não executa R ou Python, não acessa datasets automaticamente, não calcula resultados nem fabrica estimativas. A recomendação é uma hipótese metodológica revisável, e a adequação do modelo, dos pressupostos, das escalas e da redação de resultados permanece sob responsabilidade do pesquisador e, quando necessário, de consultoria estatística.

## Scriptorium

O Scriptorium organiza o manuscrito por seções, mantém versões restauráveis, expõe diferenças por seção e parágrafo entre versões, integra referências vivas do projeto associado e permite configurar uma conta Zotero individual. A chave de Zotero é cifrada no servidor e não retorna ao navegador.

A revisão de substância avalia a cobertura de objeções, a coerência entre seções e a adequação declarada à revista-alvo de forma rastreável. A pré-visualização de leitura compõe título, resumo e seções em uma superfície tipográfica contínua antes da exportação para DOCX ou LaTeX.

> A interface atual oferece um editor estruturado por seções e uma pré-visualização de leitura; ela não é um editor WYSIWYG completo de diagramação final. A colaboração simultânea em tempo real, a resolução automática de conflitos e a verificação independente de retratação ou qualidade de todas as fontes dependem de integração adicional e não devem ser presumidas.

## Navegação

Para manter a barra lateral concisa, Analista e Scriptorium possuem grupos recolhíveis. Os destinos internos são âncoras no próprio workspace: **Plano**, **Recomendação**, **Notebooks** e **Visualizações** no Analista; **Manuscrito**, **Versões & diferenças**, **Referências vivas** e **Revisão de substância** no Scriptorium.
