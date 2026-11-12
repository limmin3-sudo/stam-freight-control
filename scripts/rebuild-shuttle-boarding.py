#!/usr/bin/env python3
"""Reproduce the approved cut from its public source; requires curl and FFmpeg."""
import argparse
import hashlib
from pathlib import Path
import subprocess
import tempfile

URL = 'https://assets.grok.com/users/497bec19-3602-4a03-8b34-07cbb6750658/generated/bda90fef-759b-4dc3-9f06-27f14e91537c/generated_video.mp4?cache=1'
SOURCE_SHA256 = 'e972065ad8207862bdd880a269792e2d04a662166c0507a03ca3cc5374f90e9d'
ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, help='Optional existing public original; downloaded when omitted')
parser.add_argument('--output', type=Path, default=ROOT / 'apps/control-room/src/assets/travel/shuttle-boarding.mp4')
args = parser.parse_args()
with tempfile.TemporaryDirectory(prefix='stam-boarding-') as temporary:
    source = args.source or Path(temporary) / 'original.mp4'
    if args.source is None:
        subprocess.run(['curl', '-fL', '--max-time', '120', URL, '-o', str(source)], check=True)
    if hashlib.sha256(source.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise SystemExit('Source checksum differs from the reviewed original; no output was written.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # 138 original frames + 4 black frames + 79 original frames = 221 / 24.
    # The 0.25s audio overlap uses source handles across the black cut. Source
    # tail audio at 6.75s lands at output 5.916667s, exactly matching the video.
    filters = (
        '[0:v:0]split=2[front][tail];'
        '[front]trim=start_frame=0:end_frame=138,setpts=PTS-STARTPTS,fade=t=out:st=5.416666667:d=0.333333333[v0];'
        'color=c=black:s=1280x720:r=24:d=0.166666667,trim=end_frame=4,setpts=PTS-STARTPTS[black];'
        '[tail]trim=start_frame=162,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.25[v1];'
        '[v0][black][v1]concat=n=3:v=1:a=0[v];'
        '[0:a:0]asplit=2[af][at];[af]atrim=start=0:end=6,asetpts=PTS-STARTPTS[a0];'
        '[at]atrim=start=6.583333333,asetpts=PTS-STARTPTS,apad,atrim=duration=3.458333334[a1];'
        '[a0][a1]acrossfade=d=0.25:c1=tri:c2=tri[a]'
    )
    subprocess.run(['ffmpeg', '-hide_banner', '-y', '-i', str(source), '-filter_complex', filters,
                    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
                    '-pix_fmt', 'yuv420p', '-r', '24', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-movflags', '+faststart', '-t', '9.208333333', str(args.output)], check=True)
print(hashlib.sha256(args.output.read_bytes()).hexdigest(), args.output)
