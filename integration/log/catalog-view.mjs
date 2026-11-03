import {summarizeDefinitionOrders} from './catalog.mjs';

const node = (tag, text, cls) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  return el;
};

function renderOrders(summary) {
  const container = node('div');
  for (const {order, occurrences, quantity: q} of summary.groups) {
    const row = node('div', undefined, 'definition-order');
    row.append(node('strong', order.name || '품목 미확인'));
    let amount = '수량 미확인';
    if (q.status === 'single-bound' || q.status === 'equal-bounds') {
      const total = q.value * occurrences;
      amount = `${q.value} ${q.unit} × ${occurrences}개 주문`;
      if (Number.isSafeInteger(total) && occurrences > 1) amount += ` = ${total} ${q.unit}`;
    } else if (q.status === 'range') amount = `${q.min}~${q.max} ${q.unit} × ${occurrences}개 주문 · 변동 범위`;
    else if (q.status === 'review') amount = `${order.kind || '종류 미확인'} · 별도 규칙 확인 필요`;
    row.append(node('span', amount));
    const cap = order.kind === 'Resource' && [1,2,4,8,16,24,32].includes(order.maxBoxScu)
      ? `상자 상한 ${order.maxBoxScu} SCU` : '상자 규격 미확인';
    row.append(node('small', cap));
    container.append(row);
  }
  for (const options of summary.choices) {
    const group = node('details', undefined, 'definition-choice');
    group.append(node('summary', `선택형 주문 ${options.length}개 후보 · 실제 선택 미확인`));
    options.forEach((option, i) => {
      group.append(node('p', `후보 ${i + 1}`), renderOrders(option));
    });
    container.append(group);
  }
  return container;
}

export function renderDefinitionRules(reference) {
  const section = node('section', undefined, 'definition-rules');
  section.append(node('h3', '유형 ID로 찾은 화물 규칙'));
  section.append(node('p', '공개 목록의 정의값입니다. 이번 계약의 실제 화물 명세로 확정된 것은 아닙니다.', 'detail'));
  const link = node('a', '출처: Star Citizen Wiki API');
  link.href = reference.source; link.target = '_blank'; link.rel = 'noopener noreferrer';
  section.append(link, node('p', `공개 데이터 버전: ${reference.version} · 현재 게임과의 버전 일치는 미확인입니다.`, 'detail'));
  const rules = reference.rules;
  if (!rules?.orders.length) section.append(node('p', '이 유형의 주문 규칙은 공개 목록에서 확인되지 않았습니다.'));
  else section.append(renderOrders(summarizeDefinitionOrders(rules.orders)));
  section.append(node('p', '주문 수는 상자 개수가 아닙니다. 범위 없이 표시된 수량도 이번 계약의 확정값으로 취급하지 않습니다. 상자 상한으로 실제 크기별 개수를 계산하지 않습니다.', 'detail'));
  for (const location of rules?.locations || []) {
    const details = node('details', undefined, 'definition-location');
    details.append(node('summary', `${location.slot.replace('|Address', '')} 지점 후보 ${location.candidates.length}개 · 실제 선택 미확인`));
    details.append(node('p', location.candidates.length ? location.candidates.join(' · ') : '공개 목록에 후보가 없습니다. 다른 지점의 후보를 대신 넣지 않습니다.'));
    section.append(details);
  }
  return section;
}
