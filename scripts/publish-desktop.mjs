// Run only in the package workflow after the Windows EXE smoke test succeeds.
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='limmin3-sudo/stam-freight-control'||!/^refs\/heads\/(?:feature|rebuild)\//.test(process.env.GITHUB_REF||''))throw Error('publish-context');
const release=JSON.parse((await readFile('dist/desktop-release.json','utf8')).replace(/^\uFEFF/,''));
const version=JSON.parse(await readFile('desktop/version.json','utf8')).version;
if(release.version!==version||!/^app\.\d+\.\d+\.\d+(?:-preview\.\d+)?$/.test(version))throw Error('version-mismatch');
const zip=`dist/STAM-${version}-win-x64.zip`,bytes=await readFile(zip);
if(bytes.length!==release.bytes||createHash('sha256').update(bytes).digest('hex')!==release.sha256)throw Error('package-integrity');
const body=`Windows x64 관제 연결 앱입니다. ZIP 전체를 새 폴더에 풀고 **STAM.exe**를 실행한 다음 **StarCitizen/LIVE/Game.log**를 선택하십시오. Node 설치나 관리자 권한은 필요하지 않습니다.

- 앱에서 한국어·English를 선택할 수 있으며 선택한 언어를 기억합니다.
- 로그 선택 후 브라우저가 자동으로 열리지 않습니다. **STAM 사이트 열기** 버튼으로 기존 공개 사이트를 열며, 브라우저가 요청하면 로컬 네트워크 연결을 허용하십시오.
- 브라우저의 계약 수신함에서 계약을 골라 기존 미션 편집창으로 열고, 확인·저장한 계약으로 항로를 준비합니다.
- 사이트의 화면·항로·적재 기능은 별도로 업데이트됩니다. 화면 자원은 앱에 포함되지 않으므로 사이트 변경마다 앱을 재설치할 필요가 없습니다.
- 실행기 창은 최소화해 두십시오. 닫으면 연결이 종료됩니다.
- Windows 10/11 x64용 휴대형 앱이며 코드 서명이 없습니다. 보안 기능을 끄지 말고 출처를 확인하세요.

[운송 관제](https://limmin3-sudo.github.io/stam-freight-control/)

Windows에서 전체 테스트와 실제 EXE·포함 런타임 검사를 통과한 패키지입니다. 실제 게임 검증을 완료했다는 뜻은 아닙니다.
검사: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}
소스: ${process.env.GITHUB_SHA}
ZIP SHA-256: ${release.sha256}

파일별 체크섬은 PACKAGE.json, 출처·라이선스는 app/THIRD-PARTY-NOTICES.md와 runtime/LICENSE에 있습니다.
`;
const preview=await readFile('dist/launcher-preview.png');
const blob=JSON.parse(execFileSync('gh',['api','repos/'+process.env.GITHUB_REPOSITORY+'/git/blobs','--input','-'],{input:JSON.stringify({encoding:'base64',content:preview.toString('base64')}),encoding:'utf8'}));
if(!/^[a-f0-9]{40}$/.test(blob.sha))throw Error('launcher-image-blob');
release.launcherBlobSha=blob.sha;
release.launcherSha256=createHash('sha256').update(preview).digest('hex');
await writeFile('dist/desktop-release.json',JSON.stringify(release,null,2));
await writeFile('dist/RELEASE-NOTES.md',body);
// No --clobber: an existing version is immutable and must not be silently replaced.
execFileSync('gh',['release','create',version,zip,'dist/SHA256SUMS.txt','dist/desktop-release.json','dist/launcher-preview.png','dist/launcher-preview-en.png','--repo',process.env.GITHUB_REPOSITORY,'--target',process.env.GITHUB_SHA,'--prerelease','--title','STAM Windows · 관제 연결','--notes-file','dist/RELEASE-NOTES.md'],{stdio:'inherit'});

console.log('STAM_RELEASE_METADATA '+JSON.stringify(release));
