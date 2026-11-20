"""Bake the Korean STAM dialogue recordings on an authenticated runner."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import subprocess
import tempfile
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPRedirectHandler

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None

api = build_opener(NoRedirect())
voices = {
    "navigator": "k3flLXtrn1B0p6HGXBRK",
    "guide": "8UOAblmq3FdiH8DnPhBZ",
    "operator": "XH0FaarCb1WYW3Hvt5lv",
    "professor": "xlipU42cvjuzjgNJqjPq",
}
repo = Path(__file__).resolve().parents[2]
key = os.getenv("ELEVENLABS_API_KEY")
if not key:
    sys.exit("Repository secret ELEVENLABS_API_KEY is unavailable to this job.")

def record(speaker, text):
    request = Request(
        "https://api.elevenlabs.io/v1/text-to-speech/" + voices[speaker] + "?output_format=mp3_44100_128",
        data=json.dumps({"text": text, "language_code": "ko", "model_id": "eleven_multilingual_v2"}).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    try:
        with api.open(request, timeout=90) as result:
            if result.headers.get_content_type() != "audio/mpeg":
                sys.exit("Unexpected content type.")
            audio = result.read()
    except HTTPError as error:
        try:
            status = json.loads(error.read()).get("detail", {}).get("status", "")
        except (ValueError, AttributeError):
            status = ""
        code = status if re.fullmatch("[a-z_]{1,64}", status) else "provider_error"
        sys.exit(f"ElevenLabs HTTP {error.code} ({code}) on {speaker}.")
    if len(audio) < 1000 or not (audio.startswith(b'ID3') or audio[0] == 255 and audio[1] & 224 == 224):
        sys.exit("Invalid MP3 response.")
    return audio

def recording_id(speaker, text):
    return hashlib.sha256((speaker + "\n" + text).encode()).hexdigest()[:16]

def record_overlay():
    folder = repo / "desktop/voices/flight-ko"
    folder.mkdir(exist_ok=True)
    script = json.loads((repo / "tools/voiceover/overlay-ko.json").read_text())
    help_lines = json.loads((repo / "data/companion-help.json").read_text())
    prompts = dict(script["cues"])
    for text in script["fixed"] + [topic["ko"]["answer"] for topic in help_lines]:
        prompts[text] = {speaker: text for speaker in ("operator", "navigator")}
    manifest = {}
    for cue, roles in prompts.items():
        manifest[cue] = {}
        for speaker, text in roles.items():
            name = recording_id(speaker, text) + ".wav"
            output = folder / name
            if not output.exists():
                audio = record(speaker, text.replace("SCU", "에스씨유"))
                with tempfile.TemporaryDirectory(dir=folder) as scratch:
                    wav = Path(scratch) / name
                    subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-ac", "1",
                                    "-ar", "24000", "-c:a", "pcm_s16le", str(wav)], input=audio, check=True)
                    wav.replace(output)
                print(f"Recorded {speaker}/{name}", flush=True)
            manifest[cue][speaker] = name
    (folder / "index.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

if sys.argv[1:] == ["--overlay"]:
    record_overlay()
elif not sys.argv[1:]:
    src = repo / "apps/control-room/src"
    folder = src / "assets/voiceover-ko"
    folder.mkdir(exist_ok=True)
    for line in json.loads((src / "voiceover-ko.json").read_text()):
        speaker, text = line["speaker"], line["text"]
        line_id = recording_id(speaker, text)
        if line_id != line["id"]:
            sys.exit("Dialogue catalogue ID mismatch.")
        output = folder / (line_id + ".mp3")
        if not output.exists():
            output.write_bytes(record(speaker, text))
            print(f"Recorded {speaker}/{line_id}", flush=True)
else:
    sys.exit("Expected --overlay or no arguments.")
