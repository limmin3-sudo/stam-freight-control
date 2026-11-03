const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};

export function renderBoxProfile(profile) {
  const section = el('section', undefined, 'definition-rules box-composition');
  section.append(el('h3', '고정형 상자 조합'));
  const labels = {
    'unsupported-type':'이 유형의 고정 상자 조합은 아직 확인되지 않았습니다.',
    'definition-unresolved':'유형 ID를 확정하지 못해 저장된 조합을 적용하지 않습니다.',
    'build-unresolved':'이 계약의 게임 빌드를 확인하지 못해 저장된 조합을 적용하지 않습니다.',
    'unsupported-build':'이 게임 빌드에서는 저장된 상자 조합을 재검증해야 합니다.',
    'evidence-conflict':'계약 기록이 충돌하여 저장된 상자 조합을 적용하지 않습니다.',
    'quantity-conflict':'로그 수량 또는 목표가 검증 사례와 다릅니다. 저장된 조합을 적용하지 않습니다.',
    'fixed-type-counts-pending':'반복 수락 시 조합이 일정한 유형으로 확인했습니다. 크기별 상자 개수는 아직 미확인입니다.',
  };
  if (profile?.status !== 'matched-fixed-profile') {
    section.append(el('p', labels[profile?.status] || '상자 조합 미확인', 'detail'));
    return section;
  }
  section.append(el('p', `실게임으로 확인한 고정 조합 · ${profile.boxCount}개 · 총 ${profile.totalScu} SCU`));
  for (const row of profile.commodities) {
    const item = el('div', undefined, 'definition-order');
    item.append(el('strong', row.name), el('span', `${row.scu} SCU × ${row.count}개`), el('small', `${row.totalScu} SCU`));
    section.append(item);
  }
  section.append(el('p', `확인 근거: 사용자 실게임 확인(${profile.evidence.confirmedOn}) 및 반복 수락 경험 · 게임 빌드 ${profile.evidence.gameBuild} 일치`, 'detail'));
  section.append(el('p', '유형별 고정 조합을 불러왔습니다. 현재 상자 인벤토리를 직접 읽은 결과는 아닙니다. 픽업·배송지 연결 결과는 아래 원래 계약 명세에서 확인하실 수 있습니다.', 'detail'));
  return section;
}
