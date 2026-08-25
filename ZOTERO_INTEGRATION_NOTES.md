# Integração Zotero — referência técnica

Fonte oficial consultada em 20 de agosto de 2026: [Zotero Web API v3 — Basics](https://www.zotero.org/support/dev/web_api/v3/basics).

O serviço utiliza `https://api.zotero.org` e recomenda solicitar explicitamente a versão `3` pelo cabeçalho `Zotero-API-Version`. Bibliotecas privadas exigem uma chave de API dedicada do próprio pesquisador, enviada no cabeçalho `Zotero-API-Key`; a chave não deve ser adicionada a URLs. A sincronização lê a biblioteca pelo prefixo `/users/<userID>` ou `/groups/<groupID>`, e `items/top` lista itens de topo não enviados à lixeira.

No AcademiaOS, a credencial será cadastrada individualmente pelo professor-pesquisador, cifrada no servidor, exibindo apenas um identificador parcial. A primeira entrega é de leitura e sincronização controlada; nenhum dado será gravado no Zotero pelo AcademiaOS.
