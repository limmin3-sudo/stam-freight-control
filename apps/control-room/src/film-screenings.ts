import departureFilm from './assets/first-departure/stam-first-departure.mp4';
import departurePoster from './assets/first-departure/screening-poster.webp';
import fleetFilm from './assets/freight-intro-4k.mp4';
import fleetFilmHD from './assets/freight-intro-hd.mp4';
import fleetPoster from '../../../assets/intro/poster.jpg';

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
