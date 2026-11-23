# Improvisa · Receitas com PLN

Mostra Virtual de PLN — FURB, 2026/2. Trabalho da Unidade 4, Modalidade B (aplicação web funcional).

**Equipe:** Alana Cristina Andreazza, Beatriz Moresco Joaquim, Caio Abrão Manarim, Haiko Rüdiger e Letícia Fruet.

**Aplicação publicada:** https://improvisa.receitas-pln.workers.dev/

O Improvisa é um recomendador de receitas desenvolvido com técnicas de Processamento de Linguagem Natural (PLN). A aplicação utiliza uma base de 620 receitas do TudoGostoso, preparada na Unidade 3, para encontrar sugestões relacionadas aos ingredientes e às restrições informadas pelo usuário.

A busca apresenta até três receitas por página, com ingredientes, tempo de preparo, links para as fontes e explicações sobre as recomendações. Essas explicações podem ser geradas automaticamente por um modelo de linguagem, utilizando a abordagem RAG (*Retrieval-Augmented Generation*).

A aplicação está organizada em três páginas:

- **Início:** interface funcional para pesquisar receitas e visualizar as explicações do Chatbot RAG.
- **Método:** apresentação da base de dados, do processamento dos textos, das técnicas de busca e da integração com IA.
- **Resultados:** comparação com a Unidade 3, avaliação da busca, testes do Chatbot RAG e discussão das limitações.

## Como executar

É necessário ter o Node.js 22 ou superior instalado.

Na pasta `Unidade_04`, execute:

```sh
npm test
npm run dev
```

Depois, acesse:

http://localhost:8000/

O comando `npm test` verifica o funcionamento da busca e os principais comportamentos da integração com IA. Já o `npm run dev` inicia a aplicação localmente.

**Execução local sem IA:** a busca funciona normalmente, mas as explicações são apresentadas pelo texto padrão, pois esse modo não disponibiliza o binding do Workers AI.

**Execução local com IA:** para testar também a geração automática, execute:

```sh
npm run build
npx wrangler dev
```

Acesse o endereço local informado pelo Wrangler. Nesse modo, a aplicação pode utilizar o Workers AI da conta Cloudflare, consumindo a cota disponível.

Não é necessário configurar uma chave da OpenAI ou inserir um código de acesso na interface. A integração com Workers AI é configurada no servidor.

Para gerar novamente a base a partir do arquivo CSV da Unidade 3:

```sh
python preparar.py caminho/receitas_tudogostoso_processadas.csv
```

## Dados e metodologia

A aplicação utiliza 620 receitas com URLs distintas, contendo informações como título, categoria, ingredientes, tempo de preparo e, quando disponíveis, utensílios e etapas de preparação.

O processamento organiza os dados para permitir a comparação entre os pedidos dos usuários e as receitas. Foram identificados 95 nomes de utensílios, agrupados em 92 categorias. Entretanto, 248 receitas não possuem uma lista explícita de utensílios, o que representa uma limitação para a aplicação dos filtros.

A recuperação das receitas utiliza duas abordagens:

**TF-IDF sem filtros:** método de referência baseado na frequência dos termos e na similaridade de cosseno. Essa abordagem permite comparar o texto do pedido com os textos das receitas, mas não interpreta restrições de equipamentos.

**Busca guiada do Improvisa:** combina a correspondência dos termos nos títulos e ingredientes com a similaridade TF-IDF. A pontuação considera:

- 50% — cobertura dos termos no título ou nos ingredientes;
- 35% — cobertura dos termos no título;
- 15% — similaridade de cosseno com TF-IDF.

A busca guiada exige a presença dos termos principais e aplica filtros para evitar receitas com indícios de uso de equipamentos que o usuário deseja excluir. Quando uma restrição não pode ser verificada, o sistema pode optar por não apresentar sugestões.

A normalização e a identificação de termos são implementadas em JavaScript, utilizando um tokenizador e uma lista simplificada de palavras de parada. Portanto, essa implementação não reproduz exatamente o processamento com NLTK realizado anteriormente.

A aplicação não verifica se o usuário possui todos os ingredientes necessários, não realiza substituições e não garante a ausência de um equipamento apenas porque ele não foi mencionado nos dados.

## Geração de explicações com RAG

Além da busca, o Improvisa utiliza RAG para gerar explicações sobre as receitas recomendadas.

O funcionamento ocorre em duas etapas:

1. **Recuperação:** a busca seleciona as receitas relacionadas ao pedido, considerando os termos e os filtros.
2. **Geração:** o servidor envia informações de até três receitas da página atual ao modelo de linguagem, que produz uma explicação para cada sugestão.

