import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criarServidor} from './handler.mjs';
import {criarBusca} from '../web/busca.mjs';
import {montarContexto,validar,MODEL} from './rag.mjs';
const corpus=readFileSync(new URL('../web/receitas.json',import.meta.url),'utf8');
const cases=JSON.parse(readFileSync(new URL('../web/experimento.json',import.meta.url),'utf8')).casos;
const busca=criarBusca(JSON.parse(corpus));
const q=cases[0].q;
const env={OPENAI_API_KEY:'fake-key',RAG_ACCESS_CODE:'demo-test'};
const api=(body)=>new Request('http://tempero.test/api/rag',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json','Origin':'http://tempero.test'}});
const app=(fetcher)=>criarServidor({'/receitas.json':['application/json',corpus]},{fetcher});
const cannotFetch=()=>assert.fail('Não deveria chamar o provedor');
test('usa as fontes recuperadas e valida a resposta estruturada',async()=>{
 const r=await app(async (url,opts)=>{
   assert.equal(url,'https://api.openai.com/v1/responses');
   const body=JSON.parse(opts.body), context=JSON.parse(body.input);
   assert.equal(body.store,false); assert.equal(body.model,MODEL); assert.equal(body.text.format.strict,true);
   assert.deepEqual(context.fontes.map(x=>x.titulo),cases[0].respostas.map(x=>x.titulo));
   assert.ok(context.fontes.every(x=>!x.sinais_de_equipamentos.includes('forno')));
   const payload={explicacoes:cases[0].respostas.map(({id,texto})=>({id,texto}))};
   return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(payload)}]}]});
 }).fetch(api({q,code:env.RAG_ACCESS_CODE}),env);
 assert.equal(r.status,200);
 const data=await r.json();
 assert.equal(data.modo,'rag'); assert.equal(data.explicacoes.length,3);
});
test('não chama o provedor sem configuração, com código errado ou sem fontes',async()=>{
 const s=app(cannotFetch);
 for(const [query,code,vars,expected] of [[q,'demo-test',{},503],[q,'errado',env,403],['risoto de carne','demo-test',env,200],['ovo sem leite','demo-test',env,200]]){
  const r=await s.fetch(api({q:query,code}),vars); assert.equal(r.status,expected);
  if(expected===200) assert.deepEqual((await r.json()).explicacoes,[]);
 }
});
test('rejeita ID fora do conjunto e link gerado',()=>{
 const context=montarContexto(q,busca(q));
 const exp=cases[0].respostas.map(({id,texto})=>({id,texto}));
 assert.throws(()=>validar({explicacoes:[{...exp[0],id:'R99'},...exp.slice(1)]},context));
 assert.throws(()=>validar({explicacoes:[{...exp[0],texto:'Veja https://exemplo.test'},...exp.slice(1)]},context));
});
test('contorna falha do provedor sem devolver segredo',async()=>{
 const r=await app(()=>Promise.resolve(new Response('fake-key',{status:429}))).fetch(api({q,code:'demo-test'}),env);
 assert.equal(r.status,502); assert.ok(!(await r.text()).includes('fake-key'));
});
test('ensaios arquivados correspondem aos resultados atuais do recuperador',()=>{
 for(const c of cases){
  const ctx=montarContexto(c.q,busca(c.q));
  assert.deepEqual(ctx.fontes.map(({id,titulo})=>({id,titulo})),c.respostas.map(({id,titulo})=>({id,titulo})));
  validar({explicacoes:c.respostas},ctx);
 }
});

test('contexto usa somente as receitas da página pedida',async()=>{
 const segunda=busca(q,{todas:true}).items.slice(3,6);
 assert.ok(segunda.length>0);
 const servidor=app(async (_url,opts)=>{
   const {fontes}=JSON.parse(JSON.parse(opts.body).input);
   assert.deepEqual(fontes.map(x=>x.titulo),segunda.map(x=>x.r.titulo));
   assert.ok(fontes.every(x=>!x.sinais_de_equipamentos.includes('forno')));
   const explicacoes=fontes.map(({id})=>({id,texto:'Explicação de teste.'}));
   return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({explicacoes})}]}]});
 });
 const res=await servidor.fetch(api({q,code:env.RAG_ACCESS_CODE,pagina:1}),env);
 assert.equal(res.status,200);
 assert.equal((await res.json()).explicacoes.length,segunda.length);
 assert.equal((await app(cannotFetch).fetch(api({q,code:env.RAG_ACCESS_CODE,pagina:-1}),env)).status,400);
 assert.deepEqual((await (await app(cannotFetch).fetch(api({q,code:env.RAG_ACCESS_CODE,pagina:1000}),env)).json()).explicacoes,[]);
});
