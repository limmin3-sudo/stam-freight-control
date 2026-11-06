import {quantumFlightSeconds} from './travel.mjs';
export function compatibleQuantumDrives(data,profile){
 if(!profile||!Array.isArray(data?.drives))return [];
 const allowed=new Set(profile.compatibleDriveIds||[]);
 return data.drives.filter(d=>allowed.has(d.id)&&d.size>=profile.minDriveSize&&d.size<=profile.maxDriveSize&&(!d.stockOnly||d.id===profile.factoryDriveId)&&(profile.editable||d.id===profile.factoryDriveId));
}
export function rankQuantumDrives(data,profile,distanceGm=10){
 if(!Number.isFinite(distanceGm)||distanceGm<=0||distanceGm>10000)throw Error('Invalid quantum comparison distance');
 const list=compatibleQuantumDrives(data,profile).map(d=>({...d,seconds:quantumFlightSeconds(distanceGm*1e9,d)+(d.spool||0)+(d.cooldown||0)})).sort((a,b)=>a.seconds-b.seconds||a.name.localeCompare(b.name));
 let rank=0,previous=null;return list.map((d,i)=>{if(previous===null||Math.abs(d.seconds-previous)>.05){rank=i+1;previous=d.seconds;}return {...d,rank};});
}
export function resolveQuantumDrive(data,profile,preference={},legacyName=null){
 let mode=preference.driveMode||'factory';const compatible=compatibleQuantumDrives(data,profile);let selected=preference.driveId;
 if(mode==='auto'){mode='catalog';selected=compatible.find(d=>d.name.toLowerCase()===String(legacyName||'').toLowerCase())?.id;}
 if(mode==='custom')return {mode,drive:null};
 if(mode==='catalog'){const drive=compatible.find(d=>d.id===selected);if(drive)return {mode,drive};}
 return {mode:profile?.factoryDrive?'factory':'custom',drive:profile?.factoryDrive||null};
}
