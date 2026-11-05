// Cross-platform entrypoint; requires Python 3, numpy and ffmpeg.
import {spawn} from 'node:child_process';
const child=spawn(process.env.STAM_PYTHON||'python3',['scripts/render-intro.py'],{stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
