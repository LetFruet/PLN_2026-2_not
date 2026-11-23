import {criarBusca} from './busca.mjs';
import {avaliar} from './avaliacao.mjs';
const $ = s => document.querySelector(s);
const el = (tag, text, cls) => {
  const e=document.createElement(tag);
  if(text !== undefined) e.textContent=text;
  if(cls) e.className=cls;
  return e;
};
const attributo = (label,value)=>{
  const p=el('p');
  p.append(el('strong',label+' '),document.createTextNode(value));
  return p;
};
function montarAvaliacao(busca){
  const div=el('div',undefined,'tablewrap'),table=el('table'), thead=el('thead'),tbody=el('tbody'), tr=el('tr');
  ['Consulta','Indicador no top 3','TF-IDF','Busca guiada'].forEach(t=>{const h=el('th',t);h.scope='col';tr.append(h);});
  thead.append(tr);table.append(thead,tbody);
  const fmt=(a,b)=> b ? a+'/'+b : '0 (sem retorno)';
  for(const r of avaliar(busca)){
    const linha=el('tr');
    [r.q,r.criterio,fmt(r.ref,r.nRef),fmt(r.items,r.nItems)].forEach(t=>linha.append(el('td',t)));
    tbody.append(linha);
  }
  div.append(table);
  $('#evaluation-output').replaceChildren(el('h3','Sete consultas, dois métodos'),el('p','Cada linha compara o que os dois métodos encontraram para o mesmo pedido. Um valor como 2/3 significa que duas das três sugestões entraram na contagem daquela linha.','metric'),
    attributo('Pedidos por nome ou ingredientes:', 'Nas três primeiras linhas, contamos quantos títulos incluem todos os termos principais. Por exemplo, em “bolo fubá”, o título precisa ter “bolo” e “fubá”. Aqui, quanto maior a contagem, melhor.'),
    attributo('Pedidos com restrição:', 'Em “frango e batata sem forno”, contamos quantas sugestões têm indício de uso de forno nos dados da receita. Aqui, quanto menor a contagem, melhor. Em “ovo sem leite”, verificamos se o método devolve sugestões mesmo sem saber verificar essa restrição.'),
    el('p','As contagens são automáticas. Não detectar um utensílio nos dados não garante que a receita possa ser feita sem ele.','metric'),div);
}

try {
  const response=await fetch('./receitas.json');
  if(!response.ok) throw Error('base');
  const base=await response.json();
  const busca=criarBusca(base);
  montarAvaliacao(busca);
} catch(error) {
  $('#evaluation-output').textContent='Resultados indisponíveis porque a base não carregou.';
  console.error(error);
}
