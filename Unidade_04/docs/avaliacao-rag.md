# Avaliação exploratória da geração com fontes

## Procedimento

1. A mesma busca usada no site recebeu cinco pedidos. Registraram-se os IDs, títulos, termos, ingredientes e sinais de equipamentos das receitas recuperadas.
2. Para três pedidos com fontes, o ChatGPT (OpenAI, nesta conversa) recebeu os contextos exportados. A tarefa foi explicar cada sugestão em português, usar somente a fonte correspondente, mencionar itens adicionais sem presumir que o usuário os tem e nunca garantir a ausência de equipamento. Essa execução manual é diferente da chamada ao snapshot configurado no servidor.
3. Para os dois pedidos sem fontes válidas, não foi solicitada geração. O código também é testado para não fazer chamadas nesse caso.
4. Revisamos os exemplos de cada pedido contra o contexto exportado. A amostra é intencional, pequena e foi revisada na mesma conversa em que as explicações foram produzidas. Não há avaliador cego nem amostra independente.

## Observações

| Consulta | Fontes | Explicações com ID e título correspondente | Explicações que mencionaram ingredientes ausentes do contexto | Observação |
| --- | ---: | ---: | ---: | --- |
| Frango e batata sem forno | 3 | 3/3 | 0/3 | A explicação distingue a batata palha da batata da despensa e trata o frango da batata suíça como opção de recheio. Não garante preparo sem forno. |
| Bolo de fubá | 3 | 3/3 | 0/3 | A geração distingue variantes e cita equipamentos registrados. |
| Bolo sem liquidificador | 3 | 3/3 | 0/3 | As explicações mencionam ausência de sinal e destacam equipamentos alternativos registrados. |
| Risoto de carne | 0 | Não se aplica | Não se aplica | A busca não retornou fonte correspondente e o modelo não foi chamado. |
| Ovo sem leite | 0 | Não se aplica | Não se aplica | Restrição não suportada. Nenhuma receita foi apresentada como compatível. |

As nove explicações estão em `web/experimento.json`. Nos seis textos com restrição de equipamento, nenhum trouxe garantia de compatibilidade. A associação correta das fontes é esperada porque o programa exige IDs válidos e monta os links a partir dos registros originais.

A geração ajudou a resumir diferenças que não aparecem no ranking, mas o experimento não mostra melhora geral da relevância. O recomendador ainda pode confundir um ingrediente com uma variante ou item secundário, e o modelo depende dos resultados recuperados. Uma avaliação futura deve incluir consultas não vistas, revisão humana independente, taxa de afirmações sem apoio, latência e taxa de fallback com o provedor real.

## Reproduzir

Rode `npm test` para verificar o recuperador e contrato do serviço. Os testes de integração com resposta simulada não são resultados da API. Para repetir com o provedor, configure o modo generativo e envie as mesmas consultas no navegador. Compare as explicações exibidas com os registros dos cartões e com a fonte original.

> **Atualização:** a geração no site passou de OpenAI API para Workers AI (`@cf/meta/llama-3.1-8b-instruct`). Os nove textos registrados acima são do ensaio manual anterior com ChatGPT e não devem ser apresentados como avaliação do novo modelo. Os testes automatizados usam um modelo simulado; é necessário testar a geração real após o deploy.
