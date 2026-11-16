# Publicar o Improvisa na Cloudflare

O Improvisa está no ar em [improvisa.receitas-pln.workers.dev](https://improvisa.receitas-pln.workers.dev/). A busca funciona nesse endereço sem precisar comprar um domínio ou configurar a API da OpenAI.

Se você só quer testar o recomendador, basta abrir o link. As instruções abaixo são para quem precisa publicar uma cópia do projeto ou atualizar o site.

## Como publicar

Com o Node.js 22 ou superior instalado, abra o terminal na pasta `Unidade_04`, onde estão os arquivos `wrangler.jsonc` e `package.json`. Rode um comando por vez:

```sh
npm test
npx wrangler login
npx wrangler deploy
```

O primeiro comando roda os testes. O segundo abre o navegador para você autorizar o Wrangler na sua conta Cloudflare. O terceiro compila e publica o projeto. Se for a primeira publicação nessa conta, o Wrangler pode pedir que você escolha um subdomínio `workers.dev`.

No fim, o terminal mostra o endereço do site. Abra o link e teste **Frango e batata sem forno**. Confira se as sugestões aparecem, se os botões de paginação funcionam e se os links levam às receitas do TudoGostoso.

## Como configurar as explicações com IA

A busca funciona sem IA. Para liberar a geração de explicações no site, abra **Workers & Pages → improvisa → Settings → Variables and Secrets**. Adicione as duas variáveis abaixo em **Production**, com a opção **Secret** marcada, e publique a alteração:

| Nome | Valor |
| --- | --- |
| `OPENAI_API_KEY` | A chave da API da OpenAI. Ela fica no servidor. |
| `RAG_ACCESS_CODE` | Um código longo e aleatório escolhido pela equipe. É esse código que a pessoa digita no site para liberar a geração. |

Também dá para cadastrar as variáveis pelo terminal, na mesma pasta do projeto:

```sh
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put RAG_ACCESS_CODE
```

Não coloque os valores desses segredos no GitHub. A cobrança da API da OpenAI é separada da hospedagem.

## Como testar o RAG

1. Abra o endereço do site com `/api/status` no fim. Se aparecer `"rag": true`, o servidor encontrou as duas variáveis. Isso não confirma que a OpenAI aceitou uma chamada.
2. No site, abra **Ativar explicações com IA**, digite o código de demonstração e marque **Gerar explicações com as fontes recuperadas**.
3. Faça uma nova busca. Confira se cada cartão recebeu uma explicação específica e se o texto condiz com os dados da receita.

**Situação do projeto:** Testamos a busca e a geração de explicações com RAG no endereço público. A API gerou uma explicação específica para cada receita sugerida, e o site mostrou cada texto no cartão correspondente. O ensaio inicial e os testes com respostas simuladas estão descritos no [registro da avaliação](avaliacao-rag.md).

- [Endereços workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Publicação de um projeto existente](https://developers.cloudflare.com/workers/framework-guides/automatic-configuration/)
- [Configuração de segredos na Cloudflare](https://developers.cloudflare.com/workers/configuration/secrets/)
