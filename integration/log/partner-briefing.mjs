const partners=[
 {id:'operator',name:'브리지 오퍼레이터',picture:'aide',role:'가까운 계약부터 마무리',line:'함장님, 가까운 배송부터 끝내죠. 다음 화물도 동선에 맞춰 챙겨 둘게요.'},
 {id:'navigator',name:'수석 항해사',picture:'navigator',role:'픽업을 묶어 장거리 운항',line:'함장님, 같은 항성계의 화물을 모아 출발하겠습니다. 먼 항로일수록 한 번에 싣는 편이 좋습니다.'},
 {id:'broker',name:'파이로 브로커',picture:'broker',role:'무역 파트너 · 준비 중',line:'좋은 거래는 타이밍이지. 거래망이 준비되면 내가 먼저 연락하겠어.'},
];
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
// Keep the selected partner in the shared planning session. The dialog does not
// create its own shadow preferences or change the current plan on cancellation.
export function partnerBriefing({getPartner,onSelect,canEdit=()=>true}){
 let dialog=null;
 const button=el('button',undefined,'ready-partner-open');button.type='button';button.setAttribute('aria-haspopup','dialog');
 function refresh(){const p=partners.find(p=>p.id===getPartner())||partners[0];const img=el('img');img.src=new URL(`../../assets/partners/${p.picture}.jpg`,import.meta.url);img.alt='';const text=el('span');text.append(el('strong',p.name),el('small','파트너 선택'));button.replaceChildren(img,text);button.disabled=!canEdit();}
 button.onclick=()=>{
  if(dialog||!canEdit())return;
  dialog=el('dialog',undefined,'ready-briefing');dialog.setAttribute('aria-labelledby','partner-briefing-title');
  const header=el('div',undefined,'ready-briefing-header'),titles=el('div'),title=el('h2','함장님, 누구와 함께할까요?');title.id='partner-briefing-title';titles.append(el('small','CREW / 운항 파트너','eyebrow'),title,el('p','함께할 파트너를 고르면 출항 준비를 이어갑니다.'));
  const close=el('button','닫기');close.type='button';close.onclick=()=>dialog?.close();header.append(titles,close);
  const cards=el('div',undefined,'ready-partner-cards'),note=el('p',undefined,'ready-briefing-note');note.setAttribute('role','status');
  for(const p of partners){const b=el('button',undefined,'ready-partner-card');b.type='button';b.dataset.partner=p.id;b.setAttribute('aria-pressed',String(getPartner()===p.id));const image=el('img');image.src=new URL(`../../assets/partners/${p.picture}.jpg`,import.meta.url);image.alt='';const text=el('span');text.append(el('strong',p.name),el('small',p.role),el('small',p.line));b.append(image,text);
   b.onclick=()=>{if(p.id==='broker'){note.textContent=p.line;return;}if(!canEdit()){note.textContent='항로 계산이 끝나면 파트너를 변경할 수 있습니다.';return;}try{onSelect(p.id);refresh();dialog?.close();}catch(e){note.textContent=e.message;}};cards.append(b);}
  dialog.append(header,cards,note);dialog.addEventListener('close',()=>{dialog.remove();dialog=null;button.focus();},{once:true});document.body.append(dialog);dialog.showModal();
 };
 refresh();return {button,refresh,destroy(){dialog?.remove();dialog=null;button.remove();}};
}
