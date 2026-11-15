import {criarBusca,paginar} from '../web/busca.mjs';
import {gerar, montarContexto, MODEL} from './rag.mjs';
const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',
 'Content-Security-Policy':"default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self' https://chatgpt.com"};
const json=(value,status=200)=>Response.json(value,{status,headers:{...headers,'Cache-Control':'no-store'}});
async function leitura(request){
  const reader=request.body?.getReader();
  if(!reader) throw Error('sem pedido');
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let total=0,body='';
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done) break;
      total+=value.byteLength;
      if(total>1600){ await reader.cancel(); throw Error('limite do corpo'); }
      body+=decoder.decode(value,{stream:true});
    }
    return JSON.parse(body+decoder.decode());
  }finally{reader.releaseLock();}
}
export function criarServidor(assets,{fetcher=fetch}={}){
  let busca;
  return {async fetch(request,env={}){
    const url=new URL(request.url), path=url.pathname;
    const enabled=Boolean(env.OPENAI_API_KEY&&env.RAG_ACCESS_CODE);
    if(path==='/api/status' && request.method==='GET') return json({rag:enabled,model:enabled?MODEL:null,accessCode:enabled});
    if(path==='/api/rag'){
      if(request.method!=='POST') return json({erro:'Método inválido.'},405);
      if(request.headers.get('origin') && request.headers.get('origin')!==url.origin) return json({erro:'Origem não permitida.'},403);
      if(!enabled) return json({erro:'Geração não configurada nesta hospedagem.'},503);
      if(!request.headers.get('content-type')?.startsWith('application/json')) return json({erro:'Use JSON.'},415);
      let data;
      try{ data=await leitura(request); }catch{return json({erro:'Pedido inválido.'},400);}
      if(data?.code!==env.RAG_ACCESS_CODE) return json({erro:'Código de demonstração inválido.'},403);
      if(typeof data.q!=='string'||!data.q.trim()||data.q.length>180) return json({erro:'Digite um pedido de até 180 caracteres.'},400);
      const pagina=data.pagina??0;
      if(!Number.isSafeInteger(pagina)||pagina<0) return json({erro:'Página inválida.'},400);
      busca??=criarBusca(JSON.parse(assets['/receitas.json'][1]));
      const q=data.q.trim(), achados=busca(q,{todas:true});
      achados.items=paginar(achados.items,pagina).items;
      if(!achados.items.length) return json({modo:'busca',explicacoes:[]});
      try{
        const explicacoes=await gerar(montarContexto(q,achados),env.OPENAI_API_KEY,fetcher);
        return json({modo:'rag',model:MODEL,explicacoes});
      }catch{
        return json({erro:'Não consegui gerar explicações agora. As receitas da busca continuam disponíveis.'},502);
      }
    }
    if(request.method!=='GET'&&request.method!=='HEAD') return json({erro:'Método inválido.'},405);
    const asset=assets[path==='/'?'/index.html':path];
    return asset ? new Response(request.method==='HEAD'?null:asset[1],{headers:{...headers,'Content-Type':asset[0],'Cache-Control':'no-cache'}}) : new Response('Página não encontrada.',{status:404,headers});
  }};
}
