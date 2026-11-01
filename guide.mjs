// Step-by-step "사용법" guide. Opens once after the first partner introduction and from the top-bar button.
const SEEN='sfc-guide-seen';
const STEPS=[
 ['🚀','STAM FREIGHT CONTROL 안내','여러 운송 계약을 한 번에 받아도 어디를 어떤 순서로 들르고, 화물을 어디에 실을지 정리해 주는 STAM 함대 관제 도구입니다.',['왼쪽 버튼 세 개(운항 설정·운송 계약 추가·미션별 화물 확인)와 <b>관제 모드</b>만 알면 됩니다.','로그인 없이 바로 쓸 수 있고, 입력한 내용은 이 브라우저에 자동 저장됩니다.','막히면 왼쪽 <b>운항 설정</b>으로 파트너 안내를 받고, 오른쪽 위 <b>파트너 변경</b>으로 다른 파트너를 고를 수 있습니다.']],
 ['🧭','1. 운항 설정','왼쪽 <b>운항 설정</b>을 누르면 파트너가 순서대로 안내합니다.',['함선 → 출발 위치 → 계약 → 상자 구성 → 브리핑 순서로 진행합니다.','함선마다 화물 그리드와 퀀텀 드라이브 성능이 자동으로 적용됩니다. 소형부터 대형까지 93종을 고를 수 있습니다.','그리드 수정·간편/상세 계산 방식·경로 다시 계산은 함선 단계의 <b>상세 설정</b>에서 바꿉니다.']],
 ['📋','2. 운송 계약 추가','왼쪽 <b>운송 계약 추가</b>에서 받은 계약을 넣습니다.',['<b>AI 앱으로 읽기(추천)</b> · "요청 문장 복사"를 눌러 ChatGPT나 Claude 앱에 스샷과 함께 보내고, 받은 글을 붙여 넣습니다.','스샷은 게임에서 <b>Ctrl+Alt+PrtSc</b>로 캡처하고 AI 앱 입력창에 <b>Ctrl+V</b>로 붙여 넣으면 파일 저장 없이 보낼 수 있습니다.','<b>스샷 올리기</b>·<b>직접 입력</b>도 됩니다. 스샷은 미션 창만 잘라서 올려야 잘 읽힙니다.','품목명 오타는 게임 공식 표기로 자동으로 고쳐지고, 확실하지 않은 값은 경고로 알려 드립니다.']],
 ['📦','3. 미션별 화물 확인','왼쪽 <b>미션별 화물 확인</b>에서 장소·수량과 실제 상자 구성을 확인합니다.',['상자 크기별 칸에 <b>개수만</b> 적으면 됩니다. 예: 16 SCU 칸에 4, 2 SCU 칸에 10.','<b>한 번만 입력하면 됩니다.</b> 합계가 맞으면 자동으로 기억하고, 품목·수량 조합이 같은 미션은 다음부터 자동으로 채웁니다. 행선지·미션 이름이 달라도 됩니다.','<b>경로만 보실 거면 상자 입력은 건너뛰어도 됩니다.</b> 적재 배치만 가정한 상자로 대략 표시됩니다.','같은 품목이라도 계약이 다르면 다른 화물로 따로 관리합니다.']],
 ['🗺','4. 경로와 적재 보기','가운데 지도·적재 3D와 오른쪽 방문 순서가 바로 계산됩니다.',['지도 위에 이동거리·예상시간·최대적재·방문 수·예상 수익이 나옵니다.','방문 순서를 누르면 지도와 적재 3D가 그 거점으로 바뀝니다. <b>경로 수정</b>으로 순서를 직접 바꿀 수도 있습니다.','적재 색은 <b>행선지</b>입니다. 그 거점에서 싣는 상자는 <b>청록</b>, 내리는 상자는 <b>주황</b>으로 반짝입니다.','적재 3D의 「라벨 숨기기」, 지도의 「지도만 크게 보기」로 더 크게 볼 수 있습니다.']],
 ['🛰','5. 관제 모드','왼쪽 아래 <b>관제 모드</b>를 누르면 운항용 화면으로 바뀝니다.',['왼쪽은 지도, 오른쪽은 적재 3D, 아래는 진행 바입니다.','진행 바 왼쪽: 지금 거점·운항 시간·<b>완료</b> 버튼(Space/Enter)·다음 거점·되돌리기. 오른쪽: 파트너 안내와 이번 거점 화물 목록.','오른쪽 위 <b>메인 화면으로 돌아가기</b>로 나옵니다. 진행 상황은 그대로 유지됩니다.']],
 ['📊','6. 기록·계정·업데이트','운항을 끝까지 완료하면 함선·계약·수익·시간이 운항 기록에 쌓입니다.',['운항 기록은 왼쪽 위 <b>계정</b> 버튼 창에서 봅니다. 누적 수익·시간당 수익·함선별 합계가 나옵니다.','<b>로그인은 선택입니다.</b> 로그인하면 계정별 수정 기록이 남고, 다른 PC에서도 미션·설정·기록을 이어서 씁니다.','새 버전이 나오면 알림이 뜹니다. 업데이트해도 미션과 진행은 그대로이고, 바뀐 내용은 상단 <b>업데이트 기록</b>에서 볼 수 있습니다.']]];

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
