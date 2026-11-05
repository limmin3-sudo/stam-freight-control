"""Render the replaceable image-based introduction. No website screenshots or official trailers."""
import json, pathlib, subprocess, tempfile, shutil

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/intro'
def run(*args):
    subprocess.run(args,check=True,cwd=ROOT)

def render():
    OUT.mkdir(parents=True,exist_ok=True)
    shots=[('departure',8),('cargo',8),('departure',6),('jump',8),('hangar',10)]
    with tempfile.TemporaryDirectory(prefix='stam-film-') as directory:
        tmp=pathlib.Path(directory);segments=[]
        for index,(name,duration) in enumerate(shots):
            output=tmp/f'{index}.mp4';segments.append(output)
            frames=duration*30
            zoom=f'1.025+0.065*on/{frames}'
            x=f'iw/2-iw/zoom/2+{12 if index%2 else -12}*on/{frames}'
            vf=f"scale=2304:1296:force_original_aspect_ratio=increase,crop=2304:1296,zoompan=z='{zoom}':x='{x}':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30,setsar=1"
            if index==2:
                vf+=",colorbalance=rs=-.08:bs=.1,eq=saturation=0.9:contrast=1.05"
            # A restrained dip between still scenes avoids false continuity or double ships.
            vf+=f',fade=t=in:st=0:d=0.45,fade=t=out:st={duration-.45}:d=0.45'
            run('ffmpeg','-y','-v','error','-threads','2','-loop','1','-framerate','30','-i',str(OUT/f'{name}.webp'),'-t',str(duration),'-vf',vf,'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-threads','2',str(output))
            print('Rendered scene',index+1,flush=True)
        concat=tmp/'segments.txt';concat.write_text(''.join(f"file '{s}'\n" for s in segments))
        picture=tmp/'picture.mp4'
        run('ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(concat),'-c','copy',str(picture))
        score=tmp/'score.wav';run('python3',str(ROOT/'scripts/intro/score.py'),str(score))
        run('ffmpeg','-y','-v','error','-i',str(picture),'-i',str(score),'-vf','subtitles=scripts/intro/captions.ass','-c:v','libx264','-preset','fast','-crf','19','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-af','alimiter=limit=0.9','-t','40','-movflags','+faststart',str(OUT/'intro.mp4'))
        run('ffmpeg','-y','-v','error','-ss','2','-i',str(picture),'-frames:v','1','-q:v','2',str(OUT/'poster.jpg'))
        run('ffmpeg','-y','-v','error','-ss','1','-i',str(picture),'-t','6','-vf','scale=1280:720','-an','-c:v','libx264','-preset','fast','-crf','23','-threads','2','-movflags','+faststart',str(OUT/'teaser.mp4'))
        print('Completed 40-second 1080p introduction',flush=True)

if __name__=='__main__':render()
