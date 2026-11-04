// Only a release recorded after its package checks can become a direct download.
try{
 const r=await fetch('./data/desktop-release.json',{cache:'no-store'});if(!r.ok)throw Error();const release=await r.json();
 if(release.status==='published'&&/^https:\/\/github\.com\/limmin3-sudo\/stam-freight-control\/releases\/download\/[\w.-]+\/STAM-[\w.-]+-win-x64\.zip$/.test(release.url)&&/^[a-f0-9]{64}$/.test(release.sha256)){
  const a=document.getElementById('app-download');a.href=release.url;a.textContent='Windows 앱 다운로드';
  document.getElementById('download-status').textContent=`${release.version} · ZIP ${Math.round(release.bytes/1024/1024)} MB · SHA-256 ${release.sha256}`;
 }
}catch{/* The explicit release page remains available; never fabricate a package. */}
