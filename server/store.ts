import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { immutableSnapshotError } from './agent-state.ts';
import { blankProfile, type Profile } from './profile.ts';
import { normalizeCompany } from './agent-engine.ts';
export class Store {
 db:DatabaseSync;
 private transactionDepth=0;
 transaction<T>(fn:()=>T):T{if(this.transactionDepth)return fn();this.db.exec('BEGIN IMMEDIATE');this.transactionDepth++;try{const value=fn();this.db.exec('COMMIT');return value;}catch(error){this.db.exec('ROLLBACK');throw error;}finally{this.transactionDepth--;}}
 constructor(path:string){if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, json TEXT NOT NULL, revision TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,expires INTEGER NOT NULL);');}
 read(id:string):{value:any;revision:string|null}{const row=this.db.prepare('SELECT json,revision FROM app_state WHERE id=?').get(id) as {json:string,revision:string}|undefined;return row?{value:JSON.parse(row.json),revision:row.revision}:{value:null,revision:null};}
 write(id:string,value:unknown,expected?:string|null){return this.transaction(()=>{const before=this.read(id);if(expected!==undefined&&expected!==before.revision)throw Object.assign(Error('Newer changes exist. Reload to merge before saving.'),{status:409});if(id==='workspace'){const error=immutableSnapshotError(before.value,value);if(error)throw Object.assign(Error(error),{status:409});}const revision=new Date(Math.max(Date.now(),before.revision?Date.parse(before.revision)+1:0)).toISOString();this.db.prepare('INSERT INTO app_state(id,json,revision) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json,revision=excluded.revision').run(id,JSON.stringify(value),revision);return revision;});}

 profile():Profile{return this.read('profile').value??blankProfile();}
 workspace(){const result=this.read('workspace');return {state:result.value??{jobs:[],referrals:[],news:[],review:'',logs:[]},updatedAt:result.revision};}
 saveProfile(profile:Profile){this.transaction(()=>{this.write('profile',profile);const current=this.workspace();this.write('workspace',{...current.state,referrals:profile.referrals.map((r,i)=>{const old=(current.state.referrals||[]).find((v:any)=>normalizeCompany(v.company)===normalizeCompany(r.company));return {...old,id:old?.id||`profile-ref-${i}`,status:old?.status||'Available',...r,contact:r.contact??old?.contact??'',notes:r.notes??old?.notes??''}}),profileGoal:profile.goal},current.updatedAt);});}
}
