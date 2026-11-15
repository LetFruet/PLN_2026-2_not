import http from 'node:http';
import {readFile} from 'node:fs/promises';
const src=await readFile(new URL('../dist/server/index.js',import.meta.url));
const {default:app}=await import('data:text/javascript;base64,'+src.toString('base64'));
const port=Number(process.env.PORT||8000);
http.createServer(async(req,res)=>{
  try{
    const hasBody=req.method!=='GET'&&req.method!=='HEAD';
    const r=await app.fetch(new Request('http://localhost:'+port+req.url,{method:req.method,headers:req.headers,...(hasBody?{body:req,duplex:'half'}:{})}),process.env);
    res.writeHead(r.status,Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  }catch{res.writeHead(500);res.end();}
}).listen(port,'0.0.0.0',()=>console.log('Improvisa disponível em http://localhost:'+port));
