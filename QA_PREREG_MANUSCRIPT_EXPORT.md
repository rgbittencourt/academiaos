# QA — Pré-registro, Manuscrito e ciclo de pesquisa

## Evidências autenticadas

| Fluxo | Evidência | Resultado |
|---|---|---|
| Navegação lateral | Sessão autenticada em `/prereg` | A seção **3. Método e pré-registro** e o item **Prereg** aparecem após Revisão de literatura, preservando a ordem de pesquisa proposta. |
| Workspace Prereg | Sessão autenticada em `/prereg` com um caderno Lapis existente | O formulário carregou pergunta e título do caderno, exibiu campos confirmatórios, prontidão para bloqueio, snapshot exportável e aviso explícito sobre depósito externo. |
| Dashboard | Sessão autenticada em `/` | O ciclo mostra **Concepção → Literatura → Método → Pré-registro → Manuscrito → Publicação**, com Pré-registro ativo e Publicação mantida como próxima etapa. |
| Manuscrito | Sessão autenticada em `/lapis` com caderno temporário | A seção **Manuscrito** exibe controles distintos de **Exportar LaTeX** e **Exportar DOCX**, ao lado de salvar e do rascunho persistido. |
| Exportação DOCX | Clique em **Exportar DOCX** no caderno temporário | O navegador confirmou **“Manuscrito exportado em DOCX.”** |
| Exportação LaTeX | Clique em **Exportar LaTeX** no caderno temporário | O navegador confirmou **“Manuscrito exportado em LaTeX.”** |

## Regressões automatizadas

Após a implementação, `pnpm check && pnpm test` concluiu com êxito: **11 arquivos de teste e 76 testes aprovados**. A suíte inclui regressões para exportação do Manuscrito em DOCX/LaTeX e para prontidão/snapshot do Pré-registro, além dos contratos de hash e bloqueio no servidor.

## Limite deliberado

O bloqueio do Pré-registro foi coberto por contrato automatizado. A interface informa corretamente que um snapshot interno não constitui depósito público, DOI ou aceite por registradores externos; estes atos permanecem sob controle do pesquisador.
