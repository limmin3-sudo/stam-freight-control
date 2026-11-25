import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompanionState} from '../integration/log/companion-state.mjs';
test('display lease rejects late sessions and sequence; timeout clears private display and commands',()=>{
 let now=0;const s=createCompanionState({clock:()=>now}),session='abcdefgh12345678',display={mode:'fleet',title:'My operation',lines:['8 SCU']};
 s.publish({session,sequence:1,display});assert.throws(()=>s.publish({session,sequence:1,display}),/stale-display/);
 assert.throws(()=>s.publish({session:'other_session_123',sequence:1,display}),/display-in-use/);
 assert.equal(s.enqueue('show-prices'),true);assert.equal(s.poll({session,after:0}).commands.length,1);assert.equal(s.poll({session,after:1}).commands.length,0);
 assert.throws(()=>s.enqueue('confirm-trade'),/unsupported-command/);assert.throws(()=>s.enqueue('send-game-key'),/unsupported-command/);
 now=11000;assert.equal(s.snapshot(),null);assert.equal(s.enqueue('open-trade'),false);assert.throws(()=>s.poll({session,after:0}),/display-session/);
 s.publish({session:'other_session_123',sequence:0,display});assert.equal(s.snapshot().title,'My operation');
});
test('display payload is a bounded whitelist; clearing drops all prior-account state',()=>{
 const s=createCompanionState(),session='abcdefgh12345678',display={mode:'personal',title:'Trade',lines:['Next task'],token:'should-not-survive',ledger:{}};
 s.publish({session,sequence:0,display});assert.deepEqual(Object.keys(s.snapshot()).sort(),['at','lines','mode','title']);
 assert.throws(()=>s.publish({session,sequence:1,display:{...display,lines:Array(7).fill('a')}}),/invalid-display/);
 s.publish({session,sequence:2,clear:true});assert.equal(s.snapshot(),null);
});

