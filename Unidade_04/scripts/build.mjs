import { mkdir,readFile,writeFile,copyFile } from 'node:fs/promises';
const root = new URL('../',import.meta.url);
const read = p => readFile(new URL(p,root),'utf-8');
const assetTypes={'index.html':'text/html','style.css':'text/css','app.mjs':'text/javascript','avaliacao.mjs':'text/javascript','busca.mjs':'text/javascript','utensilios.mjs':'text/javascript','receitas.json':'application/json'};
const assets={};
for(const [name,type] of Object.entries(assetTypes)) assets['/'+name]=[type+'; charset=utf-8',await read('web/'+name)];
const utensilios=(await read('web/utensilios.mjs')).replace('export const','const');
const busca=(await read('web/busca.mjs')).replace(/^import .*;\n/gm,'').replaceAll('export ','');
const rag=(await read('worker/rag.mjs')).replaceAll('export ','');
const handler=(await read('worker/handler.mjs')).replace(/^import .*;\n/gm,'').replaceAll('export ','');
for (const dir of ['dist/server','dist/.openai']) await mkdir(new URL(dir,root),{recursive:true});
await writeFile(new URL('dist/server/index.js',root),utensilios+'\n'+busca+'\n'+rag+'\n'+handler+'\nconst assets='+JSON.stringify(assets)+';\nexport default criarServidor(assets);\n');
try {
  await copyFile(new URL('.openai/hosting.json',root),new URL('dist/.openai/hosting.json',root));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
