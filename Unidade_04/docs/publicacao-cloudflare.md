# Publicação do Improvisa na Cloudflare

Acesse a pasta que contém `wrangler.jsonc` e `package.json` com Node.js 22 ou superior. O binding Workers AI já está configurado em `wrangler.jsonc` como `AI`. Não precisa de chave da OpenAI nem código de demonstração.

```sh
npm test
npx wrangler login
npx wrangler deploy
```

O endereço do projeto é https://improvisa.receitas-pln.workers.dev/ quando publicado na mesma conta e com o mesmo nome de Worker. Confira o endereço mostrado no deploy.

Para testar só a busca localmente, execute `npm run dev` e acesse http://localhost:8000/. Neste modo, o binding de IA não existe, então o texto padrão aparece. Para testar também a geração com Workers AI, execute `npm run build` e depois `npx wrangler dev`, usando o endereço informado pelo Wrangler. O teste com IA pode consumir a cota gratuita da conta Cloudflare.

Após publicar, procure por **Frango e batata sem forno**. As receitas devem surgir imediatamente com **Explicação da busca**. Quando o modelo responder, o texto deve mudar para **Explicação com IA (Chatbot RAG)**. Se o modelo falhar ou a cota acabar, a busca e o texto padrão continuam. Teste também paginação, links para a receita original e pedidos sem resultados.

O Workers AI oferece uma franquia diária no plano gratuito (medida em Neurons). Há um limitador por IP/instância no código, que não substitui limites de uso centralizados. Para maior controle em um site público, configure uma regra de rate limiting da Cloudflare no endpoint `/api/rag`.

Os segredos antigos `OPENAI_API_KEY` e `RAG_ACCESS_CODE` não são mais usados pelo código. Caso ainda estejam cadastrados no painel da Cloudflare, podem ser removidos manualmente. Nunca publique segredos no Git.

- [Bindings do Workers AI](https://developers.cloudflare.com/workers-ai/configuration/bindings/)
- [Cotas e preços do Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Documentação do Wrangler](https://developers.cloudflare.com/workers/wrangler/)
