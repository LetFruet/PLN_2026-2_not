# Improvisa · Receitas com PLN

Mostra Virtual de PLN, FURB, 2026/2. Unidade 4, Modalidade B (aplicação web funcional).

Equipe: Alana Cristina Andreazza, Beatriz Moresco Joaquim, Caio Abrão Manarim, Haiko Rüdiger e Letícia Fruet.

## Objetivo e demonstração

O Improvisa retoma a proposta da Unidade 1 de recomendar receitas a partir dos ingredientes disponíveis e dos utensílios que a pessoa quer evitar. O recomendador usa as 620 receitas do TudoGostoso da Unidade 3. Dado um pedido curto, mostra até três receitas da base por página, com destaque para os termos da consulta e links para as fontes. O modo de preparo integral não é exibido. O site funciona sem API em modo de busca. Com a configuração abaixo, ele gera explicações via RAG.

- **Cloudflare Workers (novo endereço):** [improvisa.receitas-pln.workers.dev](https://improvisa.receitas-pln.workers.dev/). O deploy foi concluído, mas a abertura por HTTPS ainda não foi confirmada.
- **Endereço alternativo:** [Improvisa na hospedagem original](https://tempero-pln-furb.daringtrillium4.chatgpt.site/).

Na seção **Demonstração**, escreva um pedido curto ou clique em um dos exemplos. Use **Próximas receitas** e **Anteriores** para navegar sem alterar o pedido. O filtro de utensílios usa indícios registrados na receita. Confira o preparo na fonte antes de cozinhar.

## Executar

Com Node.js 22 ou superior, na pasta deste projeto:

```sh
npm test
npm run dev
```

Acesse http://localhost:8000/. Não há dependências npm externas. A busca é pública e feita no navegador. Para executar o modo generativo localmente, copie `.env.example` para `.env`, preencha os dois valores no seu ambiente e execute:

```sh
npm run build
node --env-file=.env scripts/dev.mjs
```

O servidor usa `OPENAI_API_KEY` e um `RAG_ACCESS_CODE` longo e aleatório, ambos mantidos fora do Git. O usuário habilita a opção de IA e insere o código de demonstração, não sua chave de API. Em hospedagem, configure as duas variáveis como segredos do servidor e publique o Worker gerado em `dist/server/index.js`. O código controla acesso à geração, mas não substitui uma cota de gastos no provedor. Sem segredos, só a busca fica disponível. A API é externa e pode gerar custos por consulta. Configure limites e não compartilhe o código publicamente.

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

O servidor refaz a mesma busca, passa somente até três fontes da página atual à OpenAI Responses API e exige JSON estruturado com os respectivos IDs. A interface associa cada explicação ao cartão original. Links, listas de ingredientes e sinais de equipamentos são obtidos da base, não do modelo. O prompt está em `worker/rag.mjs`. Configuração: `gpt-4.1-mini-2025-04-14`, temperatura 0,2, limite de 560 tokens de saída e `store: false`. O corpo enviado inclui a consulta e os campos selecionados das fontes. O modelo pode introduzir erros factuais mesmo quando o JSON é válido.

Referências: [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) e [documentação do modelo](https://platform.openai.com/docs/models/gpt-4.1-mini).

## Resultados da busca

| Consulta | Indicador entre as sugestões | TF-IDF sem filtro | Busca guiada |
| --- | --- | --- | --- |
| bolo fubá | Título com ambos os termos | 1/3 | 3/3 |
| frango com batata | Título com ambos os termos | 2/3 | 3/3 |
| risoto de carne | Título com ambos os termos | 0/3 | Sem retorno |
| Tenho frango e batata, mas não tenho forno. | Menção detectada a forno | 2/3 | 0/3 |
| Bolo sem liquidificador | Menção detectada a liquidificador | 3/3 | 0/3 |
| Tenho frango, mas não tenho panela de pressão. | Menção detectada a panela de pressão | 3/3 | 0/3 |
| ovo sem leite | Sugestões para restrição não suportada | 3/3 | Sem retorno |

Os indicadores consideram até três sugestões por método. O TF-IDF sem filtros é a referência baseada na técnica usada na Unidade 3, reexecutada sobre a mesma base. A busca guiada aumentou a correspondência no título em “bolo fubá” e “frango com batata”. No teste “frango e batata sem forno”, reduziu de 2/3 para 0/3 as sugestões com indícios de uso do forno. Em “risoto de carne”, nenhum dos métodos trouxe um título correspondente. A busca guiada não retornou receitas, portanto não resolveu o pedido.

### Exemplos de entrada e saída

| Entrada | Três primeiras sugestões da busca guiada | Total |
| --- | --- | ---: |
| Tenho frango e batata, mas não tenho forno. | Frango com batata (55 min); Batata suíça (15 min); Strogonoff de frango simples (30 min) | 8 |
| bolo fubá | Bolo de fubá cremoso (40 min); Bolo de fubá simples (45 min); Bolo de fubá de liquidificador cremoso sem trigo e assado na airfryer (50 min) | 7 |

### Limitações e melhorias

Sete pedidos não são suficientes para generalizar a qualidade da busca. Os indicadores não substituem uma avaliação humana de relevância, e a ausência de um indício de forno não garante que ele seja dispensável. A correspondência por palavras pode reunir ingredientes diferentes, como batata comum e batata palha, ou deixar passar sinônimos. A busca também não garante que todos os ingredientes estejam disponíveis e não adapta receitas ou verifica alergias. Melhorias possíveis incluem normalizar ingredientes com mais precisão, testar busca híbrida com embeddings e avaliar a relevância em mais pedidos.

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

Veja `docs/avaliacao-rag.md` e `web/experimento.json` para as explicações e a análise. Os testes automatizados usam um provedor simulado e não medem a qualidade da API. Na avaliação manual, o ChatGPT recebeu o contexto real recuperado pelo projeto. O ensaio não representa uma medição do snapshot configurado para produção.

## Publicação e entrega

O [guia de publicação](docs/publicacao-cloudflare.md) descreve o deploy, os segredos do servidor e os testes do novo endereço. A demonstração da busca não depende da OpenAI. Os itens marcados como **Sim** no quadro registram técnicas implementadas ou experimentadas no projeto, não a ativação da geração no endereço público. O ensaio manual e os testes simulados não substituem um teste de ponta a ponta com a API real.

Inclua esta pasta como `Unidade 04/` no repositório da disciplina. No README principal, adicione um link para este README e o endereço público que estiver validado na entrega. Preserve o material das unidades anteriores.

Uso auxiliar de IA: ChatGPT (OpenAI) para interpretar o enunciado, implementar o site, revisar documentação e rodar o ensaio de geração. O prompt de produção e a configuração relevante estão no código e acima. O snapshot exato do ChatGPT no ensaio manual não foi verificado de forma independente.
