import departureFilm from './assets/first-departure/stam-first-departure.mp4';
import departurePoster from './assets/first-departure/screening-poster.webp';
import fleetFilm from './assets/freight-intro-4k.mp4';
import fleetFilmHD from './assets/freight-intro-hd.mp4';
import fleetPoster from '../../../assets/intro/poster.jpg';
import legacyPoster from './assets/cinema/fleet-introduction-legacy.jpg';

type Localized = readonly [korean: string, english: string];

export type Screening = Readonly<{
  title: Localized;
  length: Localized;
  playLabel: Localized;
  video: string;
  mobileVideo?: string;
  poster: string;
  downloadName: string;
}>;

export const firstDeparture: Screening = {
  title: ['스탐 운송사업부 첫 출항', 'STAM Freight Division First Departure'],
  length: ['1분 44초', '1 min 44 sec'],
  playLabel: ['첫 출항 영상 재생', 'Play First Departure'],
  video: departureFilm,
  poster: departurePoster,
  downloadName: 'STAM-First-Departure.mp4',
};

export const fleetIntroduction: Screening = {
  title: ['STAM 운송사업부 소개', 'STAM Freight Division introduction'],
  length: ['2분 52초', '2 min 52 sec'],
  playLabel: ['STAM 소개영상 재생', 'Play STAM introduction'],
  video: fleetFilm,
  mobileVideo: fleetFilmHD,
  poster: fleetPoster,
  downloadName: 'STAM-Freight-Division-4K.mp4',
};

export const legacyFleetIntroduction: Screening = {
  title: ['STAM 함대 소개영상 (구버전)', 'STAM Fleet Introduction (Original)'],
  length: ['52초', '52 seconds'],
  playLabel: ['구버전 함대 소개영상 재생', 'Play original fleet introduction'],
  // Pin the original public MP4 without adding it to the Pages bundle a second time.
  video: 'https://raw.githubusercontent.com/limmin3-sudo/stam-freight-control/8ec667355093afb4f353770a2054ca88ab0ed213/assets/intro/intro.mp4',
  poster: legacyPoster,
  downloadName: 'STAM-Fleet-Introduction-Original.mp4',
};
