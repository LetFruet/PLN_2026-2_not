import {CATALOGO} from './utensilios.mjs';
const STOP = new Set('a o as os e de da do das dos com em um uma uns umas para por no na nos nas tenho tem quero queria gostaria preciso pode posso poderia fazer faco receita receitas que algo prato preparar cozinhar sugestao sugira comer estou meu minha aqui hoje me tenho tenho sem usar uso mas nao preciso evite evitando so somente tenho qualquer almoco jantar lanche sobremesa posso poderia da consigo sugestoes'.split(/\s+/));
export const normal = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const lex = s => normal(s).match(/[a-z]+/g) || [];
const singular = s => s.length > 3 ? s.replace(/oes$/,'ao').replace(/([aeiou])s$/,'$1') : s;
const termos = s => lex(s).filter(t=>!STOP.has(t)).map(singular);
const original = s => lex(s).filter(t=>!STOP.has(t));
const chaveUtensilio = s => normal(s).replace(/[-–—]/g,' ').trim().replace(/\s+/g,' ');
const aliases = new Map(Object.entries(CATALOGO).flatMap(([nome, formas])=>formas.map(forma=>[forma,nome])));
const inicioRestricao = /\b(?:sem(?:\s+(?:usar|ter|utilizar))?|nao\s+(?:tenho|tem|uso|quero(?:\s+usar)?|posso\s+usar)|evite|evitar)\s+/g;
export function interpretar(consulta) {
  let s = normal(consulta), filtro = [], outros = [];
  // Consome a lista inteira. Uma restrição desconhecida não vira termo positivo
  // e não é ignorada mesmo quando aparece junto de um utensílio conhecido.
  const linhas=s.split(/([.!?;])/);
  s=linhas.map(trecho=>{
    const marcas=[...trecho.matchAll(inicioRestricao)];
    for(let i=marcas.length-1;i>=0;i--){
      const m=marcas[i], comeco=m.index+m[0].length;
      const cauda=trecho.slice(comeco);
      const fim=cauda.search(/\b(?:mas\b|o que\b|(?:e\s+)?(?:quero|gostaria|tenho|preciso|pode|posso)\b)/);
      const lista=cauda.slice(0,fim<0?undefined:fim).replace(/(?:\s+(?:e|ou|nem)|[,\s])+$/g,'');
      for(const parte of lista.split(/,|\s+(?:e|ou|nem)\s+/).reverse()){
        const termo=chaveUtensilio(parte).replace(/^(?:um|uma|o|a|os|as)\s+/,'');
        if(!termo)continue;
        const nome=aliases.get(termo);
        if(nome) filtro.unshift(nome); else outros.unshift(termo);
      }
      if(!lista.trim()) outros.unshift('utensílio não informado');
      trecho=trecho.slice(0,m.index)+' '+cauda.slice(fim<0?cauda.length:fim);
    }
    return trecho;
  }).join('');
  if(/\b(?:alerg\w*|intoler\w*|vegano|vegana|vegetariano|vegetariana|celiac\w*)\b/.test(normal(consulta))) outros.push('restrição alimentar');
  if(/\b(?:em|ate|no maximo|menos de)\s+\d+\s*(?:min|hora)/.test(normal(consulta))) outros.push('limite de tempo');
  return {termos:[...new Set(termos(s))], literais:original(s), filtro:[...new Set(filtro)], outros:[...new Set(outros)]};
}
const counts = a => {const m=new Map(); for(const x of a) m.set(x,(m.get(x)||0)+1); return m; };
const cmp = (a,b) => b.score-a.score || a.i-b.i;
export const POR_PAGINA=3;
export function paginar(items,pagina=0){
  const inicio=pagina*POR_PAGINA;
  return {inicio, items:items.slice(inicio,inicio+POR_PAGINA),total:items.length};
}
export function criarBusca(base){
  const n=base.length, docs=base.map(r=>counts(r.tokens)), df=new Map();
  docs.forEach(d=>{for(const t of d.keys()) df.set(t,(df.get(t)||0)+1);});
  const peso=(t,f)=>f*(1+Math.log((n+1)/((df.get(t)||0)+1)));
  const normas=docs.map(d=>Math.hypot(...[...d].map(([t,f])=>peso(t,f))));
  const fields=base.map(r=>({tit:new Set(termos(r.titulo)),ing:new Set(termos(r.ingredientes.join(' ')))}));
  return (q,{todas=false}={})=>{
    const pedido=interpretar(q);
    const qv=[...counts(original(q))].filter(([t])=>df.has(t)).map(([t,f])=>[t,peso(t,f)]);
    const nq=Math.hypot(...qv.map(([,f])=>f));
    const scores=docs.map((d,i)=>{const den=nq*normas[i]; return den?qv.reduce((s,[t,f])=>s+(d.has(t)?f*peso(t,d.get(t)):0),0)/den:0;});
    const ref=base.map((r,i)=>({i,r,score:scores[i]})).filter(x=>x.score>0).sort(cmp).slice(0,3);
    if(!pedido.termos.length || pedido.outros.length) return {pedido,ref,items:[]};
    const items=base.map((r,i)=>{
      const {tit,ing}=fields[i], match=pedido.termos.filter(t=>ing.has(t)||tit.has(t));
      const titHits=match.filter(t=>tit.has(t)).length;
      const score=0.50*match.length/pedido.termos.length + 0.35*titHits/pedido.termos.length +0.15*scores[i];
      return {i,r,match,score,confiere:r.ingredientes.filter(s=>termos(s).some(t=>pedido.termos.includes(t))), outrosIngredientes:r.ingredientes.filter(s=>!termos(s).some(t=>pedido.termos.includes(t)))};
    }).filter(x=>x.match.length===pedido.termos.length && (!pedido.filtro.length || (x.r.preparo && pedido.filtro.every(f=>!x.r.sinais.includes(f))))).sort(cmp);
    return {pedido,ref,items:todas?items:paginar(items).items};
  };
}
