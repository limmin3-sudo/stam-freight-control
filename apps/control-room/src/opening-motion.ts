import {useLayoutEffect, type RefObject} from 'react';

function clampProgress(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function useOpeningMotion(root: RefObject<HTMLElement | null>, visible: boolean) {
  useLayoutEffect(() => {
    if (!visible || !root.current) return;

    const opening = root.current;
    const reveals = Array.from(opening.querySelectorAll<HTMLElement>('[data-departure-reveal]'));
    const crewRows = Array.from(opening.querySelectorAll<HTMLElement>('[data-crew-row]'));
    const crewFigures = Array.from(opening.querySelectorAll<HTMLElement>('[data-crew-figure]'));
    let currentCrew = 0;
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame: number | null = null;

    function update() {
      frame = null;
      if (motionPreference.matches) {
        opening.style.removeProperty('--hero-travel');
        opening.style.removeProperty('--page-progress');
        reveals.forEach(section => section.style.removeProperty('--reveal-progress'));
        return;
      }

      const height = window.innerHeight;
      // The last row can reach the end of its reveal even on short pages.
      const remainingScroll = document.documentElement.scrollHeight - window.scrollY - height;
      const endProgress = clampProgress(1 - remainingScroll / (height * .16));
      const revealProgress = reveals.map(section => ({
        section,
        progress: Math.max(endProgress, clampProgress(
          (height * .94 - section.getBoundingClientRect().top) / (height * .44),
        )),
      }));

      const nextCrew = crewRows.reduce((current, row, index) =>
        row.getBoundingClientRect().top <= height * .58 ? index : current, 0);
      opening.style.setProperty('--hero-travel', String(clampProgress(window.scrollY / height)));
      const totalScroll = Math.max(1, document.documentElement.scrollHeight - height);
      opening.style.setProperty('--page-progress', String(clampProgress(window.scrollY / totalScroll)));
      if (currentCrew !== nextCrew) {
        crewFigures[currentCrew]?.setAttribute('data-active', 'false');
        crewFigures[nextCrew]?.setAttribute('data-active', 'true');
        currentCrew = nextCrew;
      }
      revealProgress.forEach(({section, progress}) => {
        section.style.setProperty('--reveal-progress', progress.toFixed(4));
      });
    }

    function schedule() {
      if (frame === null) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    motionPreference.addEventListener('change', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      motionPreference.removeEventListener('change', schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [root, visible]);
}
