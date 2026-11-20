import {createServer} from 'vite';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({root,configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom'});
try {
  const load = name => server.ssrLoadModule('/src/' + name + '.ts');
  const {visitChapters} = await load('guided-visit-content');
  const {guidePages} = await load('guide-journey-content');
  const {academyTutorials,professorWelcome} = await load('partner-tutorials');
  const {partnerDialogue} = await load('partner-dialogue');
  const {default:greetings} = await server.ssrLoadModule('/@fs/'+root+'../../data/partner-greetings.json');
  const lines = new Map();
  function add(speaker,text) {
    const id = createHash('sha256').update(speaker+'\n'+text).digest('hex').slice(0,16);
    lines.set(id,{id,speaker,text});
  }
  for (const chapter of visitChapters) for (const cue of chapter.lines) {
    if (['guide','operator','professor'].includes(cue.speaker)) add(cue.speaker,cue.text[0]);
  }
  for (const [topic,pages] of Object.entries(guidePages)) {
    for (const page of pages) add(['practice','trade'].includes(topic)?'professor':'guide',page.body[0]);
  }
  for (const lesson of academyTutorials(false,()=>{},true)) {
    add('guide',lesson.introduction);
    add('professor',professorWelcome(lesson.id,false));
  }
  for (const id of ['director','operator']) for (const [ko] of partnerDialogue[id].greetings) {
    add(id==='director'?'guide':id,ko);
  }
  add('professor',greetings['academic-advisor'].ko);
  await writeFile(root+'src/voiceover-ko.json',JSON.stringify([...lines.values()],null,2)+'\n');
  console.log(lines.size+' Korean lines');
} finally { await server.close(); }
