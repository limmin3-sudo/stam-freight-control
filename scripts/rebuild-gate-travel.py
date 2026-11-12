#!/usr/bin/env python3
"""Restore lounge/gate travel before the existing approved boarding cut.

Requires curl, ffmpeg and ffprobe. Public source files are checksum verified;
the existing tracked boarding cut is never overwritten.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'apps/control-room/src/assets/travel'
DOCS = ROOT / 'docs/cinematics/gate-travel-20261112'
SOURCES = {
    'approach': ('d6e3405e-c32a-4036-9927-78d599afdcc9', '9157ec1f89bb7d3bb4a067d7e64c7f43000af1c2f1975a572b240273a1fe1335'),
    'landing': ('5db0bbea-2b9b-4903-9732-44848db9414a', '5105485cb788b719cffdf6113fbc745c6bcc9d86fdc6367f7d07694489b51b2e'),
}
BOARDING_SHA = '83fca6a81da6ff121262f7f65c6ce3cd64e60cb6686cad65468887a7cdea7904'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(command, **kwargs):
    return subprocess.run(command, check=True, **kwargs)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--approach', type=Path, help='Existing approved public gate approach original')
parser.add_argument('--landing', type=Path, help='Existing approved public shuttle landing original')
parser.add_argument('--output', type=Path, default=ASSETS / 'lounge-to-shuttle-boarding.mp4')
args = parser.parse_args()
boarding = ASSETS / 'shuttle-boarding.mp4'
if digest(boarding) != BOARDING_SHA:
    raise SystemExit('Boarding differs from baseline 397f19a; review before rebuilding.')

with tempfile.TemporaryDirectory(prefix='stam-gate-') as temporary:
    inputs = {}
    for name, (post, expected) in SOURCES.items():
        path = getattr(args, name) or Path(temporary) / f'{name}.mp4'
        if getattr(args, name) is None:
            url = f'https://assets.grok.com/users/497bec19-3602-4a03-8b34-07cbb6750658/generated/{post}/generated_video.mp4?cache=1'
            run(['curl', '-fL', '--max-time', '120', url, '-o', str(path)])
        if digest(path) != expected:
            raise SystemExit(f'{name} checksum differs; no output written.')
        inputs[name] = path

    # Match approach frame 114 to the landing shot's first frame. Retain the
    # earlier reviewed final-second speed ramp; do not retime spoken audio.
    approach_filter = "trim=end_frame=115,setpts='if(lt(T,3.75),T,3.75+log(1+0.35*(T-3.75))/0.35)/TB',scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=24"
    result = run(['ffmpeg', '-v', 'error', '-i', str(inputs['approach']), '-vf', approach_filter,
                  '-an', '-f', 'null', '-', '-progress', 'pipe:1'], capture_output=True, text=True)
    approach_frames = [int(line.split('=')[1]) for line in result.stdout.splitlines() if line.startswith('frame=')][-1]
    frames = [approach_frames, 240, 221]
    durations = [value / 24 for value in frames]
    filters = [
        f'[0:v:0]{approach_filter},setpts=N/(24*TB)[v0]',
        '[1:v:0]trim=start_frame=1:end_frame=241,setpts=N/(24*TB),setsar=1[v1]',
        '[2:v:0]trim=end_frame=221,setpts=N/(24*TB),setsar=1[v2]',
        '[v0][v1][v2]concat=n=3:v=1:a=0[v]',
    ]
    for index, (start, duration) in enumerate(zip([0, 1 / 24, 0], durations)):
        audio = (f'[{index}:a:0]atrim=start={start},asetpts=PTS-STARTPTS,'
                 f'aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration={duration}')
        if index:
            audio += ',afade=t=in:d=0.06'
        if index < 2:
            audio += f',afade=t=out:st={duration - .06}:d=0.06'
        filters.append(f'{audio}[a{index}]')
    filters.append('[a0][a1][a2]concat=n=3:v=0:a=1[a]')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    run(['ffmpeg', '-hide_banner', '-v', 'error', '-y',
         '-i', str(inputs['approach']), '-i', str(inputs['landing']), '-i', str(boarding),
         '-filter_complex', ';'.join(filters), '-map', '[v]', '-map', '[a]',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '24',
         '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart',
         '-t', str(sum(durations)), str(args.output)])
    record = {
        'baseline': '397f19aa418581bbb48be635c676604cd77461c5',
        'sources': {name: {'post': f'https://grok.com/imagine/post/{post}', 'sha256': sha} for name, (post, sha) in SOURCES.items()},
        'boardingSha256': BOARDING_SHA,
        'asset': 'apps/control-room/src/assets/travel/lounge-to-shuttle-boarding.mp4',
        'sha256': digest(args.output), 'bytes': args.output.stat().st_size,
        'frames': frames, 'fps': 24, 'durationSeconds': sum(durations),
        'segmentStartSeconds': [0, durations[0], sum(durations[:2])],
        'approachEdit': 'Use frames 0..114; final-second 1.0x to 1.35x ramp. Preserve spoken audio speed/pitch.',
        'landingEdit': 'Drop duplicate first frame; retain frames 1..240 at 1x.',
        'boardingEdit': 'All 221 frames of the existing deployed approved cut, at 1x. Original asset untouched.',
        'audio': 'Original audio, exact segment durations, 60ms boundary fades; no final sound design added.',
        'status': 'User subsequently authorized integration and deployment; see HANDOFF.md and Git history.',
    }
    DOCS.mkdir(parents=True, exist_ok=True)
    (DOCS / 'record.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(record, ensure_ascii=False, indent=2))
