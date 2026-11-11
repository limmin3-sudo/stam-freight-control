// Bake the instrument glass at build-design time. Run with Node; no GPU or packages required.
// The edge normal bends through the bevel. The reflected studio strips and the
// refracted ray on the underside are shaded separately before alpha composition.
import fs from 'node:fs';
import {deflateSync} from 'node:zlib';
const output = new URL('../src/assets/', import.meta.url);
const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b, x));
const gaussian = (x, spread) => Math.exp(-0.5 * (x / spread) ** 2);

function writePNG(name, width, height, rows) {
  const table = Array.from({length:256}, (_,i) => {
    let crc=i;
    for (let bit=0; bit<8; bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
    return crc>>>0;
  });
  function chunk(type, data) {
    const payload=Buffer.concat([Buffer.from(type),data]);
    let crc=0xffffffff;
    for (const byte of payload) crc=table[(crc^byte)&255]^(crc>>>8);
    const frame=Buffer.alloc(12+data.length);
    frame.writeUInt32BE(data.length); payload.copy(frame,4);
    frame.writeUInt32BE((crc^0xffffffff)>>>0,frame.length-4);
    return frame;
  }
  const header=Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height,4); header[8]=8; header[9]=6;
  fs.writeFileSync(new URL(name,output),Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]));
}

function bake(name, panel, amber) {
  const w=panel?824:500, h=panel?464:132;
  const perimeter=panel?[[31,12],[w-97,12],[w-66,17],[w-27,17],[w-12,32],[w-12,h-43],[w-34,h-18],[96,h-18],[67,h-22],[29,h-22],[12,h-39],[12,33]]:
    [[26,10],[w-58,10],[w-35,14],[w-13,36],[w-13,h-32],[w-31,h-17],[59,h-17],[31,h-21],[12,h-39],[12,27]];
  const planes=perimeter.map(([x,y],i)=>{
    const [nextX,nextY]=perimeter[(i+1)%perimeter.length];
    const dx=nextX-x,dy=nextY-y,len=Math.hypot(dx,dy);
    return {x,y,dx,dy,len};
  });
  // Signed Euclidean distance also handles the shallow shoulder on the lower edge.
  function distance(x,y) {
    let closest=Infinity,inside=false,nx=0,ny=0;
    for(const p of planes) {
      const t=clamp(((x-p.x)*p.dx+(y-p.y)*p.dy)/(p.len*p.len));
      const vx=x-p.x-p.dx*t,vy=y-p.y-p.dy*t,sq=vx*vx+vy*vy;
      if(sq<closest){closest=sq;nx=vx;ny=vy;}
      if((p.y>y)!==(p.y+p.dy>y) && x<p.x+(y-p.y)*p.dx/p.dy)inside=!inside;
    }
    const len=Math.sqrt(closest),sign=inside?1:-1;
    return [len*sign,-nx*sign/(len||1),-ny*sign/(len||1)];
  }
  const raw=Buffer.alloc((1+w*4)*h), edge=amber?[1,.52,.12]:[.35,.83,1];
  const face=amber?[.48,.21,.052]:[.052,.17,.225];
  const bevel=panel?11:14, thickness=panel?7:9;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const [d,nx,ny]=distance(x+.5,y+.5);
    const [rear]=distance(x-1.7,y-thickness);
    const u=x/w,v=y/h, coverage=clamp(d+1),backCoverage=clamp(rear+1);
    const rgb=[0,0,0];let alpha=0;
    function layer(color,a) {
      a=clamp(a);
      for(let i=0;i<3;i++)rgb[i]=rgb[i]*(1-a)+color[i]*a;
      alpha=alpha*(1-a)+a;
    }
    const shadow=gaussian(Math.min(0,rear+1),5)*.4;
    layer([.003,.018,.029],shadow);
    const sideLight=.19+.61*gaussian(rear-1,1.55)+.17*gaussian(rear-5,2.1);
    layer(edge.map(c=>c*sideLight),backCoverage*(d<1?.94:.12));
    if(coverage>0) {
      const slope=clamp(1-d/bevel);
      const angle=slope*Math.PI*.495;
      const rx=nx*Math.sin(2*angle), ry=ny*Math.sin(2*angle);
      const rz=Math.cos(2*angle);
      const fresnel=.035+.9*(1-Math.cos(angle))**3;
      const key=gaussian(ry+.68-rx*.34,.15)*gaussian(rz-.42,.58);
      const strip=gaussian(rx+.73,.15)*gaussian(ry-.24,.6);
      const rim=gaussian(d-1.25,.88)*(.36+.45*(1-u)+.32*Math.max(0,ny));
      const lamp=.22+.75*gaussian(u-.135,.12)+.85*gaussian(u-.88,.08)+.38*gaussian(v-.82,.13)*Math.abs(nx);
      const gleam=clamp(((key*.9+strip*.8)*(.32+.68*fresnel)+rim)*lamp
        +gaussian(d-2,.52)*gaussian(u-.84,.065)*.72
        +gaussian(d-3,.9)*gaussian(v-.73,.10)*Math.abs(nx)*.75);
      const reflection=gaussian(v-.17-u*.23,.105)*(.4+.6*gaussian(u-.17,.3));
      const lower=v-(.98-.29*(u-.68)**2);
      const caustic=gaussian(lower,.025)*(.16+.68*gaussian(u-.76,.15));
      const second=gaussian(v-(.55+.32*Math.sin(u*2.7)),.034)*gaussian(u-.08,.23);
      layer(face,coverage*(panel?.40:.68));
      const shoulderLight=gaussian(u-.035-v*.065,.065)*(.18+.2*(1-v));
      layer(edge,coverage*clamp(reflection*(panel?.11:.23)+caustic+second*.23+slope*.21+shoulderLight));
      const glint=gaussian(d-1.8,1.5)*gaussian(u-.79,.048);
      layer(amber?[1,.68,.20]:[.69,.95,1],coverage*glint*.6);
      layer(amber?[1,.85,.54]:[.87,.985,1],coverage*gleam);
    }
    const i=y*(1+w*4)+1+x*4;
    for(let c=0;c<3;c++)raw[i+c]=Math.round(255*clamp(rgb[c]/(alpha||1)));
    raw[i+3]=Math.round(255*alpha);
  }
  writePNG(name,w,h,raw);
}
bake('ops-glass-panel.png',true,false);
bake('ops-glass-key.png',false,false);
bake('ops-glass-key-amber.png',false,true);
