import {randomBytes} from 'node:crypto';
import {existsSync,mkdirSync,writeFileSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';
if(Number(process.versions.node.split('.')[0])<24)throw new Error('Offerdesk requires Node.js 24 or later.');
const root=process.cwd();const file=resolve(root,'.env');
mkdirSync(resolve(root,'data'),{recursive:true,mode:0o700});
if(existsSync(file)){console.log('Existing .env preserved. Configure integrations privately, then run npm run dev.');process.exit(0);}
const token=()=>randomBytes(32).toString('base64url');
const config=`# Private runtime configuration. Do not commit or send this file to an assistant.\nHOST=127.0.0.1\nPORT=3000\nAPP_URL=http://localhost:3000\nAPP_PASSWORD=${token()}\nSESSION_SECRET=${token()}\nENCRYPTION_KEY=${randomBytes(32).toString('base64')}\nADMIN_API_TOKEN=${token()}\nSCHEDULER_TOKEN=${token()}\nDATA_DIR=./data\nSCHEDULE_ENABLED=false\nOPENAI_API_KEY=\nOPENAI_MODEL=gpt-4.1\nANTHROPIC_API_KEY=\nANTHROPIC_MODEL=\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\nBRAVE_SEARCH_API_KEY=\nBRAVE_COUNTRY=\n`;
writeFileSync(file,config,{mode:0o600,flag:'wx'});chmodSync(file,0o600);
console.log('Private .env and data directory created. Read APP_PASSWORD locally to sign in; its value is not printed here. Add only your own integration credentials. Run npm run dev, then complete onboarding.');
