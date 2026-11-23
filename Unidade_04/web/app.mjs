import {criarBusca,paginar,POR_PAGINA} from './busca.mjs';
const $ = s => document.querySelector(s);
const el = (tag, text, cls) => {
  const e=document.createElement(tag);
  if(text !== undefined) e.textContent=text;
  if(cls) e.className=cls;
  return e;
};
const trace = (titulo, rows) => {
  const d=el('details',undefined,'trace');
  d.append(el('summary',titulo),...rows);
  return d;
};
const link = r => {
  const a=el('a','Abrir no TudoGostoso ↗');
  a.href=r.url; a.target='_blank'; a.rel='noopener noreferrer';
  return a;
};
const attributo = (label,value)=>{
  const p=el('p');
  p.append(el('strong',label+' '),document.createTextNode(value));
  return p;
};
const ingredients = (label,arr) =>{
  const f=document.createDocumentFragment();
  f.append(el('p',label));
  if(arr.length){
    const list=el('ul');
    list.append(...arr.map(s=>el('li',s)));
    f.append(list);
  }else f.append(el('p','Nenhum item identificado.'));
  return f;
};
const cards=(items,filtros)=>{
  const group=el('div',undefined,'recipes');
  for(const {r,match,confiere,outrosIngredientes} of items){
    const card=el('article',undefined,'recipe');
    const motivo=el('div',undefined,'recipe-reason');
    const termos=match.length===1?'Encontrei este termo do seu pedido':'Encontrei estes termos do seu pedido';
    motivo.append(
      el('h4','Por que sugerimos esta receita?'),
      el('small','Explicação da busca','recipe-reason-label'),
      el('p',termos+' no título ou na lista de ingredientes: '+match.join(', ')+'.','recipe-reason-text')
    );
    if(filtros.length) motivo.append(el('p','Não identifiquei menção a '+filtros.join(', ')+' nos dados da receita. Confira o preparo no TudoGostoso.'));
    card.append(el('h3',r.titulo),motivo,el('small',[r.categorias[0],r.tempo].filter(Boolean).join(' · ')));
    card.append(trace('Ver ingredientes da receita',[
      ingredients('Itens que mencionam termos do pedido',confiere),
      ingredients('Outros itens listados (confira o que você tem)',outrosIngredientes)
    ]),link(r));
    group.append(card);
  }
  return group;
};
const historico=$('#history'), input=$('#query'), status=$('#base-status');
let busca, requisicao, ragDisponivel=false;
function executar(q){
  if(!busca) {status.textContent='A busca ainda não está disponível.'; return;}
  if(!q.trim()) return;
  requisicao?.abort();
  const {pedido,ref,items}=busca(q.trim(),{todas:true});
  const parts=[el('p',q.trim(),'bubble user-bubble')];
  let msg;
  if(pedido.outros.length) msg='Não consegui verificar esta restrição: '+pedido.outros.join(', ')+'. Não vou sugerir receitas para esse pedido. Se for um utensílio, tente outro nome.';
  else if(!pedido.termos.length) msg='Diga um ingrediente ou prato para eu procurar.';
  else if(!items.length) msg='Não encontrei uma receita que corresponda a todos os termos e filtros. Tente um pedido mais curto.';
  else msg=items.length===1?'Encontrei uma sugestão na base.':'Encontrei '+items.length+' sugestões na base.';
  parts.push(el('p',msg,'bubble'));
  if(!pedido.outros.length && pedido.termos.length){
    const detalhes=[attributo('Termos buscados:',pedido.termos.join(', ')),attributo('Evitar equipamentos:',pedido.filtro.join(', ')||'nenhum')];
    if(ref.length){
      const list=el('ol');
      list.append(...ref.map(x=>el('li',x.r.titulo + ' — cosseno '+x.score.toFixed(3).replace('.',','))));
      detalhes.push(
        el('h4','Para comparação · TF-IDF sem filtros','reference-title'),
        el('p','Lista de referência, ordenada da maior para a menor similaridade de cosseno. Esses valores não são as notas dos cartões abaixo.'),
        list
      );
    }
    parts.push(trace('Detalhes técnicos da busca',detalhes));
  }
  historico.replaceChildren(...parts);
  if(!items.length) return;
  const painel=el('section',undefined,'recipe-pages');
  painel.setAttribute('aria-label','Receitas encontradas');
  const resultados=el('div');
  const navegacao=el('nav',undefined,'recipe-pagination');
  navegacao.setAttribute('aria-label','Paginação de receitas');
  const anterior=el('button','‹ Anteriores'), proxima=el('button','Próximas receitas ›');
  anterior.type=proxima.type='button';
  const faixa=el('p');
  faixa.setAttribute('role','status');
  faixa.setAttribute('aria-atomic','true');
  navegacao.append(anterior,faixa,proxima);
  painel.append(
    el('h3','Sugestões do Improvisa','recipe-ranking-title'),
    el('p','A busca exige todos os termos do pedido no título ou nos ingredientes e aplica os filtros. Depois, dá mais peso aos termos do título do que à similaridade TF-IDF. Por isso, a ordem pode ser diferente da lista de comparação.','recipe-ranking-note'),
    resultados
  );
  if(items.length>POR_PAGINA) painel.append(navegacao);
  historico.append(painel);
  let pagina=0;
  const cache=new Map();
  function mostrar(moverFoco=false){
    requisicao?.abort();
    const current=new AbortController(); requisicao=current;
    const lote=paginar(items,pagina);
    const grupo=cards(lote.items,pedido.filtro);
    resultados.replaceChildren(grupo);
    faixa.textContent='Receitas '+(lote.inicio+1)+' a '+(lote.inicio+lote.items.length)+' de '+lote.total;
    anterior.disabled=pagina===0;
    proxima.disabled=lote.inicio+lote.items.length>=lote.total;
    if(moverFoco){
      const primeiro=grupo.querySelector('h3');
      primeiro.tabIndex=-1;
      primeiro.focus({preventScroll:true});
      primeiro.scrollIntoView({block:'nearest'});
    }
    if(ragDisponivel) explicar(q,lote.items,pagina,grupo,current,cache);
  }
  anterior.addEventListener('click',()=>{if(!anterior.disabled){pagina--;mostrar(true);}});
  proxima.addEventListener('click',()=>{if(!proxima.disabled){pagina++;mostrar(true);}});
  mostrar();
}
async function explicar(q,items,pagina,grupo,current,cache){
  const aplicar=(explicacoes)=>{
    const cartoes=grupo.querySelectorAll('.recipe');
    explicacoes.forEach(({id,texto},i)=>{
      const resumo=cartoes[i]?.querySelector('.recipe-reason-text');
      const rotulo=cartoes[i]?.querySelector('.recipe-reason-label');
      if(id==='R'+(i+1) && resumo && rotulo){
        resumo.textContent=texto;
        rotulo.textContent='Explicação com IA (Chatbot RAG)';
      }
    });
  };
  if(cache.has(pagina)){aplicar(cache.get(pagina));return;}
  const nota=el('p','Gerando explicação com IA…','rag-progress');
  nota.setAttribute('role','status');
  grupo.before(nota);
  try{
    const response=await fetch('./api/rag',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:q.trim(),pagina}),signal:current.signal});
    const data=await response.json();
    if(current.signal.aborted) return;
    if(!response.ok || data.modo!=='rag' || data.explicacoes?.length!==items.length){
      nota.textContent='A explicação da busca foi mantida. '+(data.erro||'A IA não respondeu agora.');
      return;
    }
    cache.set(pagina,data.explicacoes);
    aplicar(data.explicacoes);
    nota.remove();
  }catch{
    if(!current.signal.aborted) nota.textContent='A IA não respondeu agora. Mantivemos a explicação da busca.';
  }
}
$('#search').addEventListener('submit',e=>{e.preventDefault(); executar(input.value);});
for(const btn of document.querySelectorAll('[data-query]')) btn.addEventListener('click',()=>{input.value=btn.dataset.query;executar(input.value);});
try{
  const response=await fetch('./receitas.json');
  if(!response.ok) throw Error('base');
  const base=await response.json();
  busca=criarBusca(base);
  $('.send').disabled=false;
  status.textContent=base.length+' receitas disponíveis · Abra a receita original no TudoGostoso para conferir os ingredientes e o modo de preparo.';
}catch(e){
  status.textContent='Não foi possível carregar a base. Recarregue a página ou execute o site com um servidor local.';
  console.error(e);
}

try{
  const r=await fetch('./api/status');
  const info=await r.json();
  if(info.rag){
    ragDisponivel=true;
    $('#mode-badge').textContent='Busca + Chatbot RAG';
  }
}catch{}
