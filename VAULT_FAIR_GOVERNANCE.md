# Vault — Governança auditável de dados de pesquisa

O **Vault** organiza ativos de dados e suas decisões de curadoria em um fluxo verificável. Ele foi projetado para apoiar práticas compatíveis com os princípios FAIR, a documentação de privacidade e a preparação de depósito, sem substituir avaliação jurídica, aprovação ética ou validação por um repositório externo.

## Capacidades disponíveis

| Área | O que fica registrado | Limite explícito |
|---|---|---|
| Ativos e versões | Metadados do ativo, identificadores, licença, nível de acesso, resumos de mudanças, hashes de arquivos e snapshots numerados. | O snapshot registra estado e proveniência; ele não substitui controle de versões do conteúdo binário fora do ambiente. |
| Dicionário de dados | Nome da variável, tipo, descrição operacional, unidade, valores permitidos, regra de ausentes e origem da definição. | A geração assistida somente identifica nomes declarados em cabeçalho CSV ou trecho de código. Tipo, significado e valores exigem revisão humana. |
| LGPD e CEP/Conep | Declaração de dados pessoais, finalidade, base legal, consentimento, risco, uso de participantes humanos, situação CEP/Conep, referência de aprovação e pendências. | O checklist é um registro de evidências declaradas; não constitui parecer jurídico nem aprovação ética. |
| Plano de repositório | Repositório-alvo, URL de destino, estado de preparo, requisitos e pendências para Zenodo, Dataverse ou repositório institucional. | Nenhum arquivo é transmitido automaticamente e nenhuma credencial de repositório é solicitada pelo Vault. O depósito final permanece sob controle do pesquisador. |
| Autorização de preparação autenticada | Evento imutável de confirmação ou revogação, pesquisador responsável, data/hora e snapshot dos metadados que estavam em foco. | A autorização permite somente preparar uma futura autenticação. Ela não envia arquivos, não cria registros e não publica dados; uma confirmação posterior dentro do repositório continua obrigatória. |
| Privacidade avançada | O Vault registra a classificação e as decisões declaradas de acesso e governança. | **Criptografia ponta a ponta** e mecanismos de **privacidade diferencial** não estão implementados neste produto e não devem ser presumidos a partir do checklist. |

## Fluxo recomendado

1. Cadastre o ativo com finalidade, responsável, formato, licença, acesso e identificadores já disponíveis.
2. Faça o upload pelos controles existentes e registre um **snapshot** quando metadados, arquivos, dicionário ou governança mudarem de forma relevante.
3. Gere um rascunho de dicionário a partir de um cabeçalho CSV ou trecho de código de limpeza; complete e revise cada definição antes do reuso.
4. Preencha o checklist de governança. Para estudos com seres humanos, registre a situação CEP/Conep, a referência aplicável e as pendências, sem interpretar o sistema como aprovação.
5. Prepare o plano de depósito e revise os requisitos do repositório escolhido antes de qualquer publicação externa.
6. Se a preparação autenticada for necessária, leia e aceite a declaração explícita. O Vault conservará o aceite como evento auditável; ele pode ser revogado antes de qualquer ação externa.
7. Autentique-se no repositório e faça a revisão e confirmação final fora do Vault. O registro ou a publicação não são automatizados por este produto.

## Rastreabilidade e proteção de escopo

Cada operação do Vault é vinculada ao caderno de pesquisa ativo e protegida pela sessão do pesquisador. As versões preservam apenas o snapshot de metadados, arquivos associados, dicionário e governança para tornar mudanças explicáveis. A confirmação de preparação autenticada é igualmente anexada à trilha como um evento de aceite ou revogação, sem apagar eventos anteriores. O Vault não cria DOI, não publica dados, não afirma anonimização completa e não realiza automaticamente uma avaliação de impacto ou uma revisão ética. No estado atual, ele também não oferece criptografia ponta a ponta nem proteção por privacidade diferencial.

> **Decisão de governança:** antes de compartilhar um conjunto de dados, o pesquisador deve confirmar com sua instituição e com o repositório escolhido quais documentos, autorizações, restrições de acesso e procedimentos de desidentificação são necessários para o caso concreto.
