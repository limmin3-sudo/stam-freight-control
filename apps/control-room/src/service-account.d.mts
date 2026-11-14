export const HISTORY_KEY: string;
export function readHistory(): Array<{
  id: string; at: number; ship?: string; route?: string; scu: number;
  missions?: Array<{id: string; title?: string}>;
}>;
export function serviceControls(): {accountButton: HTMLButtonElement; openHistory(): void; mountAccount(host:HTMLElement):()=>void; mountHistory(host:HTMLElement):()=>void};
