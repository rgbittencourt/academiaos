# QA — Navegação e Ferramentas do Ecossistema

## Ambiente

- **Sessão:** autenticada no ambiente de desenvolvimento.
- **Projeto Lapis selecionado:** Identificação de Ondas Internas através de Redes Neurais.

## Evidências verificadas

| Área | Rota | Resultado observado |
|---|---|---|
| Navegação lateral | `/vault` | O menu exibe as ferramentas pelos nomes do ecossistema e em sequência: **Lapis**, **Cartographer**, **Prereg**, **Vault**, **Qualia** e **Analista**. |
| Vault | `/vault` | O formulário registra ativo de dados com tipo, descrição, local, identificador, licença, acesso, dados pessoais, base legal, consentimento, anonimização, retenção e metadados FAIR. |
| Qualia | `/qualia` | O workspace carregou para o caderno autenticado e apresenta criação de corpus com nome, escopo/pergunta analítica e fontes incluídas. |
| Analista | `/analista` | O workspace apresentou pergunta de pesquisa, desfecho, natureza do dado, preditores, desenho, dados ausentes, recomendação explicável, pressupostos, plano visual, molde de resultados e códigos R/Python. |
| Scriptorium | `/scriptorium` | O workspace apresentou título, revista-alvo, resumo, seções editáveis, registro de versão, histórico restaurável e área de referências vivas ligadas ao Cartographer quando houver revisão associada. |
| Prereg | `/prereg` | A rota voltou a carregar sem erro de importação e apresentou protocolo confirmatório, critérios de prontidão, hash de integridade, exportação de snapshot e bloqueio de versão. |
| Exportações do Manuscrito | `/lapis` | A etapa Manuscrito apresentou os controles distintos de DOCX e LaTeX, preservando o conteúdo existente do caderno durante a verificação. |

## Limites de validação

Nenhum novo registro acadêmico real foi criado nesta verificação visual. A persistência dos contratos foi coberta pela suíte automatizada.

Após a remoção autorizada dos dados temporários, o caderno disponível não possuía manuscrito persistido; portanto, os controles de exportação ficaram corretamente desabilitados. O novo estado de processamento é aplicado somente a uma exportação disponível, evitando clique repetido durante a geração do arquivo. A geração de DOCX/LaTeX com manuscrito persistido havia sido validada na rodada de QA anterior.
