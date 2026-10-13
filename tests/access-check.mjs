import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
const root=fileURLToPath(new URL('../',import.meta.url));
const temp=mkdtempSync(join(tmpdir(),'satonowa-access-'));
const compile=(text,file)=>ts.transpileModule(text,{fileName:file,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
let source=readFileSync(join(root,'lib/store.ts'),'utf8').replace("import { env } from 'cloudflare:workers';",'const env=globalThis.testEnv;').replace("import { getChatGPTUser } from '../app/chatgpt-auth';",'async function getChatGPTUser(){return globalThis.testUser;}').replace("'./domain.mjs'",JSON.stringify(pathToFileURL(join(root,'lib/domain.mjs')).href));
writeFileSync(join(temp,'store.mjs'),compile(source,'store.ts'));
for(const [name,file]of [['state','app/api/state/route.ts'],['backup','app/api/backup/route.ts'],['report','app/api/report/[id]/route.ts']]){
 source=readFileSync(join(root,file),'utf8').replace(/'\.\.\/[^']*lib\/store'/g,"'./store.mjs'").replace(/'\.\.\/[^']*lib\/report.mjs'/g,JSON.stringify(pathToFileURL(join(root,'lib/report.mjs')).href));
 writeFileSync(join(temp,name+'.mjs'),compile(source,file));
}
const sql=new DatabaseSync(':memory:');
sql.exec(readFileSync(join(root,'drizzle/0000_school.sql'),'utf8').replaceAll('--> statement-breakpoint',''));
class DB{prepare(query){let args=[];const raw=sql.prepare(query);const s={bind(...a){args=a;return s;},async first(){return raw.get(...args)||null;},async all(){return {results:raw.all(...args)};},async run(){const r=raw.run(...args);return {meta:{changes:Number(r.changes)}};}};return s;}async batch(items){sql.exec('BEGIN');try{const out=[];for(const s of items)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}}
globalThis.testEnv={DB:new DB(),SCHOOL_OWNER_EMAIL:'owner@example.test'};globalThis.testUser=null;
try{
 const api=await import(pathToFileURL(join(temp,'state.mjs')).href),backup=await import(pathToFileURL(join(temp,'backup.mjs')).href),report=await import(pathToFileURL(join(temp,'report.mjs')).href);
 assert.equal((await api.GET()).status,401);
 globalThis.testUser={userId:'intruder',email:'intruder@example.test',displayName:'未登録'};
 assert.equal((await api.GET()).status,403);assert.equal(sql.prepare('SELECT count(*) AS n FROM owners').get().n,0);
 globalThis.testUser={userId:'owner',email:'owner@example.test',displayName:'管理者'};
 let response=await api.GET(),data=await response.json();assert.equal(response.status,200);assert.equal(data.role,'admin');
 const request=body=>new Request('https://app.test/api/state',{method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json'},body:JSON.stringify(body)});
 const child={name:'架空児童',grade:'小4',school:'在籍校',guardian:'保護者情報',phone:'連絡先情報',schoolContact:'担当',submissionMethod:'PDF',deadline:'月末',start:'2026-04-01',end:'',days:[1,4],scheduleFrom:'2026-04-01'};
 response=await api.POST(request({revision:0,op:{type:'child',child}}));assert.equal(response.status,200);data=await response.json();const id=data.state.children[0].id;
 assert.equal((await api.POST(request({revision:0,op:{type:'calendar',date:'2026-09-01',open:false,label:''}}))).status,409);
 assert.equal((await api.POST(new Request('https://app.test/api/state',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:'{}'}))).status,403);
 assert.equal((await api.POST(request({revision:1,op:{type:'record',record:{childId:id,date:'2026-02-30',status:'came',activity:'',observation:'',internal:'',memo:''}}}))).status,400);
 assert.equal((await api.POST(request({revision:1,op:{type:'member',email:'staff@example.test',name:'職員'}}))).status,200);
 globalThis.testUser={userId:'unknown',email:'unknown@example.test',displayName:'部外者'};assert.equal((await api.GET()).status,403);
 globalThis.testUser={userId:'staff',email:'staff@example.test',displayName:'職員'};
 data=await(await api.GET()).json();assert.equal(data.role,'staff');assert.equal(data.state.children[0].phone,'');assert.equal(data.state.children[0].guardian,'');
 assert.equal((await api.POST(request({revision:1,op:{type:'child',child}}))).status,403);
 assert.equal((await backup.GET()).status,403);
 assert.equal((await report.GET(new Request('https://app.test'),{params:Promise.resolve({id:'none'})})).status,403);
 response=await api.POST(request({revision:1,op:{type:'record',record:{childId:id,date:'2026-09-14',status:'came',activity:'工作',observation:'様子',internal:'内部メモ',memo:''}}}));assert.equal(response.status,200);data=await response.json();assert.equal(data.state.children[0].phone,'');assert.equal(data.revision,2);
 assert.equal((await api.POST(request({revision:1,op:{type:'record',record:{childId:id,date:'2026-09-14',status:'none',activity:'',observation:'',internal:'',memo:''}}}))).status,409);
 console.log('API access checks passed.');
}finally{sql.close();delete globalThis.testEnv;delete globalThis.testUser;rmSync(temp,{recursive:true,force:true});}
