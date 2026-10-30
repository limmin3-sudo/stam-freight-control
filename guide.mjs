// Step-by-step "사용법" guide. Opens once after the first partner introduction and from the top-bar button.
const SEEN='sfc-guide-seen';
const STEPS=[
 ['🚀','STAM FREIGHT CONTROL 사용법','여러 운송 계약을 한 번에 받아도 어디를 어떤 순서로 들르고, 화물을 어디에 실을지 정리해 주는 도구입니다. 다섯 단계면 끝납니다.',['로그인 없이 바로 쓸 수 있습니다.','입력한 계약과 설정은 이 브라우저에 자동 저장됩니다.']],
 ['🛰','1. 함선과 출발 위치','왼쪽 위 함선 목록에서 타고 갈 함선을 고르고, 출발 위치를 정합니다.',['함선마다 화물 그리드와 퀀텀 드라이브 성능이 자동으로 적용됩니다.','Hull B·Hull C는 중심축에서 바깥으로, RAFT는 위에서 아래로 쌓이는 방식까지 반영됩니다.']],
 ['📋','2. 계약 입력','받은 계약 화면을 넣는 방법은 세 가지입니다.',['<b>AI 앱으로 읽기(추천)</b> · "요청 문장 복사"를 눌러 ChatGPT나 Claude 앱에 스샷과 함께 보내고, 받은 글을 붙여 넣습니다.','스샷은 게임에서 <b>Ctrl+Alt+PrtSc</b>로 캡처하고 AI 앱 입력창에 <b>Ctrl+V</b>로 붙여 넣으면 파일 저장 없이 바로 보낼 수 있습니다.','<b>스샷 올리기</b> · 미션 창만 잘라서 올리면 브라우저가 직접 읽습니다. 넓은 화면 전체는 잘 못 읽습니다.','<b>직접 입력</b> · 품목·SCU·픽업지·배송지를 손으로 넣습니다.','품목명 오타는 게임 공식 표기로 자동으로 고쳐지고, 확실하지 않은 값은 경고로 알려 드립니다.']],
 ['📦','3. 확인과 상자 구성','읽힌 계약의 장소·수량을 확인하고, 실제 상자 크기와 개수를 넣습니다.',['예: 16x4, 2x10 (16 SCU 상자 4개, 2 SCU 상자 10개).','<b>한 번만 입력하면 됩니다.</b> 상자 합계가 SCU와 맞으면 자동으로 기억하고, 같은 유형의 미션은 다음부터 저장해 둔 상자 구성이 자동으로 채워집니다.','같은 유형 = 발주처·미션 이름이 같고, 배송지 하나에 들어가는 품목·수량이 같은 미션입니다. 픽업지·배송지 이름이 달라도 됩니다.','수량이 다르면 상자 구성도 달라질 수 있어 새로 입력합니다. 같은 품목이라도 계약이 다르면 다른 화물로 따로 관리합니다.']],
 ['🗺','4. 경로와 적재 보기','방문 순서, 지도 경로, 거점별 적재 배치가 바로 계산됩니다.',['방문 순서를 누르면 지도와 3D 화물칸이 그 거점으로 바뀝니다.','적재 화면은 드래그로 돌려 볼 수 있고, "이 거점에서 내릴 상자"만 골라 볼 수 있습니다.']],
 ['▶','5. 운항 모드','상단의 주황색 <b>▶ 운항 모드</b>를 누르면 지도가 화면 전체로 커집니다.',['왼쪽: 방문 순서와 이번 거점에서 싣고 내릴 상자.','오른쪽: 파트너 안내, 운항 시간, <b>완료</b> 버튼(Space/Enter).','되돌리기·이 거점 나중에·여기서 경로 다시 짜기도 이곳에서 합니다.']],
 ['📊','6. 기록과 계정','운항을 끝까지 완료하면 <b>📊 운항 기록</b>에 함선·계약·수익·시간이 쌓입니다.',['누적 수익과 평균 시간당 수익, 함선별 합계를 볼 수 있습니다.','<b>로그인은 선택입니다.</b> 안 해도 모든 기능을 쓸 수 있고, 데이터는 이 브라우저에 저장됩니다.','로그인하면 계정별 <b>수정 기록</b>이 남고, 미션·설정·<b>운항 기록</b>을 다른 PC에서도 이어서 봅니다.','막히면 오른쪽 아래 <b>파트너 호출</b> 버튼을 눌러 단계별 안내를 받으세요.']]];

export function createGuide(button){
 const dialog=document.createElement('dialog');dialog.className='guide-dialog';document.body.append(dialog);let i=0;
 function render(){const [icon,title,lead,items]=STEPS[i];
  dialog.innerHTML=`<div class="guide-top"><span class="guide-step">${i+1} / ${STEPS.length}</span><button type="button" data-close aria-label="닫기">×</button></div>
  <div class="guide-icon" aria-hidden="true">${icon}</div><h2>${title}</h2><p class="guide-lead">${lead}</p><ul class="guide-items">${items.map(t=>`<li>${t}</li>`).join('')}</ul>
  <div class="guide-dots">${STEPS.map((_,k)=>`<button type="button" class="${k===i?'on':''}" data-go="${k}" aria-label="${k+1}단계"></button>`).join('')}</div>
  <div class="guide-actions"><button type="button" class="quiet" data-prev ${i?'':'disabled'}>이전</button>${i<STEPS.length-1?'<button type="button" class="primary" data-next>다음</button>':'<button type="button" class="primary" data-close>시작하기</button>'}</div>`;
  dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);dialog.querySelector('[data-prev]').onclick=()=>{i=Math.max(0,i-1);render();};
  const n=dialog.querySelector('[data-next]');if(n)n.onclick=()=>{i++;render();};dialog.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{i=Number(b.dataset.go);render();});}
 function close(){dialog.close();try{localStorage.setItem(SEEN,'1');}catch{}}
 function open(){i=0;render();if(!dialog.open)dialog.showModal();}
 dialog.addEventListener('cancel',()=>{try{localStorage.setItem(SEEN,'1');}catch{}});
 if(button)button.onclick=open;
 return {open,openOnce(){let seen=false;try{seen=localStorage.getItem(SEEN)==='1';}catch{}if(!seen)open();}};
}
