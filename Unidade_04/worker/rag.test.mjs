import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarServidor} from './handler.mjs';
import {criarBusca} from '../web/busca.mjs';
import {montarContexto,validar,MODEL} from './rag.mjs';
const corpus=readFileSync(new URL('../web/receitas.json',import.meta.url),'utf8');
const cases=JSON.parse(readFileSync(new URL('../web/experimento.json',import.meta.url),'utf8')).casos;
const busca=criarBusca(JSON.parse(corpus)), q=cases[0].q;
const api=(body)=>new Request('http://improvisa.test/api/rag',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json','Origin':'http://improvisa.test'}});
const app=()=>criarServidor({'/receitas.json':['application/json',corpus]});
const fail=()=>assert.fail('Não deveria chamar o modelo');
test('usa contexto recuperado com Workers AI, JSON e IDs correspondentes',async()=>{
 const env={AI:{run:async(model,opts)=>{
  assert.equal(model,MODEL);
  assert.equal(opts.response_format.type,'json_schema');
  const ctx=JSON.parse(opts.messages[1].content);
  assert.deepEqual(ctx.fontes.map(x=>x.titulo),cases[0].respostas.map(x=>x.titulo));
  assert.ok(ctx.fontes.every(x=>!x.sinais_de_equipamentos.includes('forno')));
  return {response:{explicacoes:cases[0].respostas.map(({id,texto})=>({id,texto}))}};
 }}};
 const server=app();
 assert.equal((await (await server.fetch(new Request('http://improvisa.test/api/status'),env)).json()).rag,true);
 const r=await server.fetch(api({q}),env);
 assert.equal(r.status,200);
 const data=await r.json();
 assert.equal(data.modo,'rag'); assert.equal(data.explicacoes.length,3);
});
test('sem binding, sem fontes ou entrada inválida não chama modelo',async()=>{
 const s=app(),env={AI:{run:fail}};
 assert.equal((await s.fetch(api({q}),{})).status,503);
 for(const consulta of ['risoto de carne','ovo sem leite']){
  const r=await s.fetch(api({q:consulta}),env);
  assert.equal(r.status,200); assert.deepEqual((await r.json()).explicacoes,[]);
 }
 assert.equal((await s.fetch(api({q,pagina:-1}),env)).status,400);
 assert.deepEqual((await (await s.fetch(api({q,pagina:1000}),env)).json()).explicacoes,[]);
});
test('valida formato, IDs e links indevidos',()=>{
 const contexto=montarContexto(q,busca(q)),exp=cases[0].respostas.map(({id,texto})=>({id,texto}));
 assert.throws(()=>validar({explicacoes:[{...exp[0],id:'R99'},...exp.slice(1)]},contexto));
 assert.throws(()=>validar({explicacoes:[{...exp[0],texto:'Veja https://exemplo.test'},...exp.slice(1)]},contexto));
});
test('falha de IA não retorna segredos nem interrompe a busca',async()=>{
 const r=await app().fetch(api({q}),{AI:{run:async()=>{throw Error('fake-key');}}});
 assert.equal(r.status,502);assert.ok(!(await r.text()).includes('fake-key'));
});
test('ensaios arquivados permanecem válidos como ensaio manual anterior',()=>{
 for(const c of cases){
  const ctx=montarContexto(c.q,busca(c.q));
  assert.deepEqual(ctx.fontes.map(({id,titulo})=>({id,titulo})),c.respostas.map(({id,titulo})=>({id,titulo})));
  validar({explicacoes:c.respostas},ctx);
 }
});
test('na segunda página envia somente fontes correspondentes',async()=>{
 const segunda=busca(q,{todas:true}).items.slice(3,6);
 assert.ok(segunda.length);
 const env={AI:{run:async(_model,opts)=>{
  const fontes=JSON.parse(opts.messages[1].content).fontes;
  assert.deepEqual(fontes.map(x=>x.titulo),segunda.map(x=>x.r.titulo));
  return {response:JSON.stringify({explicacoes:fontes.map(({id})=>({id,texto:'Explicação de teste.'}))})};
 }}};
 const r=await app().fetch(api({q,pagina:1}),env);
 assert.equal(r.status,200);assert.equal((await r.json()).explicacoes.length,segunda.length);
});
test('limita solicitações automáticas por instância',async()=>{
 const s=app(), env={AI:{run:async(_m,opts)=>({response:{explicacoes:JSON.parse(opts.messages[1].content).fontes.map(({id})=>({id,texto:'Ok.'}))}})}};
 for(let i=0;i<8;i++) assert.equal((await s.fetch(api({q}),env)).status,200);
 assert.equal((await s.fetch(api({q}),env)).status,429);
});
