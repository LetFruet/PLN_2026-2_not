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
export function criarServidor(assets){
  let busca;
  const limitadores=new Map();
  const MAX_PEDIDOS=8, JANELA=60_000;
  return {async fetch(request,env={}){
    const url=new URL(request.url), path=url.pathname;
    const enabled=typeof env.AI?.run==='function';
    if(path==='/api/status' && request.method==='GET') return json({rag:enabled,model:enabled?MODEL:null,automatico:enabled});
    if(path==='/api/rag'){
      if(request.method!=='POST') return json({erro:'Método inválido.'},405);
      if(request.headers.get('origin') && request.headers.get('origin')!==url.origin) return json({erro:'Origem não permitida.'},403);
      if(!enabled) return json({erro:'Geração não configurada nesta hospedagem.'},503);
      if(!request.headers.get('content-type')?.startsWith('application/json')) return json({erro:'Use JSON.'},415);
      let data;
      try{ data=await leitura(request); }catch{return json({erro:'Pedido inválido.'},400);}
      if(typeof data.q!=='string'||!data.q.trim()||data.q.length>180) return json({erro:'Digite um pedido de até 180 caracteres.'},400);
      const pagina=data.pagina??0;
      if(!Number.isSafeInteger(pagina)||pagina<0) return json({erro:'Página inválida.'},400);
      busca??=criarBusca(JSON.parse(assets['/receitas.json'][1]));
      const q=data.q.trim(), achados=busca(q,{todas:true});
      achados.items=paginar(achados.items,pagina).items;
      if(!achados.items.length) return json({modo:'busca',explicacoes:[]});
      // Limitador simples por instância do Worker. Protege a cota, mas não é global entre instâncias.
      const ip=request.headers.get('CF-Connecting-IP')||'local';
      const agora=Date.now();
      for(const [chave,registro] of limitadores) if(agora-registro.inicio>JANELA) limitadores.delete(chave);
      const registro=limitadores.get(ip);
      if(registro && registro.contagem>=MAX_PEDIDOS) return json({erro:'Limite temporário de explicações atingido. A busca continua disponível.'},429);
      if(registro) registro.contagem++; else limitadores.set(ip,{inicio:agora,contagem:1});
      try{
        const explicacoes=await gerar(montarContexto(q,achados),env.AI);
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
