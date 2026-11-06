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
export function surfaceSeconds(opt){return atmosphericLeg(opt,'descent').seconds;}
export function spaceApproachSeconds(opt){return opt.performance?.maxSpeed>0?(opt.spaceDistanceKm??20)*1000/(opt.performance.maxSpeed*.65):0;}
// Atmospheric figures are planning assumptions. Wiki zero-to-SCM is a reference,
// not net vertical acceleration under gravity, drag, cargo mass or boost.
export function acceleratedClimbSeconds(meters,speed,acceleration){
 if(!(meters>0&&speed>0))return 0;if(!(acceleration>0))return meters/speed;
 const rampDistance=speed*speed/(2*acceleration);return meters<=rampDistance?Math.sqrt(2*meters/acceleration):speed/acceleration+(meters-rampDistance)/speed;
}
export function atmosphericLeg(opt,phase){
 const p=opt.performance||{},distance=Math.max(0,Number(opt.surfaceDistanceKm??30))*1000;
 if(phase==='ascent'){
  const speed=p.ascentSpeed>0?p.ascentSpeed:p.maxSpeed>0?p.maxSpeed*.65:p.approachSpeed||0,acceleration=p.ascentAcceleration>0?p.ascentAcceleration:p.scm>0&&p.zeroToScm>0?p.scm/p.zeroToScm*.25:0;
  const travelSeconds=acceleratedClimbSeconds(distance,speed,acceleration),manoeuvreSeconds=Math.max(0,opt.takeoffMinutes??1)*60;
  return {seconds:travelSeconds+manoeuvreSeconds,travelSeconds,manoeuvreSeconds,distanceKm:distance/1000,phase,estimated:true,acceleration:acceleration||null};
 }
 const speed=p.approachSpeed||0,navSpeed=p.ascentSpeed>0?p.ascentSpeed:p.maxSpeed>0?p.maxSpeed*.65:speed,scmDistance=Math.min(distance,Math.max(0,opt.scmSwitchKm??10)*1000),finalDistance=Math.min(scmDistance,Math.max(0,opt.finalApproachKm??2)*1000),finalSpeed=speed>0?Math.min(speed,p.landingSpeed>0?p.landingSpeed:50):0;
 const navSeconds=navSpeed>0?(distance-scmDistance)/navSpeed:0,scmSeconds=speed>0?(scmDistance-finalDistance)/speed:0,finalSeconds=finalSpeed>0?finalDistance/finalSpeed:0,travelSeconds=navSeconds+scmSeconds+finalSeconds,manoeuvreSeconds=Math.max(0,opt.surfaceMinutes??5)*60;
 return {seconds:travelSeconds+manoeuvreSeconds,travelSeconds,navSeconds,scmSeconds,finalSeconds,manoeuvreSeconds,scmSwitchKm:scmDistance/1000,distanceKm:distance/1000,phase:'descent',estimated:true};
}
