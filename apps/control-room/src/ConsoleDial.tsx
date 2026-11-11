import type {CSSProperties} from 'react';

type Props = { value: number; label: string; maximum?: number };

export function ConsoleDial({value, label, maximum}: Props) {
  const fraction = maximum ? Math.min(1, Math.max(0, value / maximum)) : 0;
  return <div className="console-dial" style={{'--dial-fill': `${fraction}turn`} as CSSProperties}>
    <b>{value.toLocaleString()}</b><span>{label}</span>
  </div>;
}
