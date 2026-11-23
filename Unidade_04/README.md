# Improvisa · Receitas com PLN

Mostra Virtual de PLN, FURB, 2026/2. Unidade 4, Modalidade B (aplicação web funcional).

Equipe: Alana Cristina Andreazza, Beatriz Moresco Joaquim, Caio Abrão Manarim, Haiko Rüdiger e Letícia Fruet.

O recomendador usa as 620 receitas do TudoGostoso da Unidade 3. Dado um pedido curto, mostra até três receitas da base por página, com destaque para os termos da consulta e links para as fontes. O modo de preparo integral não é exibido. A busca funciona sem API. No Cloudflare Workers, o RAG usa Workers AI para gerar explicações automaticamente, com texto padrão como alternativa se a IA não responder.

## Executar

Com Node.js 22 ou superior, na pasta deste projeto:

```sh
npm test
npm run dev
```

Acesse http://localhost:8000/. Não há dependências npm externas. O comando `npm run dev` inicia a busca local, mas não disponibiliza o binding de IA. Para testar o RAG localmente, depois de `npm run build`, use `npx wrangler dev`. O Wrangler pode usar o serviço Workers AI remoto, consumindo a cota gratuita. Não há chave ou código de demonstração a preencher. A geração fica automática quando o binding está disponível.

No Cloudflare, o arquivo `wrangler.jsonc` configura `ai.binding` como `AI`. O plano gratuito de Workers AI oferece uma franquia diária de uso medida em Neurons; ao esgotá-la, a explicação padrão continua. Existe um limitador simples de 8 chamadas por minuto por IP e instância do Worker; ele não é global e não substitui controles de abuso da Cloudflare.

Para regenerar a base a partir do CSV da Unidade 3:

```sh
python preparar.py caminho/receitas_tudogostoso_processadas.csv
```

## Dados e metodologia

- Corpus com 620 URLs distintas. Títulos, categorias, ingredientes e tempo vêm do CSV. O script agrupa os 95 nomes registrados em 92 categorias, adiciona variações de consulta e extrai sinais do título, dos utensílios registrados e das etapas. Em 248 receitas, a lista de utensílios está vazia. Uma ausência detectada não garante compatibilidade. Os tokens do corpus são reordenados para representar apenas o saco de palavras, sem alterar as frequências.
- Referência: TF-IDF nos tokens pré-processados do corpus, IDF suavizado e similaridade de cosseno com frequência bruta. Na consulta, usamos um tokenizador e lista de palavras de parada simplificados em JavaScript, não uma reprodução exata do NLTK do notebook.
- Busca guiada: a pontuação combina cobertura de termos em títulos ou ingredientes (0,50), cobertura no título (0,35) e cosseno (0,15). Exige todos os termos normalizados e exclui receitas com sinais de equipamentos que a pessoa pede para evitar. Também exige etapas registradas quando há filtro de utensílio. Pedidos com restrições não suportadas reconhecidas não recebem sugestões.
- A interface mostra sugestões e o ranking de referência. A lista de ingredientes é agrupada por correspondência lexical, sem presumir quantidades ou disponibilidade.

## Geração fundamentada em fontes

O servidor refaz a mesma busca e passa até três fontes da página atual ao modelo do Workers AI (`@cf/meta/llama-3.1-8b-instruct`), solicitando um JSON com os respectivos IDs. A interface associa cada explicação ao cartão original. Links, listas de ingredientes e sinais de equipamentos são obtidos da base, não do modelo. O prompt está em `worker/rag.mjs`. Configuração: `@cf/meta/llama-3.1-8b-instruct`, temperatura 0,2, limite de 650 tokens e solicitação de JSON Schema. O formato ainda é verificado no servidor porque a geração pode fugir do esquema. O corpo enviado inclui a consulta e os campos selecionados das fontes. O modelo pode introduzir erros factuais mesmo quando o JSON é válido.

Referências: [Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/) e [JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/).