test('paired HTTP display preserves protocol 1, blocks foreign writes and only exposes queued view commands',async()=>{
 const {mkdtemp,writeFile,readFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const {startLogService,PUBLIC_SITE_ORIGIN}=await import('../integration/log/live-server.mjs');
 const dir=await mkdtemp(join(tmpdir(),'stam-display-')),file=join(dir,'Game.log');await writeFile(file,'synthetic log\n');
 const service=await startLogService({file,apiOnly:true}),session='abcdefgh12345678';
 try{
  const pairing=await fetch(service.origin+'/api/pair',{headers:{Origin:PUBLIC_SITE_ORIGIN,'X-STAM-Client':'flight-deck'}}),{token}=await pairing.json();
  const headers={Origin:PUBLIC_SITE_ORIGIN,Authorization:'Bearer '+token,'Content-Type':'application/json'},send=(value,h=headers)=>fetch(service.origin+'/api/display',{method:'POST',headers:h,body:JSON.stringify(value)});
  const status=await(await fetch(service.origin+'/api/status',{headers})).json();assert.equal(status.protocol,1);assert.equal(status.capabilities.display,2);
  const body={session,sequence:1,display:{mode:'flight',title:'Freight control',lines:['8 SCU']}};
  assert.equal((await send(body,{...headers,Origin:'https://foreign.example'})).status,403);
  assert.equal((await send(body,{Origin:PUBLIC_SITE_ORIGIN,'Content-Type':'application/json'})).status,401);
  const preflight=await fetch(service.origin+'/api/display',{method:'OPTIONS',headers:{Origin:PUBLIC_SITE_ORIGIN,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});assert.equal(preflight.status,204);
  assert.equal((await send(body)).status,200);assert.equal((await send(body)).status,409);
  assert.equal((await send({...body,session:'other_session_123',sequence:2})).status,409);
  assert.equal((await send({...body,sequence:2,padding:'x'.repeat(5000)})).status,413);
  service.companion.enqueue('show-prices');assert.throws(()=>service.companion.enqueue('confirm-trade'));
  const commands=await(await fetch(service.origin+'/api/commands?session='+session+'&after=0',{headers})).json();assert.equal(commands.commands[0].command,'show-prices');
  assert.equal((await fetch(service.origin+'/api/pause',{method:'POST',headers})).status,403);
  assert.equal((await send({session,sequence:3,clear:true})).status,200);assert.equal(service.companion.snapshot(),null);
  assert.equal(await readFile(file,'utf8'),'synthetic log\n');
 }finally{await service.close();await rm(dir,{recursive:true,force:true});}
});

test('native completion is bound to a single live flight step and cannot cross into trade',()=>{
 let now=0;
 const s=createCompanionState({clock:()=>now}),session='flight_session_1234';
 const stepId='58f8e479-073c-44e8-a820-329d77d1239c',other='1065ae85-556f-4e0d-abb7-8daa1d1e31db';
 const display={mode:'flight',title:'Flight',lines:[],step:'pickup',stepId};
 const cmd='complete-flight:'+stepId;
 s.publish({session,sequence:0,display});
 assert.equal(s.snapshot().stepId,stepId);
 assert.equal(s.enqueue('complete-flight:'+other),false);
 assert.equal(s.enqueue(cmd),true);
 assert.equal(s.enqueue(cmd),false);
 assert.equal(s.poll({session,after:0}).commands.length,1);
 s.publish({session,sequence:1,display:{...display,stepId:other,step:'delivery'}});
 assert.equal(s.enqueue(cmd),false);
 now=11000;
 assert.equal(s.enqueue('complete-flight:'+other),false);
 s.publish({session,sequence:2,display:{...display,mode:'personal'}});
 assert.equal(s.enqueue(cmd),false);
});

test('read-only commodity questions and bounded spoken guidance respect the current display lease',()=>{
 const session='guidance_session_42',state=createCompanionState();
 const display={mode:'personal',title:'거래',lines:[],guidance:{task:'보고',secret:'private'},answer:{id:1,text:'시세'}};
 state.publish({session,sequence:0,display});
 assert.deepEqual(state.snapshot().guidance,{task:'보고'});
 assert.deepEqual(state.snapshot().answer,{id:1,text:'시세'});
 assert.equal(state.enqueue('quote-sell:14'),true);
 assert.equal(state.enqueue('quote-sell:75:500'),true);
 assert.throws(()=>state.enqueue('quote-sell:75:-4'),/unsupported-command/);
 assert.throws(()=>state.enqueue('quote-buy:bad'),/unsupported-command/);
 assert.throws(()=>state.publish({session,sequence:1,display:{...display,answer:{id:1,text:'a'.repeat(241)}}}),/invalid-display/);
 state.publish({session,sequence:1,display:{mode:'flight',title:'운송',lines:[]}});
 assert.equal(state.enqueue('quote-buy:14'),false);
 assert.equal(state.snapshot().answer,undefined);
});

test('copilot confirmations belong to the live proposal and cannot be replayed as dictation',()=>{
 const s=createCompanionState(),session='copilot_session_123',id='43e18be1-1c9a-4187-9861-633706e2c80e';
 const display={mode:'flight',title:'항행',lines:[],copilot:true};
 s.publish({session,sequence:1,display});
 assert.equal(s.enqueue('quote-sell:75:500'),true);
 assert.equal(s.enqueue('copilot-say:오리슨 들러'),true);
 assert.equal(s.enqueue('copilot-apply:'+id),false);
 s.publish({session,sequence:2,display:{...display,proposal:id}});
 assert.equal(s.enqueue('copilot-say:적용해'),false);
 assert.equal(s.enqueue('copilot-apply:'+id),true);
 assert.equal(s.enqueue('copilot-apply:'+id),false);
 s.publish({session,sequence:3,display});
 assert.equal(s.enqueue('copilot-cancel:'+id),false);
});

test('navigation preserves separate pickup and delivery rows and unknown shares; stale completion cannot advance a new stop',()=>{
 const state=createCompanionState(),session='navigation-pair-01';
 const first='58f8e479-073c-44e8-a820-329d77d1239c',second='1065ae85-556f-4e0d-abb7-8daa1d1e31db';
 const navigation={destination:'차울라 해변',ship:'Golem OX',shipArt:'drake-golem-ox.jpg',finished:false,route:['차울라 해변','가스라이트'],extra:0,visitNumber:1,visitCount:3,
  cargo:[{item:'폐기물',action:'delivery',scu:22},{item:'수소',action:'pickup',scu:null}]};
 const display={mode:'flight',stepId:first,step:'stop',title:'운송',lines:['거점 도착'],navigation};
 state.publish({session,sequence:1,display});
 assert.deepEqual(state.snapshot().navigation,navigation);
 assert.equal(state.enqueue('complete-flight:'+first),true);
 assert.equal(state.enqueue('complete-flight:'+first),false);
 state.publish({session,sequence:2,display:{...display,stepId:second}});
 assert.equal(state.enqueue('complete-flight:'+first),false);
 assert.equal(state.enqueue('complete-flight:'+second),true);
 assert.throws(()=>state.publish({session,sequence:3,display:{...display,navigation:{...navigation,cargo:[{item:'수소',scu:-1,action:'pickup'}]}}}),/invalid-navigation/);
 state.publish({session,sequence:3,display:{mode:'fleet',title:'무역',lines:[]}});
 assert.equal(state.snapshot().navigation,undefined);
});
test('receipt amendments and affirmatives are bound to the live readback',()=>{
 const s=createCompanionState(),session='abcdefgh12345678',proposal=crypto.randomUUID();
 const display={mode:'flight',title:'Receipt',lines:[],copilot:true,proposal,proposalText:'40 SCU',receiptReadback:true};
 s.publish({session,sequence:0,display});
 assert.equal(s.enqueue('receipt-amend:'+proposal+':아니 14야'),true);
 assert.equal(s.enqueue('receipt-amend:'+crypto.randomUUID()+':아니 14야'),false);
 assert.equal(s.enqueue('copilot-say:맞아'),false);
 assert.equal(s.enqueue('copilot-say:아니 14야'),false);
 s.publish({session,sequence:1,display:{...display,receiptReadback:false}});
 assert.equal(s.enqueue('receipt-amend:'+proposal+':아니 14야'),false);
 assert.equal(s.enqueue('copilot-say:yes'),true);
});

test('acoustic hints follow the paired receipt view and omit malformed entries',()=>{
 const state=createCompanionState(),session='abcdefgh12345678',receiptView='035ec337-5866-4ee7-b11e-50890062ec81';
 const display={mode:'personal',title:'',lines:[],receiptHints:['2|루인|티타늄','2|루인|수소','2|루인','2|루인|티타늄:14'],receiptView};
 state.publish({session,sequence:1,display});assert.equal(state.snapshot().receiptHints,undefined);
 state.publish({session,sequence:2,display:{...display,copilot:true}});assert.deepEqual(state.snapshot().receiptHints,['2|루인|티타늄','2|루인|수소']);
 state.publish({session,sequence:3,display:{...display,copilot:true,receiptView:undefined}});assert.equal(state.snapshot().receiptHints,undefined);
});

test('numeric readbacks belong to one pending question or an explicitly addressed view',()=>{
 const state=createCompanionState(),session='abcdefgh12345678',view='6c3e9ccd-6d04-4158-9423-8c2bb7b4b4cd',q=crypto.randomUUID();
 const display={mode:'personal',title:'',lines:[],copilot:true,receiptView:view,receiptReview:true,receiptFollowup:true,quantityPrompt:q};
 state.publish({session,sequence:1,display});
 assert.equal(state.enqueue('receipt-review:'+view+':14'),false);
 assert.equal(state.enqueue('receipt-review:'+q+':14'),true);
 assert.equal(state.enqueue('receipt-review:'+q+':14'),false);
 state.publish({session,sequence:2,display:{...display,receiptFollowup:false}});
 assert.equal(state.enqueue('receipt-review:'+q+':14'),false);
 assert.equal(state.enqueue('receipt-review:'+view+':2번 계약 루인행 티타늄 수량 14로 바꿔'),true);
});

test('a spoken stop choice is bound to its menu and accepted once',()=>{
 const state=createCompanionState(),session='abcdefgh12345678',view=crypto.randomUUID(),id=crypto.randomUUID();
 const display={mode:'flight',title:'',lines:[],copilot:true,receiptView:view,receiptFollowup:true,placePrompt:{id,names:['루인','차울라']}};
 state.publish({session,sequence:1,display});
 assert.equal(state.enqueue('receipt-place:'+id+':heard:3'),false);
 assert.equal(state.enqueue('receipt-place:'+id+':review:1'),true);
 assert.equal(state.enqueue('receipt-place:'+id+':heard:2'),false);
 state.publish({session,sequence:2,display:{...display,placePrompt:{id:crypto.randomUUID(),names:['세이크','가스라이트']}}});
 assert.equal(state.enqueue('receipt-place:'+id+':heard:1'),false);
});

test('trade actions use the displayed quantities, whole boxes and current stop',()=>{
 const state=createCompanionState(),session='trade_session_123456',id='db36b60e-c7e6-4a01-abdc-5a67dcaf2c23';
 const lot={label:'티타늄',qty:8,box:2},tradeAction={id,action:'sell',buy:[],sell:[lot],buyers:[]};
 const display={mode:'personal',switchable:true,title:'무역',lines:[],tradeAction};
 const enqueue=op=>state.enqueue('trade-action:'+id+':'+op);
 state.publish({session,sequence:1,display});
 assert.equal(state.enqueue('mode-flight'),true);
 for(const bad of ['sell:0:10:10:2','sell:0:3:10:2','sell:0:2:0:2','sell:0:2:10:1','sell:1:2:10:2','buy:0:2:10:2'])assert.equal(enqueue(bad),false,bad);
 assert.equal(enqueue('sell:0:2:10:2'),true);
 assert.equal(enqueue('sell:0:2:10:2'),false);
 state.publish({session,sequence:2,display:{...display,tradeAction:{...tradeAction,action:'arrive'}}});
 assert.equal(enqueue('sell:0:4:10:2'),false);
 assert.equal(enqueue('compare:0'),false);
 assert.equal(enqueue('arrive'),true);
 state.publish({session,sequence:3,display:{...display,mode:'flight'}});
 assert.equal(enqueue('sell:0:4:10:2'),false);
});

test('inbox planning, launch and add are limited to the command and options displayed on this revision',()=>{
 const state=createCompanionState(),session='receipt_session_123';
 const show=(sequence,action,options=[])=>{
  const id=crypto.randomUUID();state.publish({sequence,session,display:{mode:'flight',title:'운송',lines:[],inbox:{id,label:'5 / 4',action,options}}});return 'inbox:'+id+':';
 };
 const first=show(1,'plan');assert.equal(state.enqueue(first+'start'),false);
 assert.equal(state.enqueue(first+'plan'),true);assert.equal(state.enqueue(first+'plan'),false);
 const second=show(2,'start');assert.equal(state.enqueue(first+'plan'),false);assert.equal(state.enqueue(second+'start'),true);
 const third=show(3,'add',['A','B']);
 assert.equal(state.enqueue(third+'add:2'),false);assert.equal(state.enqueue(third+'add'),false);
 assert.equal(state.enqueue(third+'add:1'),true);assert.equal(state.enqueue(third+'add:0'),false);
});
