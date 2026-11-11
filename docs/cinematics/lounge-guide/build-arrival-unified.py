"""Merge the two approved-design panels into one wide, left-sliding glass frame."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent
current = root / 'desk-arrival-preview.html'
previous = root / 'desk-arrival-two-panels-v1.html'
if not previous.exists():
    previous.write_bytes(current.read_bytes())
page = previous.read_text(encoding='utf-8')
source = (root / 'motion-preview-v2.html').read_text(encoding='utf-8')
actions = re.search(r'<div class="actions">(.*?)\n      </div>', source, re.S).group(1)
replies = re.search(r'<div class="replies">(.*?)</div>', source, re.S).group(1)
wide_frame = '''<symbol id="wide-frame-shape" viewBox="0 0 760 520">
 <path class="rim outer" d="M27 7H730L753 31V482L729 510H24L7 491V29Z"/>
 <path class="rim inner" d="M33 17H723L742 37V477L723 499H30L18 484V35Z"/>
 <path class="rim sheen" d="M12 59V30L29 12H195M750 104V482L727 506H597"/>
 <path class="rim inner" d="M3 47V489L23 515H178M40 2H733L759 30V136"/>
 <path class="gold" d="M690 19h34M21 463l11 12m-7-25 12 13M734 479l-13 14"/>
 <path class="hot" d="M8 91V48l22-23M65 510h37M753 420v40"/>
</symbol>'''
page = page.replace('</defs></svg>', wide_frame + '</defs></svg>')
panel = '''  <section class="ui panel unified" aria-label="플라이트 가이드 통합 홀로그램">
 <svg class="frame" viewBox="0 0 760 520" preserveAspectRatio="none" aria-hidden="true"><use href="#wide-frame-shape"/></svg>
 <div class="floor-light"></div>
 <div class="panel-content unified-content">
  <header class="unified-header">
   <svg class="icon" aria-hidden="true"><use href="#headset"/></svg>
   <div><h2>플라이트 가이드</h2><small>STAM · 안내 데스크</small></div>
   <span class="unified-context">STAM / WELCOME</span>
  </header>
  <div class="header-line unified-line"></div>
  <div class="unified-body">
   <section class="unified-functions" aria-label="기능 메뉴"><h3>무엇을 도와드릴까요?</h3>
    <div class="actions">''' + actions + '''</div>
   </section>
   <section class="unified-dialogue" aria-label="가이드와 대화">
    <p class="greeting" id="greeting" aria-live="polite">STAM에 오신 것을 환영합니다.<br>첫 운송을 함께 준비해 볼까요?</p>
    <div class="dialog-divider"></div>
    <div class="replies">''' + replies + '''</div>
   </section>
  </div>
 </div>
 </section>
'''
start = page.index('  <section class="ui panel left"')
end = page.index('</main>', start)
page = page[:start] + panel + page[end:]
page = page.replace('</style>', '''
.unified{left:2%;top:28%;width:52.5%;height:61.5%;transform-origin:left center;transform:perspective(1800px) rotateY(5deg) rotateZ(.2deg)}
.stage.closed .unified{transform:translateX(-110%) perspective(1800px) rotateY(10deg) rotateZ(.2deg)}
.unified::before{background:linear-gradient(115deg,#123c49c9,#082a36d4 62%,#163f4eba);backdrop-filter:blur(4px) saturate(.85)}
.unified .unified-content{inset:5.5% 4.5% 6.4% 4.8%}
.unified-header{display:flex;align-items:center;gap:1cqw;flex:none}
.unified-header>.icon{width:2.45cqw;height:2.45cqw}
.unified-header h2{font-size:1.88cqw;line-height:1.15;margin:0 0 .35cqw;font-weight:650;letter-spacing:-.035em}
.unified-header small{font-size:.98cqw}
.unified-context{margin-left:auto;align-self:flex-start;padding-top:.28cqw;font-size:.91cqw;letter-spacing:.06em;color:#cef2f4}
.unified-line{height:1px;position:relative;margin:1.15cqw 0 1.35cqw;background:linear-gradient(90deg,#d5fbffd9,#92e6ed80);flex:none}
.unified-body{display:grid;grid-template-columns:44% minmax(0,1fr);gap:1.65cqw;flex:1;min-height:0}
.unified-functions,.unified-dialogue{min-width:0;display:flex;flex-direction:column}
.unified-functions h3{margin:0 0 1.05cqw;font-size:1.47cqw;font-weight:600;letter-spacing:-.04em;line-height:1.3;white-space:nowrap}
.unified .actions{gap:.75cqw;justify-content:flex-start;flex:none}
.unified .holo-action{font-size:1.28cqw;line-height:1.35;min-height:3.85cqw;flex:none;padding:.7cqw .9cqw;gap:.8cqw}
.unified .icon{width:1.9cqw;height:1.9cqw}
.unified-header>.icon{width:2.45cqw;height:2.45cqw}
.unified-dialogue{position:relative;padding-top:.05cqw}
.unified-dialogue::before{content:"";position:absolute;top:0;bottom:0;left:-.82cqw;width:1px;background:linear-gradient(transparent,#a4edf85c 12%,#a4edf85c 88%,transparent)}
.unified .greeting{font-size:1.48cqw;line-height:1.65;font-weight:550;min-height:0;margin:0}
.unified .dialog-divider{margin:1.15cqw 0 1.2cqw}
.unified .replies{gap:.9cqw;flex:none}
.unified .replies .holo-action{font-size:1.19cqw;line-height:1.45;min-height:4cqw;padding:.8cqw .85cqw;gap:.7cqw}
.unified .replies .icon{width:1.7cqw;height:1.7cqw}
@media(max-width:650px){
 .unified{left:1%;top:24%;width:54%;height:69%}
 .unified .unified-content{inset:5.5% 4.2% 6% 4.5%}
 .unified-header h2{font-size:1.9cqw}.unified-header small{font-size:1.05cqw}.unified-context{font-size:.94cqw}
 .unified-functions h3{font-size:1.5cqw}.unified .holo-action{font-size:1.32cqw;min-height:4cqw;padding:.6cqw .75cqw;gap:.6cqw}
 .unified .greeting{font-size:1.5cqw}.unified .replies .holo-action{font-size:1.22cqw;min-height:4.2cqw}
}
</style>''')
page = page.replace('데스크 접근 영상과 좌우 홀로그램', '데스크 접근 영상과 통합 홀로그램')
page = page.replace('</video>', '</video>\n <video class="scene idle-scene" id="idle" src="selected-idle.mp4" playsinline muted loop preload="auto" aria-label="데스크에서 대기하는 플라이트 가이드"></video>', 1)
idle_end = page.index('</video>', page.index('id="idle"')) + len('</video>')
page = page[:idle_end] + '''
 <video class="scene return-scene" id="return-video" src="selected-return.mp4" playsinline muted preload="auto" aria-label="안내데스크에서 라운지로 돌아가는 영상"></video>
 <img class="scene lounge-frame" id="lounge-frame" src="return-last-frame.png" alt="라운지로 복귀한 마지막 장면">
''' + page[idle_end:]
# Give the existing fourth action its navigation identity without changing the design.
return_button = re.search(r'<button class="holo-action" type="button">(?:(?!</button>).)*<span>라운지로 돌아가기</span></button>', page, re.S)
assert return_button is not None
page = page[:return_button.start()] + return_button.group(0).replace('<button ', '<button id="return-to-lounge" ', 1) + page[return_button.end():]
page = page.replace('</style>', '''
.idle-scene{visibility:hidden;opacity:0;transition:opacity 180ms ease-out}
.stage[data-state="arrived"][data-idle="playing"] #idle{visibility:visible;opacity:1}
.stage:is([data-state="closing-return"],[data-state="returning"]) .end-frame{visibility:visible}
.stage:is([data-state="closing-return"],[data-state="returning"]) #approach{visibility:hidden}
.stage:is([data-state="closing-return"],[data-state="returning"])[data-idle="playing"] #idle{visibility:visible;opacity:1}
.return-scene,.lounge-frame{visibility:hidden}
.return-scene{opacity:0;transition:opacity 180ms ease-out}
.stage[data-state="returning"] #return-video{visibility:visible;opacity:1}
.stage[data-state="lounge"] #lounge-frame{visibility:visible}
.stage[data-state="lounge"] #approach{visibility:hidden}
@media(prefers-reduced-motion:reduce){.idle-scene{transition-duration:1ms}}
@media(prefers-reduced-motion:reduce){.return-scene{transition-duration:1ms}}
</style>''')
current.write_text(page, encoding='utf-8')
assert page.count('class="ui panel ') == 1
assert 'ui bottom' not in page and 'ui name' not in page
print('Built one unified frame with functions and dialogue; whole panel slides from left.')
