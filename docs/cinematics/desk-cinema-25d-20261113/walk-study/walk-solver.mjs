export const WALK={period:1.7,stride:580,stance:.62,lift:88,steps:3,initialPhase:.31};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const p=clamp(x);return p*p*(3-2*p);};
export const toRig=([x,y])=>[x-344,1758-y];
export const legReferences=[
 {hip:toRig([270,840]),knee:toRig([235,1268]),ankle:toRig([220,1647]),toe:toRig([258,1758])},
 {hip:toRig([413,840]),knee:toRig([406,1268]),ankle:toRig([406,1628]),toe:toRig([444,1758])},
];
export function solveLeg(hip,ankle,l1,l2){
 const dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],raw=Math.hypot(dx,dy);
 const distance=clamp(raw,Math.abs(l1-l2)+.001,l1+l2-.001),ux=dx/(raw||1),uy=dy/(raw||1);
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const knee=[hip[0]+ux*along-uy*height,hip[1]+uy*along+ux*height];
 return {hip,knee,ankle:[hip[0]+ux*distance,hip[1]+uy*distance],reachError:Math.abs(raw-distance)};
}
export function footAt(time,leg,config=WALK){
 const clock=Math.max(0,time)/config.period+config.initialPhase,offset=leg*.5,cycle=Math.floor(clock+offset),phase=clock+offset-cycle;
 const swing=phase>=config.stance,u=clamp((phase-config.stance)/(1-config.stance));
 const reference=legReferences[leg],plant=reference.toe[0]+(cycle-offset+config.stance/2-config.initialPhase)*config.stride;
 const entry=smooth(time/.16);
 const toe=[plant+(swing?config.stride*smooth(u):0),swing?config.lift*Math.sin(Math.PI*u)*entry:0];
 const pitch=swing?-.12*Math.sin(Math.PI*u):0,dx=reference.toe[0]-reference.ankle[0],dy=reference.toe[1]-reference.ankle[1];
 const ankle=[toe[0]-(dx*Math.cos(pitch)-dy*Math.sin(pitch)),toe[1]-(dx*Math.sin(pitch)+dy*Math.cos(pitch))];
 return {phase,swing,toe,ankle,pitch,cycle};
}
export function walkAt(time,config=WALK){
 const t=clamp(time,0,walkDuration(config)),distance=t/config.period*config.stride;
 const bob=(-36+6*Math.cos(4*Math.PI*(t/config.period+config.initialPhase)))*smooth(t/.18),sway=.003*Math.sin(2*Math.PI*t/config.period);
 const legs=legReferences.map((reference,i)=>{
  const foot=footAt(t,i,config),hip=[reference.hip[0],reference.hip[1]+bob],ankle=[foot.ankle[0]-distance,foot.ankle[1]];
  const l1=Math.hypot(reference.knee[0]-reference.hip[0],reference.knee[1]-reference.hip[1]);
  const l2=Math.hypot(reference.ankle[0]-reference.knee[0],reference.ankle[1]-reference.knee[1]);
  const solved=solveLeg(hip,ankle,l1,l2);
  return {...solved,foot,l1,l2};
 });
 return {time:t,distance,bob,sway,legs,finished:time>=walkDuration(config)};
}

export function walkDuration(config=WALK){return config.period*(.2+(config.steps-1)/2);}
