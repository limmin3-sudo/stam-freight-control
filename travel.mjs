// Two constant-acceleration stages and mirrored braking; an ETA approximation, not a flight simulator.
export function quantumFlightSeconds(meters,drive){
 if(meters<=0)return 0;const {maxSpeed:v,a1,a2,engageSpeed:engage}=drive||{};
 if(![v,a1,a2].every(n=>Number.isFinite(n)&&n>0))throw Error('퀀텀 드라이브 성능을 확인하세요.');
 const e=Math.max(0,Math.min(v,Number(engage)||0)),t1=e/a1,t2=(v-e)/a2,d1=.5*a1*t1*t1,total=t1+t2,accelDistance=d1+e*t2+.5*a2*t2*t2;
 if(meters>=accelDistance*2)return total*2+(meters-accelDistance*2)/v;
 const half=meters/2;if(half<=d1)return 2*Math.sqrt(2*half/a1);
 return 2*(t1+(-e+Math.sqrt(e*e+2*a2*(half-d1)))/a2);
}
export function quantumSeconds(meters,opt){const p=opt.performance;if(p?.drive)return quantumFlightSeconds(meters,p.drive)+(p.drive.spool||0)+(p.drive.cooldown||0);return meters/1000/(p?.quantumSpeed||opt.quantumSpeed);}
export function surfaceSeconds(opt){return opt.surfaceMinutes*60+(opt.performance?.approachSpeed>0?(opt.surfaceDistanceKm??30)*1000/opt.performance.approachSpeed:0);}
export function spaceApproachSeconds(opt){return opt.performance?.maxSpeed>0?(opt.spaceDistanceKm??20)*1000/(opt.performance.maxSpeed*.65):0;}
