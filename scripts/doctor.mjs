import {existsSync,statSync} from 'node:fs';
const checks=[];const check=(name,ok,detail)=>checks.push({name,ok,detail});
check('Node 24+',Number(process.versions.node.split('.')[0])>=24,process.versions.node);
check('Private config exists',existsSync('.env'),'Run npm run setup if absent.');
if(existsSync('.env')){try{process.loadEnvFile()}catch{}check('Private config file permissions',process.platform==='win32'||(statSync('.env').mode&0o077)===0,'Should be owner-only on Unix.');}
for(const key of ['APP_PASSWORD','SESSION_SECRET','ENCRYPTION_KEY'])check(key,Boolean(process.env[key]),'Value intentionally hidden.');
check('Frontend built',existsSync('dist/index.html'),'Run npm run build before production startup.');
console.log(JSON.stringify({checks,connections:{openaiConfigured:Boolean(process.env.OPENAI_API_KEY),anthropicConfigured:Boolean(process.env.ANTHROPIC_API_KEY&&process.env.ANTHROPIC_MODEL),googleOAuthConfigured:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET),webSearchConfigured:Boolean(process.env.BRAVE_SEARCH_API_KEY),scheduleEnabled:process.env.SCHEDULE_ENABLED==='true'},note:'Configuration checks only. No external provider or mailbox has been contacted.'},null,2));
process.exitCode=checks.every(x=>x.ok)?0:1;
