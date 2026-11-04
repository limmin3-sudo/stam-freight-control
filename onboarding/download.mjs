import {en,t,mountPageLanguage} from './language.mjs';
// Only a release recorded after its package checks can become a direct download.
try{
 const r=await fetch('./data/desktop-release.json',{cache:'no-store'});if(!r.ok)throw Error();const release=await r.json();
 if(release.status==='published'&&/^https:\/\/github\.com\/limmin3-sudo\/stam-freight-control\/releases\/download\/[\w.-]+\/STAM-[\w.-]+-win-x64\.zip$/.test(release.url)&&/^[a-f0-9]{64}$/.test(release.sha256)){
  const a=document.getElementById('app-download');a.href=release.url;a.textContent=t('Windows 앱 다운로드','Download for Windows');
  document.getElementById('download-status').textContent=`${release.version} · ZIP ${Math.round(release.bytes/1024/1024)} MB · SHA-256 ${release.sha256}`;
 }
}catch{/* The explicit release page remains available; never fabricate a package. */}

if(en){
 document.title='Download · STAM';
 const texts={'.masthead-section':'Windows companion','.guide-header nav a:first-child':'Flight briefing','.guide-header nav a:last-child':'Return to control','.eyebrow':'LOCAL BRIDGE / FLIGHT CONTROL','h1':'Your contracts. Your flight plan.','main>p:not(.eyebrow)':'The Windows companion connects your game log. Your browser hosts the starmap and cargo 3D view.','.build-badge':'Development build · awaiting live-game validation'};
 for(const [selector,value]of Object.entries(texts))document.querySelector(selector).textContent=value;
 const cards=document.querySelectorAll('.download-card');
 cards[0].querySelector('p').textContent='Windows 10/11 · x64 · No additional runtime installation';
 if(!document.getElementById('app-download').textContent.includes('Download'))document.getElementById('app-download').textContent='View release files';
 if(!document.getElementById('download-status').textContent.includes('SHA-256 '))document.getElementById('download-status').textContent='Check the ZIP, SHA-256 checksum and validation results on the release page.';
 cards[0].querySelectorAll('p')[2].textContent='Extract the entire ZIP to a new folder and launch STAM.exe. This build does not support Windows ARM. The launcher is unsigned, so Windows may show a warning. Check the release source; do not disable security protections.';
 cards[0].querySelector('a:last-child').textContent='Launch the app, step by step →';
 cards[1].querySelector('h2').textContent='Your flight deck';
 const features=['Read-only Game.log connection: receive contracts, objective updates and mission endings.','Plan routes and cargo from confirmed details, reserve space by destination and enter exact container counts.','Partner-specific routing, new contracts during a run and preservation of cargo aboard.','Route display, estimated movement and control room mode.','Account flight-state recovery, completed contracts, payouts and guidance resume for matching plans.'];
 cards[1].querySelectorAll('li').forEach((li,i)=>li.textContent=features[i]);
 cards[1].querySelector('p').textContent='Unknown container counts use destination space guides. Fill gaps on the affected contract only.';
 cards[2].querySelector('h2').textContent='Updates and saved flight settings';
 cards[2].querySelectorAll('p')[0].textContent='Website, route and cargo updates apply on the next app launch. There is no need to download the companion each time. When a companion update is required, close the launcher and extract the new ZIP to a separate folder. The same PC, browser and default address retain your saved settings.';
 cards[2].querySelectorAll('p')[1].textContent='Clearing browser data or changing profiles or ports changes the storage location. Use Backup & restore to save your account’s settings and flight records. After restoring in another browser, read the game contracts from the log again.';
 cards[2].querySelector('a').textContent='Reconnect and resume →';
 const legal=document.querySelector('.legal'),link=legal.querySelector('a');legal.firstChild.textContent='Unofficial, non-commercial fan tool. Not affiliated with CIG. Star Citizen and associated trademarks belong to their respective owners. ';link.textContent='Data sources & licences';
}
mountPageLanguage(document.querySelector('.guide-header nav'));