## Resultados preliminares

| Consulta | Indicador entre as sugestões | TF-IDF sem filtro | Busca guiada |
| --- | --- | --- | --- |
| bolo fubá | Título com ambos os termos | 1/3 | 3/3 |
| frango com batata | Título com ambos os termos | 2/3 | 3/3 |
| risoto de carne | Título com ambos os termos | 0/3 | Sem retorno |
| Tenho frango e batata, mas não tenho forno. | Menção detectada a forno | 2/3 | 0/3 |
| Bolo sem liquidificador | Menção detectada a liquidificador | 3/3 | 0/3 |
| Tenho frango, mas não tenho panela de pressão. | Menção detectada a panela de pressão | 3/3 | 0/3 |
| ovo sem leite | Sugestões para restrição não suportada | 3/3 | Sem retorno |

Essa avaliação mede correspondência lexical e comportamento dos filtros em sete exemplos. Não mede relevância geral, nem demonstra que o equipamento foi realmente dispensado. Exigir todos os termos evita sugestões apenas tangenciais em “risoto de carne”, mas pode perder resultados expressos com sinônimos. Uma etapa futura é rotular relevância manualmente, aumentar e separar consultas de desenvolvimento e teste e comparar com recuperação semântica.

## Quadro da Unidade 4

| Tecnologia ou abordagem | Utilizada? | Aplicação ou justificativa |
| --- | --- | --- |
| LLMs e modelos de linguagem | Sim | A etapa de geração usa um modelo de linguagem para explicar por que cada receita sugerida pode servir. A escolha das receitas é feita pela busca. |
| Prompt engineering e saídas estruturadas | Sim | O prompt orienta o modelo a usar os dados das receitas encontradas. O servidor confere se o identificador de cada resposta em JSON corresponde ao cartão certo. |
| RAG e recuperação de informações | Sim | A busca recupera receitas da base. Os dados dessas receitas servem de contexto para o modelo explicar as sugestões. |
| Agentes e integração com ferramentas | Não | O código define a sequência de etapas. O modelo não escolhe ferramentas nem executa ações por conta própria. |
| Modelos locais ou quantizados | Não | A etapa de geração usa um modelo acessado por API. O projeto não executa um modelo local nem usa uma versão quantizada. |
| Processamento multimodal (texto, imagem, áudio) | Não | Os pedidos e as explicações são em texto. A aplicação não analisa imagens nem áudio. |
| Outras técnicas avançadas de PLN | Sim | A busca guiada combina TF-IDF com termos no título e nos ingredientes e aplica filtros de utensílios. Comparamos seus resultados com os do TF-IDF sem filtros. |

## Ensaio de RAG, limitações e entrega

Veja `docs/avaliacao-rag.md` e `web/experimento.json` para as explicações e a análise. Os testes automatizados usam um binding Workers AI simulado e não medem a qualidade das respostas reais. Na avaliação manual, o ChatGPT recebeu o contexto real recuperado pelo projeto. O ensaio não representa uma medição do snapshot configurado para produção.

Link do site publicado anteriormente: https://improvisa.receitas-pln.workers.dev/ (a atualização exige novo deploy).
Para publicar em Cloudflare Workers sem domínio próprio, siga [o guia de publicação](docs/publicacao-cloudflare.md).

Para atualizar o repositório da disciplina, adicione esta pasta como `Unidade 04/` e coloque o link do site no README da raiz. O ZIP antigo não continha o endereço do repositório Git. Não renomeie ou sobrescreva notebooks das unidades anteriores.

Uso auxiliar de IA: ChatGPT (OpenAI) para interpretar o enunciado, implementar o site, revisar documentação e rodar o ensaio de geração. O ensaio manual anterior foi feito com ChatGPT, enquanto a versão atual usa Workers AI na geração do site. O prompt de produção e a configuração relevante estão no código e acima. O snapshot exato do ChatGPT no ensaio manual não foi verificado de forma independente.
