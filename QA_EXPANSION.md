# QA da expansão Método e Cartographer

## Escopo validado

Esta rodada cobriu o núcleo adicional solicitado para o AcademiaOS: o protocolo de **Método**, o cronograma de marcos, as exportações da síntese auditável, a triagem transparente, os alertas de duplicidade e o caderno de síntese qualitativa e narrativa.

| Artefato | Evidência de validação | Resultado |
|---|---|---|
| Tipagem e contratos | `pnpm check` | Aprovado sem erros. |
| Regressão automatizada | `pnpm test` | **68 testes aprovados em 8 arquivos**. |
| Método e cronograma | Contratos autorizados e componentes renderizados no workspace Lapis. | Campos de protocolo e marcos persistidos, com status e datas validadas. |
| DOCX e LaTeX | Testes dos exportadores e controles renderizados na síntese. | Arquivos recebem nome do projeto, conteúdo, referências e evidências. |
| Triagem e duplicidade | Testes de contrato e painel Biblioteca renderizado. | Decisões e justificativas ficam persistidas; alertas não removem registros automaticamente. |
| Narrativa | Testes de contrato e seção Síntese renderizada. | Temas exigem interpretação do pesquisador e estudos de sustentação. |
| Verificação visual | Capturas em `/lapis`, `/library` e `/synthesis` no viewport de 1280×720. | Hierarquia, navegação e novos fluxos foram renderizados sem transbordamento observado. |

## QA visual autenticado

Uma sessão autenticada de **Rogerio Bittencourt** foi usada no ambiente de desenvolvimento para confirmar a presença dos novos fluxos com dados reais do projeto. Em `/lapis`, o caderno exibiu o bloco **Método e protocolo**, os dez campos estruturados e o cronograma de marcos. Em `/library`, o projeto autenticado exibiu o **Registro de triagem**, as contagens derivadas do corpus e os controles **Triar** em cada artigo. Em `/synthesis`, os controles **Exportar DOCX** e **Exportar LaTeX**, as referências clicáveis e o formulário de **novo tema** foram renderizados para o mesmo projeto. A inspeção não criou, alterou ou excluiu registros acadêmicos do usuário.

Para validar o alerta de duplicidade, a busca autenticada em `/discover` pelo título **“1D convolutional neural networks and applications: A survey”** retornou dois registros OpenAlex com o mesmo DOI `10.1016/j.ymssp.2020.107398`; o primeiro já estava salvo e o segundo permaneceu disponível para uma adição temporária controlada. Fonte: sessão autenticada no ambiente de desenvolvimento, 20 de agosto de 2026.

Após salvar temporariamente o segundo registro, a Biblioteca exibiu **4 estudos** e o alerta **“Revisão manual recomendada. 1 grupo(s) de possível duplicata por DOI ou título normalizado.”**. Após autorização explícita do titular, o registro temporário de 2020 foi removido pela interface. A consulta não destrutiva posterior confirmou `totalArticles = 3` e `distinctDoiOrRecord = 3` para o projeto 1; o registro original de 2021 e os outros dois estudos foram preservados.

## Limites de escopo confirmados

As análises do Lapis continuam auditáveis apenas sobre o caderno, recursos declarados e corpus Cartographer associado. Nesta entrega não foram alegadas consultas ao OSF, registros de teses, bases de editais, PubMed, Zotero ou Overleaf. Os alertas de duplicidade são deliberadamente heurísticos e conservadores; exigem decisão humana documentada.
