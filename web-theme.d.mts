export type WebTheme = 'black-gold' | 'white-gold';
export function getWebTheme(): WebTheme;
export function setWebTheme(theme: WebTheme): void;
export function subscribeWebTheme(listener: () => void): () => void;
