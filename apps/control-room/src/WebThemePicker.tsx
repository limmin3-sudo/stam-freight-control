import {useSyncExternalStore} from 'react';
import {getWebTheme, setWebTheme, subscribeWebTheme} from '../../../web-theme.mjs';

export function WebThemePicker({english}: {english: boolean}) {
  const theme = useSyncExternalStore(subscribeWebTheme, getWebTheme);
  return <fieldset className="web-theme-picker">
    <legend>{english ? 'Web appearance' : '웹 테마'}</legend>
    {(['black-gold', 'white-gold'] as const).map(value => <label key={value} data-palette={value}>
      <span className="theme-swatch" aria-hidden="true"/>
      {value === 'black-gold' ? (english ? 'Black Gold' : '블랙 골드') : (english ? 'White Gold' : '화이트 골드')}
      <input type="radio" name="web-appearance" value={value} checked={theme === value} onChange={() => setWebTheme(value)}/>
    </label>)}
  </fieldset>;
}
