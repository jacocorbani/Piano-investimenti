import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve(process.argv[2] ?? 'dist');
const html=await readFile(resolve(root,'index.html'),'utf8');
assert(!/src\/main\.ts/.test(html),'Publish the compiled dist directory, not the source index.html');
const assets=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(m=>m[1]);
assert(assets.some(p=>p.endsWith('.js')),'Missing compiled JavaScript');
assert(assets.some(p=>p.endsWith('.css')),'Missing compiled CSS');
for(const path of assets){
  assert(path.startsWith('/Piano-investimenti/assets/'),'Asset outside GitHub Pages project base: '+path);
  assert(!path.includes('..'),'Invalid asset path');
  assert((await stat(resolve(root,path.slice('/Piano-investimenti/'.length)))).isFile(),'Missing asset: '+path);
}
console.log('Pages artifact verified: compiled JavaScript and CSS exist at the project base.');
