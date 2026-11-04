import {ALLOCATION_SOURCE} from './manifest.mjs';
const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
export function renderOriginalManifest(manifest) {
  const section = el('section', undefined, 'definition-rules original-manifest');
  section.append(el('h3', '목적지별 원래 계약 상자 명세'));
  if (manifest?.status !== 'resolved-original-manifest') {
    section.append(el('p', '확인된 상자 조합과 픽업·배송 묶음이 모두 있어야 명세를 생성합니다. 현재 기록에서는 연결하지 못했습니다.', 'detail'));
    return section;
  }
  section.append(el('p', `픽업 · ${manifest.pickup.name}`));
  for (const destination of manifest.deliveries) {
    const group = el('div', undefined, 'delivery-bundle');
    group.append(el('h4', `배송 · ${destination.name} · 84 SCU / 14개`));
    for (const s of manifest.shipments.filter(s => s.dropoffId === destination.id)) {
      const row = el('div', undefined, 'definition-order');
      row.append(el('strong', s.commodity), el('span', `${s.boxes[0].size} SCU × ${s.boxes[0].count}개`), el('small', `${s.scu} SCU`));
      group.append(row);
    }
    section.append(group);
  }
  section.append(el('p', '계약 최초 요구량입니다. 현재 실린 상자나 남은 배송량이 아닙니다. 운항 중인 적재 상태는 변경하지 않습니다.', 'notice'));
  const source = el('a', '출처: Star Citizen Wiki 공개 주문 묶음');
  source.href = ALLOCATION_SOURCE; source.target = '_blank'; source.rel = 'noopener noreferrer';
  section.append(source, el('p', '두 배송 묶음의 동일한 품목·수량을 계약 원문과 대조했습니다. 사용자 상자 확인 및 해당 빌드의 공개 주문값도 대조했으며, 거점은 로그 XYZ로 연결했습니다. 위치 데이터의 게임 버전은 미확인입니다.', 'detail'));
  return section;
}
