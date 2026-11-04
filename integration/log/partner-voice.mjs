// Dialogue for the existing hauling partners. No localization or game-patch imports.
const navigator={
 name:'수석 항해사',portrait:'navigator',
 queuedContracts:'새 계약을 대기 목록에 보관했습니다. 현재 항로는 유지하겠습니다. 함께 운송하시려면 계약 목록에서 선택해 주십시오.',
 cargoUndoHelp:'잘못 기록한 배송을 되돌립니다. 상자가 이전 적재 위치에 있는지 먼저 확인해 주십시오.',
 cargoCheck:'함장님, 실제 화물 상태를 확인하겠습니다. 실린 화물의 위치는 유지하고, 배송하신 상자만 계획에서 정리하겠습니다.',
 cargoLockHelp:'예약 영역은 공간만 유지합니다. 영역을 사용한다고 픽업을 완료한 것으로 기록하지 않습니다.',
 cargoDeliveryHelp:'배송지에 전달하신 실물 상자만 선택해 주십시오. 예약 영역의 배송은 상자 구성을 확인한 뒤 반영하겠습니다.',
 contractsReady:'수신한 계약을 바탕으로 항로와 적재 계획을 검토하겠습니다.',
 waiting:'계약 수신을 기다리고 있습니다. 들어오는 계약부터 항로와 적재 계획을 검토하겠습니다.',
 routePolicy:'함께 실을 화물을 모으고, 같은 방향의 계약을 묶어 재방문을 줄이겠습니다.',
 removalQuestion:'함장님, 이 계약의 화물이 아직 실려 있습니까?',
 chooseCargo:'함선에 남아 있는 화물을 선택해 주십시오. 표시된 적재 위치도 확인하겠습니다.',
 keepCargo:'선택하신 화물은 현재 위치에 유지하고, 나머지 계약의 항로와 적재를 다시 검토하겠습니다.',
 unknownCargo:'남은 화물의 위치를 확인하지 못했습니다. 위치가 확인될 때까지 적재 계산을 보류하겠습니다.',
 cleanup:'함장님, 이 화물은 모두 정리하셨습니까? 함선에 남아 있지 않다면 적재 공간을 비우겠습니다.',
 received:'수락하신 계약을 확인하겠습니다. 화물 정보가 들어오는 대로 계획에 반영하겠습니다.',
 observedApplied:'준비 정보에 반영했습니다. 운용 함선과 출발지를 확인해 주십시오.',
 timingPending:'시간 설정에 적용하지 않은 변경이 있습니다. 적용하거나 취소한 뒤 출항 준비를 확인해 주십시오.',
 prepared:'출항 준비가 됐습니다, 함장님. 안내할 계약을 확인해 주십시오.',
 checkSettings:'이번 운항에 사용할 함선과 출발지를 확인해 주십시오.',
 blocked:'확인이 필요한 화물이 있습니다. 아래 계약 목록을 확인해 주십시오.',
 calculating:'항로와 적재 순서를 준비하겠습니다.',
 started:'항로 안내를 시작하겠습니다. 지도에는 예상 이동이 표시됩니다.',
 reserved:'배송지별 적재 공간을 확보했습니다. 항로에 필요한 정보는 지도 위 안내를 확인해 주십시오.',
 failed:'항로를 준비하지 못했습니다. 지도 위 안내를 확인해 주십시오.',
 nextFailed:'다음 구간을 연결하지 못했습니다. 항로를 확인해 주십시오.'
};
const operator={
 name:'브리지 오퍼레이터',portrait:'aide',
 queuedContracts:'함장님, 새 계약은 받아뒀어요! 지금 항로는 그대로 안내할게요. 같이 가실 계약은 목록에서 골라 주세요.',
 cargoUndoHelp:'잘못 기록한 배송은 되돌릴 수 있어요. 상자가 전에 기록한 자리에 있는지 확인해 주세요!',
 cargoCheck:'함장님, 지금 실린 화물을 알려 주세요! 그 자리는 그대로 두고, 배송한 상자만 정리할게요.',
 cargoLockHelp:'예약 영역은 자리만 잡아둘게요. 실제로 픽업을 끝냈다는 뜻으로 쓰지는 않아요.',
 cargoDeliveryHelp:'배송지에 넘긴 실물 상자만 골라 주세요! 예약 영역은 실제 상자 구성을 알아야 배송에 반영할 수 있어요.',
 contractsReady:'계약 확인했어요, 함장님! 함께 갈 일정과 화물을 맞춰볼게요.',
 waiting:'함장님, 계약을 받아 주세요! 들어오는 대로 제가 일정과 화물을 정리할게요.',
 routePolicy:'가까운 계약부터 하나씩 끝내봐요! 가는 길에 들를 수 있는 픽업도 챙길게요.',
 removalQuestion:'함장님, 이 계약 화물은 아직 배에 남아 있나요?',
 chooseCargo:'아직 실려 있는 화물만 골라 주세요. 적재도에 나온 자리도 맞는지 확인해 주세요!',
 keepCargo:'남은 화물은 그 자리에 둘게요. 나머지 계약은 항로랑 적재를 다시 맞춰볼게요!',
 unknownCargo:'남은 화물이 어디에 있는지 아직 모르겠어요. 위치부터 확인하고 다시 배치할게요.',
 cleanup:'함장님, 이 화물은 다 정리하셨나요? 배에 없으면 그 자리는 비워둘게요!',
 received:'계약이 들어오면 제가 확인할게요! 화물 정보도 들어오는 대로 채워둘게요.',
 observedApplied:'준비 정보에 넣어뒀어요. 오늘 타실 함선과 출발지가 맞는지 봐 주세요!',
 timingPending:'함장님, 바꾼 시간 설정이 아직 적용되지 않았어요. 적용하거나 취소하면 항로를 준비할게요!',
 prepared:'준비됐어요, 함장님! 이제 함께 갈 계약을 확인해 주세요.',
 checkSettings:'함장님, 오늘 타실 함선과 출발지가 맞는지 확인해 주세요!',
 blocked:'함장님, 아직 확인할 화물이 있어요. 아래 계약 목록을 같이 봐 주세요.',
 calculating:'항로랑 적재 순서 맞춰볼게요, 함장님!',
 started:'항로 안내 시작할게요! 지도에는 예상 이동이 표시돼요.',
 reserved:'배송지별로 화물 자리 잡아뒀어요! 항로에 더 필요한 정보는 지도 위에 적어둘게요.',
 failed:'항로를 준비하지 못했어요. 지도 위 안내를 확인해 주세요.',
 nextFailed:'다음 구간을 연결하지 못했어요. 항로를 확인해 주세요.'
};
export const partnerVoice=id=>id==='operator'||id==='aide'?operator:navigator;
export function partnerSpeaker(id,text){
 const v=partnerVoice(id),root=document.createElement('div'),img=document.createElement('img'),body=document.createElement('div'),role=document.createElement('strong'),line=document.createElement('p');
 root.className='partner-dialogue';root.dataset.partner=id==='operator'||id==='aide'?'operator':'navigator';img.src=new URL(`../../assets/partners/${v.portrait}.jpg`,import.meta.url);img.alt='';img.width=48;img.height=64;role.textContent=v.name;line.textContent=text;body.append(role,line);root.append(img,body);return root;
}
