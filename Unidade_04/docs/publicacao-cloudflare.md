# Publicar o Improvisa sem comprar domínio

O projeto está preparado para Cloudflare Workers. Com um Worker chamado `improvisa`, o endereço padrão tem o formato `improvisa.<subdominio-da-conta>.workers.dev`. O deploy retornou [improvisa.receitas-pln.workers.dev](https://improvisa.receitas-pln.workers.dev/). A abertura por HTTPS ainda precisa ser confirmada. Até a validação, use o [endereço anterior](https://tempero-pln-furb.daringtrillium4.chatgpt.site/) como alternativa.

## Como reproduzir o deploy

Com Node.js 22 ou superior, extraia o ZIP e abra um terminal na pasta que contém `wrangler.jsonc` e `package.json`:

```sh
npm test
npx wrangler login
npx wrangler deploy
```

O login abre a página da Cloudflare. Use a conta que ficará responsável pelo projeto. Se a conta ainda não tem um subdomínio `workers.dev`, configure um em **Workers & Pages**. No fim, o comando exibe o endereço publicado. Abra-o e teste **Frango e batata sem forno**, a paginação e os links das receitas. Atualize o README do repositório com o endereço confirmado.

O recomendador funciona sem API. A geração de explicações permanece desativada até configurar os dois segredos do servidor. Quando a equipe decidir ativá-la, configure `OPENAI_API_KEY` e `RAG_ACCESS_CODE` no painel do Worker ou pelos comandos abaixo. Nunca coloque valores de segredos no Git ou em arquivos enviados ao professor.

```sh
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put RAG_ACCESS_CODE
```

O custo eventual da API do modelo é separado da hospedagem. Depois da configuração, teste se as explicações aparecem no cartão correto e são fiéis aos dados das receitas.

- [Endereços workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Publicação de um projeto existente](https://developers.cloudflare.com/workers/framework-guides/automatic-configuration/)
