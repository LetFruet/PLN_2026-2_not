import {normal} from './busca.mjs';
export const casos = [
  {q:'bolo fubá', alvo:['bolo','fuba']},
  {q:'frango com batata', alvo:['frango','batata']},
  {q:'risoto de carne', alvo:['risoto','carne']},
  {q:'Tenho frango e batata, mas não tenho forno.', evitar:'forno'},
  {q:'Bolo sem liquidificador', evitar:'liquidificador'},
  {q:'Tenho frango, mas não tenho panela de pressão.', evitar:'panela de pressão'},
  {q:'ovo sem leite', recusar:true},
];
export function avaliar(busca){
  return casos.map(({q,alvo,evitar,recusar})=>{
    const {ref,items}=busca(q);
    const conta=(lista)=>alvo?lista.filter(x=>{
      const t=normal(x.r.titulo).match(/[a-z]+/g)||[];
      return alvo.every(v=>t.includes(v)||t.includes(v+'s'));
    }).length : evitar?lista.filter(x=>x.r.sinais.includes(evitar)).length : lista.length;
    const criterio=alvo?'Títulos com todos os termos principais':evitar?'Sugestões com sinal de '+evitar:'Sugestões para restrição não suportada';
    return {q,criterio,ref:conta(ref),items:conta(items),nRef:ref.length,nItems:items.length};
  });
}
