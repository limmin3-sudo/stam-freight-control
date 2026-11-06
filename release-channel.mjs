const CHANNEL_ORDER={alpha:0,beta:1,stable:2};
export const releaseChannel=record=>record.channel||'alpha';
export const releaseKey=record=>`${releaseChannel(record)}:${record.version}`;
export function releaseLabel(record,en=false){
 const names=en?{alpha:'Alpha',beta:'Beta',stable:'Release'}:{alpha:'알파',beta:'베타',stable:'정식'};
 return `${names[releaseChannel(record)]} ${record.version}`;
}
export function compareReleases(a,b){
 const stage=CHANNEL_ORDER[releaseChannel(a)]-CHANNEL_ORDER[releaseChannel(b)];if(stage)return stage;
 const av=a.version.split('.').map(Number),bv=b.version.split('.').map(Number);
 for(let i=0;i<3;i++)if(av[i]!==bv[i])return av[i]-bv[i];return 0;
}
export function requestedRelease(records,version,channel){
 if(!version)return records[0];
 // Unqualified URLs predate the beta reset; preserve alpha deep links.
 return records.find(r=>r.version===version&&releaseChannel(r)===(channel||'alpha'))||records[0];
}
