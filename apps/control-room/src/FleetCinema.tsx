import {useState} from 'react';
import {FilmScreen} from './FilmScreen';
import {firstDeparture, fleetIntroduction} from './film-screenings';
import './fleet-cinema.css';

const programme = [firstDeparture, fleetIntroduction];

export function FleetCinema({english}: {english: boolean}) {
  const [playingFilm, setPlayingFilm] = useState<string>();
  const lang = english ? 1 : 0;

  return <div className="cinema-library">
    {programme.map(screening => <article className="space-cinema" key={screening.video}>
      <h2>{screening.title[lang]}</h2>
      <FilmScreen screening={screening} english={english} cinema
        active={playingFilm === screening.video} onPlay={() => setPlayingFilm(screening.video)} />
      <div className="space-cinema-caption">
        <p>{screening.length[lang]}</p>
        <a href={screening.video} download={screening.downloadName}>{english ? 'Download MP4' : 'MP4 다운로드'}</a>
      </div>
    </article>)}
  </div>;
}