A geração é realizada pelo **Cloudflare Workers AI**, utilizando o modelo **Llama 3.3 70B Instruct FP8 Fast** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`).

O modelo recebe a consulta e informações selecionadas das receitas recuperadas, como título, ingredientes correspondentes e sinais de equipamentos. Ele não escolhe nem reordena os resultados da busca.

O prompt está no arquivo `worker/rag.mjs` e orienta o modelo a utilizar somente os dados fornecidos. A integração solicita uma resposta em JSON, contendo os identificadores e os textos das explicações. O servidor valida a estrutura e os identificadores para associar cada resposta ao cartão correto.

**Configurações principais:**

- Modelo: Llama 3.3 70B Instruct FP8 Fast.
- Provedor: Cloudflare Workers AI.
- Acesso: integração pelo binding `AI` do Cloudflare Worker.
- Temperatura: 0,2.
- Limite de geração: 650 tokens.
- Saída solicitada: JSON estruturado.

Quando o usuário realiza uma busca, as receitas aparecem primeiro com uma explicação padrão. Se a geração com IA funcionar, esse texto é substituído pela explicação produzida pelo modelo, identificada como **“Explicação com IA (Chatbot RAG)”**.

Caso o modelo não responda ou a cota esteja indisponível, a busca continua funcionando e a explicação padrão permanece.

Embora o prompt oriente o modelo a utilizar as fontes recuperadas, a geração pode apresentar afirmações imprecisas. Por isso, o usuário deve conferir os ingredientes e o modo de preparo na receita original.

**Referências técnicas:**

- [Cloudflare Workers AI — Bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/)
- [Cloudflare Workers AI — JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)

## Resultados da busca

Comparamos a busca guiada do Improvisa com o TF-IDF sem filtros, utilizando a mesma base de 620 receitas e sete consultas.

| Consulta | Indicador entre as sugestões | TF-IDF sem filtros | Busca guiada |
| --- | --- | --- | --- |
| bolo fubá | Título com ambos os termos | 1/3 | 3/3 |
| frango com batata | Título com ambos os termos | 2/3 | 3/3 |
| risoto de carne | Título com ambos os termos | 0/3 | Sem retorno |
| Tenho frango e batata, mas não tenho forno. | Menção detectada a forno | 2/3 | 0/3 |
| Bolo sem liquidificador | Menção detectada a liquidificador | 3/3 | 0/3 |
| Tenho frango, mas não tenho panela de pressão. | Menção detectada a panela de pressão | 3/3 | 0/3 |
| ovo sem leite | Sugestões para restrição não suportada | 3/3 | Sem retorno |

Nos pedidos por ingredientes, a avaliação considera quantos dos três primeiros títulos apresentam os termos principais. Já nos pedidos com restrições de equipamentos, verifica quantas sugestões possuem indícios do equipamento que o usuário deseja evitar.

Os resultados mostram que a busca guiada conseguiu priorizar receitas com maior correspondência lexical e evitar sugestões com indícios dos equipamentos excluídos. Também deixou de recomendar receitas quando não conseguiu verificar determinadas restrições.

Entretanto, essa avaliação considera apenas sete consultas e indicadores específicos. Ela não mede a relevância geral das recomendações nem garante que uma receita possa ser preparada sem determinado equipamento.

## Avaliação do Chatbot RAG

Também realizamos testes manuais com o Chatbot RAG funcionando na aplicação publicada, utilizando o modelo Llama 3.3 70B por meio do Cloudflare Workers AI.

Foram analisadas cinco consultas, observando a geração das explicações, a relação com as receitas recuperadas, a clareza e possíveis afirmações não sustentadas pelos dados.

| Consulta | Resultado observado |
| --- | --- |
| bolo fubá | O modelo gerou explicações para as receitas encontradas. Algumas respostas ficaram semelhantes a listas de ingredientes e utensílios. |
| frango com batata | As explicações relacionaram as receitas aos ingredientes pesquisados, mas a busca também recuperou variantes como batata palha. |
| frango e batata sem forno | Foram geradas explicações, porém algumas afirmaram que as receitas dispensavam forno sem que os dados permitissem confirmar isso. |
| bolo sem liquidificador | O modelo gerou explicações, mas em alguns casos concluiu que o liquidificador não era necessário apenas pela ausência de menção ao equipamento. |
| ovo sem leite | A aplicação informou que não conseguia verificar a restrição e não apresentou receitas como compatíveis. |

Os testes mostraram que o RAG acrescentou explicações automáticas às sugestões, permitindo apresentar informações específicas das receitas recuperadas.

Por outro lado, a qualidade das respostas variou conforme o pedido. As principais limitações apareceram nas consultas com restrições de equipamentos, quando o modelo interpretou a ausência de uma menção como confirmação de que o equipamento não seria necessário.

Assim, o RAG ampliou a funcionalidade do recomendador, mas não eliminou as limitações dos dados e da recuperação. As explicações são um recurso auxiliar e precisam ser interpretadas considerando essas restrições.

Essa foi uma avaliação qualitativa de cinco consultas. Os testes automatizados verificam o comportamento do código e da integração, mas não representam uma medição da precisão factual das respostas reais do modelo.

Os exemplos completos e as evidências dessa avaliação estão registrados no documento [Avaliação do Chatbot RAG](docs/avaliacao-rag.md).

## Quadro da Unidade 4

| Tecnologia ou abordagem | Utilizada? | Aplicação ou justificativa |
| --- | --- | --- |
| LLMs e modelos de linguagem | Sim | O Workers AI gera explicações para as receitas recuperadas pela busca. |
| Prompt engineering e saídas estruturadas | Sim | O prompt orienta a geração com base nas fontes, e o servidor valida a estrutura JSON e os identificadores das respostas. |
| RAG e recuperação de informações | Sim | A busca recupera receitas da base, cujas informações são utilizadas como contexto para gerar explicações. |
| Agentes e integração com ferramentas | Não | A sequência de etapas é definida pelo código. O modelo não escolhe ferramentas nem executa ações autonomamente. |
| Modelos locais ou quantizados | Não | Não executamos modelos localmente nem realizamos quantização. Utilizamos uma variante FP8 do Llama 3.3 disponibilizada pelo Cloudflare Workers AI. |
| Processamento multimodal | Não | Os pedidos, os dados e as explicações são processados em texto. |
| Outras técnicas avançadas de PLN | Sim | A busca combina TF-IDF, correspondência lexical e filtros de equipamentos, comparando os resultados com o método de referência. |

## Limitações e possibilidades de melhoria

Apesar dos resultados obtidos, o Improvisa ainda apresenta limitações relacionadas à busca e à geração de explicações.

A recuperação depende da correspondência entre palavras, podendo confundir ingredientes principais com acompanhamentos ou variantes. Por exemplo, uma receita com batata palha pode ser sugerida para alguém que informou possuir batata comum.

Outra limitação está na identificação dos utensílios. Como parte das receitas possui registros incompletos, não encontrar menção a um equipamento não significa necessariamente que ele seja dispensável.

Na etapa de geração, o modelo pode apresentar interpretações incorretas mesmo quando recebe informações recuperadas da base. A validação do JSON garante a estrutura da resposta e a associação com os cartões, mas não comprova a veracidade de todas as afirmações.

Como melhorias futuras, consideramos:

- Diferenciar ingredientes principais de acompanhamentos e variantes.
- Priorizar receitas que exijam menos ingredientes adicionais.
- Melhorar a identificação de utensílios mencionados indiretamente no preparo.
- Investigar a combinação de TF-IDF com embeddings para reconhecer pedidos expressos de maneiras diferentes.
- Ampliar a avaliação com mais consultas, exemplos de restrições e revisão manual das recomendações e explicações.
- Aprimorar a validação das respostas geradas pelo modelo.

## Publicação e documentação

**Aplicação publicada:** https://improvisa.receitas-pln.workers.dev/

**Páginas disponíveis:**

- [Início](https://improvisa.receitas-pln.workers.dev/)
- [Método](https://improvisa.receitas-pln.workers.dev/metodo.html)
- [Resultados](https://improvisa.receitas-pln.workers.dev/resultados.html)

A aplicação está hospedada no Cloudflare Workers, com o Workers AI integrado ao servidor.

Para publicar a aplicação na conta Cloudflare configurada para o projeto, execute na pasta `Unidade_04`:

```sh
npx wrangler login
npx wrangler deploy
```

O arquivo `wrangler.jsonc` define o Worker e o binding `AI` utilizado na integração. A publicação exige acesso à conta Cloudflare responsável pelo projeto.

O plano gratuito do Workers AI possui uma franquia diária de processamento. Quando a geração não está disponível, o Improvisa mantém a busca e as explicações padrão.

**Documentação complementar:**

- [Avaliação do Chatbot RAG](docs/avaliacao-rag.md): registro dos testes realizados com o Workers AI, exemplos de respostas, capturas de tela e análise dos resultados e limitações.

Os testes automatizados podem ser executados com `npm test`. O código-fonte, os scripts de preparação, os testes e os arquivos utilizados pela aplicação estão organizados nesta pasta.

**Uso auxiliar de IA:** ferramentas de IA generativa, incluindo o ChatGPT (OpenAI), auxiliaram na interpretação do enunciado, na programação e na revisão da documentação. A geração de explicações disponibilizada na aplicação utiliza o Cloudflare Workers AI, conforme o modelo e as configurações descritos neste README.
