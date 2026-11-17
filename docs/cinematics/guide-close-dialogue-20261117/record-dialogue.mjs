import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'/tmp/crew-recordings',size:{width:1440,height:900}}});
const p=await c.newPage();await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
await p.goto('http://127.0.0.1:5201/stam-freight-control/#/bridge?lang=ko');await p.locator('.partner-choice').waitFor();await p.locator('.partner-options [data-partner=operator]').click();await p.locator('.space-background').evaluate(e=>e.decode());await p.waitForTimeout(800);
for(const id of ['operator','navigator']){await p.locator(`.partner-hit[data-partner=${id}]`).click();await p.locator('.crew-encounter[data-ready=true]').waitFor();await p.waitForTimeout(2300);await p.getByRole('button',{name:'대화 마치기'}).click();await p.locator('.crew-encounter').waitFor({state:'detached'});await p.waitForTimeout(600)}
const video=p.video();await c.close();await video.saveAs('/tmp/crew-recordings/conversation-original.webm');await b.close();
