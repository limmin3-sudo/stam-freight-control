"""Bake the Korean STAM dialogue recordings on an authenticated runner."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPRedirectHandler

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None

api = build_opener(NoRedirect())
voices = {
    "guide": "8UOAblmq3FdiH8DnPhBZ",
    "operator": "XH0FaarCb1WYW3Hvt5lv",
    "professor": "xlipU42cvjuzjgNJqjPq",
}
root = Path(__file__).resolve().parents[2] / "apps/control-room"
folder = root / "src/assets/voiceover-ko"
folder.mkdir(exist_ok=True)
key = os.getenv("ELEVENLABS_API_KEY")
if not key:
    sys.exit("Repository secret ELEVENLABS_API_KEY is unavailable to this job.")
for line in json.loads((root / "src/voiceover-ko.json").read_text()):
    speaker, text = line["speaker"], line["text"]
    line_id = hashlib.sha256((speaker + "\n" + text).encode()).hexdigest()[:16]
    if line_id != line["id"]:
        sys.exit("Dialogue catalogue ID mismatch.")
    output = folder / (line_id + ".mp3")
    if output.is_file():
        continue
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
        sys.exit(f"ElevenLabs HTTP {error.code} ({code}) on {speaker}/{line_id}.")
    if len(audio) < 1000 or not (audio.startswith(b'ID3') or audio[0] == 255 and audio[1] & 224 == 224):
        sys.exit("Invalid MP3 response.")
    output.write_bytes(audio)
    print(f"Recorded {speaker}/{line_id}", flush=True)
