# Improvisa — Receitas com PLN

Trabalho da Unidade 4 de Processamento de Linguagem Natural (FURB, 2026/2). Modalidade B — Aplicação web funcional.

**Equipe:** Alana Cristina Andreazza, Beatriz Moresco Joaquim, Caio Abrão Manarim, Haiko Rüdiger e Letícia Fruet.

## O que o Improvisa faz?

A ideia veio da Unidade 1. Se você já sabe quais ingredientes tem em casa, mas ainda não sabe o que cozinhar, o Improvisa ajuda a encontrar receitas. Você também pode dizer que quer evitar um utensílio, como forno ou panela de pressão.

[Acessar o Improvisa](https://improvisa.receitas-pln.workers.dev/)

Na seção **Demonstração**, escreva um pedido ou clique em um dos exemplos. O site mostra até três receitas por página, com a lista de ingredientes e o link do TudoGostoso. Use **Próximas receitas** e **Anteriores** para ver outras opções sem mudar o pedido. O modo de preparo completo fica na página original da receita.

## Como rodar no computador

Se quiser só usar o site, não precisa instalar nada. Para rodar o código, instale o Node.js 22 ou superior, abra o terminal na pasta `Unidade_04` e execute um comando por vez:

```sh
npm test
npm run dev
```

O primeiro comando roda os testes. O segundo inicia o site. Com o terminal aberto, acesse [http://localhost:8000/](http://localhost:8000/). A base já vem com o projeto, e a busca não precisa de chave de API.

Se quiser gerar novamente a base usando o CSV da Unidade 3, rode com Python:

```sh
python preparar.py caminho/receitas_tudogostoso_processadas.csv
```

### Como configurar as explicações com IA

Para testar o RAG no computador, copie `.env.example` para `.env`. Preencha `OPENAI_API_KEY` com a chave da API e `RAG_ACCESS_CODE` com um código de demonstração escolhido por você. Depois, execute:

```sh
npm run build
node --env-file=.env scripts/dev.mjs
```

Na demonstração, marque a opção de gerar explicações e digite o código, não a chave da OpenAI. Não envie o `.env` ao GitHub. Para configurar o site publicado, veja o [guia da Cloudflare](docs/publicacao-cloudflare.md). A busca não gera custos de API. Já as explicações dependem da API da OpenAI, que pode cobrar por uso. O código de demonstração controla o acesso à geração, não o valor gasto.

## Como a busca funciona

Usamos 620 receitas do TudoGostoso, cada uma com um link próprio. O CSV da Unidade 3 contém os títulos, ingredientes, categorias, tempos de preparo, utensílios e etapas. O script em Python organiza os dados em JSON para o site e agrupa os 95 nomes de utensílios em 92 categorias com variações de nome.

- **TF-IDF sem filtros:** é a referência para a comparação. O TF-IDF dá peso às palavras conforme a frequência na receita e na base. Usamos a similaridade de cosseno para comparar o pedido com cada receita. O tratamento do pedido em JavaScript usa uma versão simplificada da separação de palavras e da remoção de palavras comuns do notebook da Unidade 3.
- **Busca guiada:** exige que todos os termos buscados apareçam no título ou nos ingredientes. Quando a pessoa pede para evitar um utensílio, a busca verifica o título, a lista de utensílios e as etapas registradas. Ela exclui receitas com sinais de uso desse utensílio e não sugere receitas quando identifica uma restrição que não consegue verificar.
- **Ordem das sugestões:** a pontuação combina a presença dos termos no título ou nos ingredientes (50%), a presença no título (35%) e a similaridade de cosseno com TF-IDF (15%). Como todas as sugestões já passaram pela primeira regra, esses 50% são iguais para elas. Na prática, o título e a similaridade definem a ordem.

## Onde entra o RAG?

A busca escolhe as receitas. O modelo recebe o pedido e dados de até três receitas da página atual para explicar por que cada uma pode servir. A resposta vem em JSON com o identificador de cada receita, para que o site mostre a explicação no cartão certo. Os ingredientes e os links continuam vindo da base, não do modelo.

A integração usa a API Responses da OpenAI com o modelo `gpt-4.1-mini-2025-04-14`, temperatura `0.2`, limite de 560 tokens de saída e `store: false`. As instruções enviadas ao modelo estão em [worker/rag.mjs](worker/rag.mjs). Um JSON válido não garante que a explicação esteja certa.

## Avaliação e interpretação dos resultados

### 1. Em que medida os objetivos iniciais foram alcançados?

Na Unidade 1, a proposta era sugerir receitas com base nos ingredientes e utensílios disponíveis em casa. O Improvisa entrega a parte de recomendação. A pessoa informa os ingredientes e os utensílios que quer evitar, e a busca sugere receitas da base com ingredientes, tempo de preparo e link original. O site não confirma se a pessoa tem todos os itens necessários nem adapta a receita para substituir o que falta.

### 2. Quais técnicas funcionaram melhor para o problema?

Nos pedidos testados, a busca guiada foi mais adequada quando o título precisava combinar com o prato ou quando havia um utensílio a evitar. Em “bolo fubá”, três dos três primeiros títulos continham os dois termos, contra um dos três no TF-IDF sem filtros. Em “frango e batata sem forno”, o TF-IDF trouxe duas sugestões com indício de forno, contra nenhuma na busca guiada. Já em “risoto de carne”, nenhum método trouxe um título que correspondesse ao pedido. A busca guiada não retornou receitas e, portanto, não resolveu esse caso.

### 3. O que as técnicas avançadas e os LLMs acrescentaram?

Além da comparação por palavras, a busca guiada considera onde os termos aparecem e aplica o filtro de utensílios. O RAG acrescenta outra possibilidade. O modelo pode explicar uma sugestão usando os dados da receita que a busca encontrou. No ensaio, ele destacou que o strogonoff pede batata palha, não batata comum. Isso ajuda a interpretar a sugestão, mas não melhora o ranking por si só. A geração com a API real no site ainda não foi validada de ponta a ponta.

### 4. Quais são as principais limitações?

A busca por palavras pode confundir ingredientes parecidos ou deixar passar sinônimos. Ela não verifica alergias, quantidades disponíveis ou substituições. Em 248 das 620 receitas, a lista de utensílios está vazia. O modo de preparo ajuda a encontrar indícios, mas não mencionar um utensílio não garante que ele seja dispensável. Na avaliação, os sete pedidos medem correspondência de termos e indícios de uso, não a relevância das receitas julgada por pessoas. O ensaio de RAG também é pequeno e não permite generalizar a qualidade das explicações.

### 5. Como verificamos a qualidade dos resultados?

Comparamos até três sugestões por método em sete pedidos, na mesma base. Para pedidos por prato ou ingredientes, contamos títulos com os termos buscados. Nos pedidos com restrição de utensílio, contamos receitas com indício do que se queria evitar. “Sem retorno” significa que o método não mostrou nenhuma receita, enquanto “0/3” significa que mostrou três receitas e nenhuma entrou na contagem.

| Pedido | O que contamos | TF-IDF sem filtros | Busca guiada |
| --- | --- | --- | --- |
| Bolo fubá | Títulos com os dois termos | 1/3 | 3/3 |
| Frango com batata | Títulos com os dois termos | 2/3 | 3/3 |
| Risoto de carne | Títulos com os dois termos | 0/3 | Sem retorno |
| Tenho frango e batata, mas não tenho forno. | Receitas com indício de forno | 2/3 | 0/3 |
| Bolo sem liquidificador | Receitas com indício de liquidificador | 3/3 | 0/3 |
| Tenho frango, mas não tenho panela de pressão. | Receitas com indício de panela de pressão | 3/3 | 0/3 |
| Ovo sem leite | Sugestões dadas sem verificar a restrição alimentar | 3/3 | Sem retorno |


### Exemplos de entrada e saída

| Pedido | Três primeiras sugestões, na ordem em que aparecem | Total |
| --- | --- | ---: |
| Tenho frango e batata, mas não tenho forno. | Frango com batata (55 min), Batata suíça (15 min) e Strogonoff de frango simples (30 min) | 8 |
| bolo fubá | Bolo de fubá cremoso (40 min), Bolo de fubá simples (45 min) e Bolo de fubá de liquidificador cremoso sem trigo e assado na airfryer (50 min) | 7 |

No ensaio manual de RAG, revisamos nove explicações geradas com os dados das receitas recuperadas. Nenhuma citou ingredientes fora dos dados fornecidos. Em testes separados, usamos respostas simuladas para conferir se a explicação era vinculada à receita certa. Veja o [registro da avaliação](docs/avaliacao-rag.md) e as [respostas do ensaio](web/experimento.json).

### 6. O que pode melhorar?

Podemos distinguir ingredientes como batata comum e batata palha, dar preferência a receitas com menos itens extras e melhorar a identificação de utensílios mencionados indiretamente. Também vale comparar a busca atual com uma que combine TF-IDF e embeddings para lidar com formas diferentes de escrever o mesmo pedido. Para medir a melhora, podemos revisar manualmente as sugestões de mais pedidos, comparar quantas das três primeiras são relevantes e contar quantos pedidos ficam sem resposta.

## Quadro de técnicas da Unidade 4

| Tecnologia ou abordagem | Utilizada? | Aplicação ou justificativa |
| --- | --- | --- |
| LLMs e modelos de linguagem | Sim | Experimentamos um modelo para explicar as sugestões com base nas receitas encontradas. |
| Prompt engineering e saídas estruturadas | Sim | As instruções limitam a explicação aos dados fornecidos. A resposta em JSON identifica a receita de cada explicação. |
| RAG e recuperação de informações | Sim | A busca recupera receitas da base e fornece seus dados ao modelo para gerar as explicações. |
| Agentes e integração com ferramentas | Não | O código define as etapas. O modelo não escolhe ferramentas nem executa ações sozinho. |
| Modelos locais ou quantizados | Não | A integração acessa o modelo por API. O projeto não roda um modelo local nem configura uma versão quantizada. |
| Processamento multimodal (texto, imagem, áudio) | Não | Os pedidos e as explicações são em texto. O sistema não analisa imagens nem áudio. |
| Outras técnicas avançadas de PLN | Sim | Comparamos o TF-IDF sem filtros com a busca guiada, que também considera título, ingredientes e utensílios. |

O quadro registra as técnicas implementadas ou experimentadas no projeto. Os testes e o estado da integração com a API estão descritos na avaliação acima.

## Créditos e referências

Usamos as receitas do TudoGostoso que preparamos na Unidade 3. Durante o projeto, o ChatGPT (OpenAI) serviu de apoio para tirar dúvidas, escrever e revisar partes do código e da documentação.

- [Documentação do modelo](https://platform.openai.com/docs/models/gpt-4.1-mini)
- [Documentação de saídas estruturadas](https://platform.openai.com/docs/guides/structured-outputs)
