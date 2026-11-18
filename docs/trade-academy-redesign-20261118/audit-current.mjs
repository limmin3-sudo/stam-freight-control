import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
const out=new URL('./audit/',import.meta.url).pathname,b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});const findings=[];
try{const p=await b.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});await p.route(/https:\/\/(?:www.gstatic.com|[^/]*googleapis.com)\//,r=>r.abort());
for(const [name,hash] of [['planning','division?lang=ko&facility=trade&room=planning'],['control','division?lang=ko&facility=trade&room=trade-operations'],['market','division?lang=ko&facility=trade&room=market'],['education','division?lang=ko&facility=guide-center&room=education'],['information','division?lang=ko&facility=guide-center&room=freight-information']]){
 await p.goto('http://127.0.0.1:5193/#/'+hash);await p.locator('.market-room').waitFor();await p.waitForTimeout(1200);await p.screenshot({path:out+name+'.png'});
 findings.push({name,...await p.locator('.market-room').evaluate(e=>({visibleFields:[...e.querySelectorAll('input,select')].filter(n=>n.checkVisibility()).map(n=>({label:n.getAttribute('aria-label')||n.closest('label')?.textContent?.slice(0,70),type:n.tagName,options:n.tagName==='SELECT'?n.options.length:undefined})),tabs:[...e.querySelectorAll('nav button')].map(n=>n.textContent),visibleSummaries:[...e.querySelectorAll('summary')].filter(n=>n.checkVisibility()).map(n=>n.textContent),scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}))});
 if(name==='control'){findings.push({name:'control-before-location',rows:await p.locator('.control-price-scroll tbody tr').count()});await p.getByLabel('가격 조회 위치',{exact:true}).selectOption('25');findings.push({name:'control-after-location',rows:await p.locator('.control-price-scroll tbody tr').count()});}
}
await writeFile(out+'current-ui.json',JSON.stringify({at:new Date().toISOString(),baseline:'1fdce17',findings},null,2));console.log(findings.map(x=>({name:x.name,visibleFields:x.visibleFields?.length,rows:x.rows})));
}finally{await b.close();}
