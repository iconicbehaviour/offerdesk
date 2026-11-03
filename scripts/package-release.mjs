import {readdir,readFile,mkdir,lstat,copyFile} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const allowed=['web','server','public','scripts','tests','docs','.agents','.claude','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','.gitignore','.dockerignore','.env.example','Dockerfile','compose.yaml','AGENTS.md','CLAUDE.md','README.md','LICENSE'];
const forbidden=/(?:^|\/)(?:node_modules|data|\.git|dist|\.env|releases)(?:\/|$)|\.(?:sqlite(?:-wal|-shm)?|db|pem|key)$/;
const secret=/(?:sk-proj-[A-Za-z0-9_-]{25,}|sk-ant-[A-Za-z0-9_-]{25,}|ya29\.[A-Za-z0-9_-]{25,}|art_v2_[A-Za-z0-9_-]{20,})/;
const author=new RegExp(['niran'+'jana','nj-'+'offerdesk','appgprj_[a-z0-9]+','appgdep_[a-z0-9]+','libfile_[a-z0-9]+'].join('|'),'i');
const staging=await mkdtemp(join(tmpdir(),'offerdesk-release-'));const destination=join(staging,'offerdesk-starter');await mkdir(destination);
async function copy(source,target){const info=await lstat(source);if(info.isSymbolicLink())throw Error('Symbolic links are not allowed in release.');if(info.isDirectory()){await mkdir(target,{recursive:true});for(const name of await readdir(source))await copy(join(source,name),join(target,name));return;}const rel=relative(root,source).replaceAll('\\','/');if(forbidden.test(rel)&&rel!=='.env.example')throw Error(`Private/runtime path excluded: ${rel}`);const bytes=await readFile(source);if(!/\.(?:ttf|woff2|png|jpg|jpeg|ico)$/i.test(rel)){const text=bytes.toString();if(secret.test(text)||author.test(text))throw Error(`Release privacy scan failed: ${rel}`);}await copyFile(source,target);}
try{for(const item of allowed)await copy(resolve(root,item),join(destination,item));await mkdir(resolve(root,'releases'),{recursive:true});const version=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version;const archive=resolve(root,`releases/offerdesk-v${version}.tar.gz`);const r=spawnSync('tar',['-czf',archive,'-C',staging,'offerdesk-starter'],{stdio:'inherit'});if(r.status!==0)throw Error('Archive creation failed');const hash=createHash('sha256').update(await readFile(archive)).digest('hex');await writeFile(archive+'.sha256',hash+'  '+archive.split('/').pop()+'\n');console.log(`Sanitized source release: ${archive}\nSHA256: ${hash}`);}finally{await rm(staging,{recursive:true,force:true});}
