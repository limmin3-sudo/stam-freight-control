"""Reuse the approved SVG/CSS hologram implementation in a separate video preview."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent
source = (root / 'motion-preview-v2.html').read_text(encoding='utf-8')
css = re.search(r'<style>(.*?)</style>', source, re.S).group(1)
(root / 'hologram-design-v2.css').write_text(css, encoding='utf-8')
symbols = source[source.index('<svg class="symbols"'):source.index('<header class="toolbar"')]
panels = source[source.index('  <section class="ui panel left"'):source.index('  <nav class="ui bottom"')]
page = '''<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>STAM · 데스크 도착과 홀로그램</title>
<link rel="stylesheet" href="hologram-design-v2.css">
<style>
body{background:#061018}
.toolbar{min-height:68px;height:auto;flex-wrap:wrap;padding:12px 16px;gap:9px}
.toolbar .status{min-width:135px;text-align:center}
.stage{width:min(100vw,calc((100dvh - 76px)*16/9));aspect-ratio:16/9;perspective:1600px}
.scene{object-fit:contain}
.end-frame{visibility:hidden}
.stage[data-state="arrived"] .end-frame{visibility:visible}
.stage[data-state="arrived"] video{visibility:hidden}
.left{left:2%;top:28%;width:26%;height:62%;transform:perspective(1400px) rotateY(7deg) rotateZ(.5deg)}
.right{left:30%;right:auto;top:22%;width:25.5%;height:68%;transform:perspective(1400px) rotateY(-7deg) rotateZ(-.5deg)}
.left .panel-content{inset:5.1% 8.2% 6.2% 9.8%}
.right .panel-content{inset:6.1% 8.4% 7.4% 8.2%}
.stage.closed .left{transform:translateX(-125%) perspective(1400px) rotateY(12deg) rotateZ(.5deg)}
.stage.closed .right{transform:translateX(295%) perspective(1400px) rotateY(-12deg) rotateZ(-.5deg)}
.ui{transition-duration:640ms;transition-timing-function:cubic-bezier(.18,.74,.22,1)}
.stage:not(.closed) .right{transition-delay:85ms}
.stage.closed .ui{transition-duration:440ms;transition-delay:0ms}
.left .eyebrow{font-size:1.08cqw}
.left h1{font-size:1.72cqw}
.left .holo-action{font-size:1.43cqw;padding:.7cqw 1.05cqw;gap:1cqw}
.guide-header{gap:.9cqw}
.guide-header h2{font-size:1.77cqw}
.guide-header small{font-size:.94cqw}
.guide-header>.icon{width:2.35cqw;height:2.35cqw}
.greeting{font-size:1.5cqw;line-height:1.6;min-height:8.4cqw}
.replies .holo-action{font-size:1.2cqw;line-height:1.5;padding:.75cqw .9cqw;gap:.75cqw}
.replies .icon{width:1.8cqw;height:1.8cqw}
.holo-action span{min-width:0;overflow-wrap:break-word}
@media(max-width:650px){
 .toolbar{min-height:100px;gap:6px}.toolbar button{font-size:11px;padding:7px 9px}.toolbar .status{font-size:11px;min-width:90px}
 .stage{width:100%;aspect-ratio:16/9}.left{left:1%;top:22%;width:27%;height:72%}.right{left:29%;top:17%;width:27%;height:77%}
 .left .eyebrow{font-size:1.15cqw}.left h1{font-size:1.8cqw;margin:.9cqw 0 1.4cqw}.left .holo-action{font-size:1.5cqw;min-height:4cqw;padding:.5cqw .7cqw;gap:.7cqw}
 .icon{width:2.1cqw;height:2.1cqw}.guide-header{gap:.8cqw}.guide-header h2{font-size:1.85cqw}.guide-header small{font-size:1.05cqw}.guide-header>.icon{width:2.4cqw;height:2.4cqw}
 .right .header-line{margin:1cqw 0 1.4cqw}.greeting{font-size:1.55cqw;min-height:8.2cqw}.dialog-divider{margin:.8cqw 0 1.3cqw}.replies .holo-action{font-size:1.22cqw;min-height:4.1cqw;padding:.6cqw .7cqw;gap:.6cqw}.replies .icon{width:1.8cqw;height:1.8cqw}
}
@media(prefers-reduced-motion:reduce){.ui,.stage.closed .ui{transition-duration:1ms!important;transition-delay:0ms!important}}
</style>
''' + symbols + '''
<header class="toolbar" aria-label="연출 미리보기 조작">
 <button id="replay" type="button">영상부터 다시 보기</button>
 <button id="arrival" type="button">도착 장면 보기</button>
 <button id="toggle" type="button" aria-controls="stage" aria-expanded="false" disabled>홀로그램 펼치기</button>
 <button id="sound" type="button" aria-pressed="false">소리 켜기</button>
 <span id="status" class="status" aria-live="polite">영상 준비 중</span>
</header>
<main class="stage closed" id="stage" data-state="ready" aria-label="데스크 접근 영상과 좌우 홀로그램">
 <img class="scene end-frame" id="end-frame" src="actual-last-frame.png" alt="선택한 영상의 실제 마지막 프레임">
 <video class="scene" id="approach" src="selected-approach.mp4" poster="actual-first-frame.png" playsinline muted preload="auto" aria-label="가이드와 안내데스크로 이동하는 영상"></video>
''' + panels + '''
</main>
<script src="desk-arrival-preview.js"></script>
</html>
'''
(root / 'desk-arrival-preview.html').write_text(page, encoding='utf-8')
assert 'ui bottom' not in page and 'id="extras"' not in page and 'ui name' not in page
print('Built independent video + two-panel preview. No bottom bar or name overlay.')
