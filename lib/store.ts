import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
import { initialState, applyOperation } from './domain.mjs';
export class AppError extends Error {status:number; constructor(message:string,status=400){super(message);this.status=status;}}
export async function authorize(){
 const user=await getChatGPTUser();if(!user)throw new AppError('ログインが必要です',401);
 if(!env.DB)throw new AppError('共有保存先の準備が完了していません。架空データで操作を試せます。',503);
 const db=env.DB;
 const email=user.email.toLowerCase();
 let owner=await db.prepare('SELECT user_id FROM owners WHERE id=1').first<{user_id:string}>();
 if(!owner){
  const ownerEmail=env.SCHOOL_OWNER_EMAIL?.trim().toLowerCase();
  if(!ownerEmail)throw new AppError('管理者の初期設定が未完了です',503);
  if(email!==ownerEmail)throw new AppError('最初の設定はサイトの所有者が行ってください',403);
  await db.prepare('INSERT OR IGNORE INTO owners (id,user_id) VALUES (1,?)').bind(user.userId).run();
  owner=await db.prepare('SELECT user_id FROM owners WHERE id=1').first<{user_id:string}>();
 }
 if(owner?.user_id===user.userId)await db.prepare("INSERT OR IGNORE INTO members(email,user_id,role,name) VALUES (?,?,'admin',?)").bind(email,user.userId,user.displayName).run();
 const member=await db.prepare('SELECT * FROM members WHERE email=?').bind(email).first<{user_id:string|null,role:string,name:string}>();
 if(!member||(member.user_id&&member.user_id!==user.userId))throw new AppError('このアプリの職員として登録されていません',403);
 if(!member.user_id)await db.prepare('UPDATE members SET user_id=? WHERE email=? AND user_id IS NULL').bind(user.userId,email).run();
 await db.prepare('INSERT OR IGNORE INTO documents(id,revision,payload,change_id) VALUES(1,0,?,?)').bind(JSON.stringify(initialState()),'initial').run();
 return {db,user,role:member.role,ownerId:owner?.user_id};
}
export async function readDocument(db:D1Database){const doc=await db.prepare('SELECT revision,payload FROM documents WHERE id=1').first<{revision:number,payload:string}>();if(!doc)throw new AppError('保存先が見つかりません',503);return {revision:doc.revision,state:JSON.parse(doc.payload)};}
export async function mutate(op:any,revision:number,auth:Awaited<ReturnType<typeof authorize>>){
 if(['child','calendar','report'].includes(op.type)&&auth.role!=='admin')throw new AppError('管理者のみ操作できます',403);
 const old=await readDocument(auth.db);if(old.revision!==revision)throw new AppError('別の職員が更新しました。入力内容を控えてから再読込してください。',409);
 let next;try{next=applyOperation(old.state,op,auth.user.displayName);}catch(e){throw new AppError(e instanceof Error?e.message:'入力内容を確認してください');}const id=crypto.randomUUID();
 const payload=JSON.stringify(next);if(new TextEncoder().encode(payload).byteLength>1800000)throw new AppError('保存量が上限に近づいています。管理者に連絡してください',413);
 const results=await auth.db.batch([
  auth.db.prepare('UPDATE documents SET payload=?,revision=revision+1,change_id=? WHERE id=1 AND revision=?').bind(payload,id,revision),
  auth.db.prepare('INSERT INTO audits(id,actor,operation,created_at,revision) SELECT ?,?,?,?,revision FROM documents WHERE id=1 AND change_id=?').bind(id,auth.user.displayName,op.type,new Date().toISOString(),id)
 ]);
 if(!results[0].meta.changes)throw new AppError('別の職員が更新しました。入力内容を控えてから再読込してください。',409);
 return {state:next,revision:revision+1};
}
export function visibleState(state:any,role:string){if(role==='admin')return state;return {...state,children:state.children.map((c:any)=>({...c,guardian:'',phone:'',schoolContact:'',submissionMethod:'',deadline:''})),reports:[]};}
