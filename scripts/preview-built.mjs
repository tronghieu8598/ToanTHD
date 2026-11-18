// Internal QA runner; accepts the preview daemon's host/port arguments.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);
const args=process.argv.slice(2),read=(name,fallback)=>{const i=args.indexOf(name);return i>=0?args[i+1]:fallback;};
const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--env-file',path.join(root,'.dev.vars'),'--local','--persist-to','.wrangler/state','--ip',read('--host','127.0.0.1'),'--port',read('--port','8787'),'--inspector-port','0'],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'}});
if(result.error)throw result.error;process.exit(result.status??1);
