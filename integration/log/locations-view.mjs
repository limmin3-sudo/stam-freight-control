import {contractLocations} from './locations.mjs';

const node = (tag, text, cls) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  return el;
};

export function renderContractLocations(contract, index) {
  const result = contractLocations(contract, index);
  const section = node('section', undefined, 'location-evidence definition-rules');
  section.append(node('h3', '로그에서 찾은 픽업·배송 지점'));
  if (result.status === 'catalog-unavailable') {
    section.append(node('p', '거점 좌표 목록을 불러오지 못했습니다. 위치 대조를 보류합니다.'));
    return section;
  }
  section.append(node('p', '행성·위성 중심 기준으로 XYZ 좌표를 대조했습니다. 오차 1cm 이내에 한 지점만 일치할 때 표시합니다. 품목을 각 지점에 배정하는 정보는 별도로 확인해야 합니다.', 'detail'));
  const link = node('a', '출처: Star Citizen Wiki API 거점 좌표');
  link.href = result.metadata.source; link.target = '_blank'; link.rel = 'noopener noreferrer';
  section.append(link, node('p', `좌표 수집: ${result.metadata.retrievedAt.slice(0, 10)} · 출처가 게임 버전을 제공하지 않아 현재 빌드와의 일치는 미확인입니다.`, 'detail'));
  for (const objective of result.objectives) {
    const row = node('div', undefined, 'location-result');
    const role = {pickup: '픽업', dropoff: '배송'}[objective.role] || '역할 미확인';
    if (objective.status === 'coordinate-match') {
      const match = objective.candidates[0];
      row.append(node('strong', `${role} · ${match.name}`),
        node('p', `${match.parentName} · ${match.system} · XYZ 좌표 일치`, 'detail'));
    } else {
      row.append(node('strong', `${role} · 위치 미확인`));
      row.append(node('p', ({ambiguous: '같은 좌표에 여러 거점 또는 여러 인스턴스가 있습니다.',
        'marker-conflict': '같은 목표의 좌표·역할 또는 계약 유형이 서로 다릅니다.',
        unmatched: '일치하는 지표 거점이 없습니다. 우주 거점과 다른 좌표 기준은 아직 지원하지 않습니다.',
        invalid: '좌표 형식을 확인할 수 없습니다.'})[objective.status], 'detail'));
    }
    if (objective.quantityConflict) row.append(node('p', '같은 목표에 서로 다른 총량이 기록되어 수량을 확정하지 않습니다.', 'blocked'));
    if (objective.quantities.length) {
      const evidence = node('details');
      evidence.append(node('summary', `동일 목표 ID의 수량 알림 ${objective.quantities.length}건`));
      for (const q of objective.quantities) evidence.append(node('p', q.notification, 'evidence'));
      row.append(evidence);
    }
    section.append(row);
  }
  section.append(node('p', '가까운 장소를 대신 선택하거나 목표 번호만으로 다른 품목에 이 지점을 복사하지 않습니다. 거점 좌표 대조만으로 상자 구성을 확정하지 않습니다.', 'detail'));
  return section;
}
