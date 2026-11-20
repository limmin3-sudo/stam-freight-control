// Run only in the package workflow after the Windows EXE smoke test succeeds.
import {checkedDesktopArtifacts} from './desktop-artifacts.mjs';
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='limmin3-sudo/stam-freight-control'||(!/^refs\/heads\/(?:feature|rebuild)\//.test(process.env.GITHUB_REF||'')&&!(process.env.GITHUB_WORKFLOW==='Publish verified Windows companion'&&process.env.GITHUB_REF==='refs/heads/integration/freight-division-20261113')))throw Error('publish-context');
const release=JSON.parse((await readFile('dist/desktop-release.json','utf8')).replace(/^\uFEFF/,''));
const version=JSON.parse(await readFile('desktop/version.json','utf8')).version;
if(release.version!==version||!/^app\.\d+\.\d+\.\d+(?:-preview\.\d+)?$/.test(version))throw Error('version-mismatch');
const assets=await checkedDesktopArtifacts(release);
if(process.env.GITHUB_WORKFLOW==='Publish verified Windows companion'){const evidence=JSON.parse(await readFile('dist/promotion-evidence.json','utf8'));if(evidence.source!=='3ddc89bf8c62f6cb68b63b59d19b63a1035f727b'||JSON.stringify(evidence.release)!==JSON.stringify(release))throw Error('promotion-evidence-mismatch');}
const body=`STAM 네비게이터는 운송·무역 웹 콘솔과 연동되는 Windows 앱입니다. ${release.installer?'설치 EXE를 실행하면 STAM 바로가기가 만들어집니다. ZIP을 사용하는 경우에는 전체를 풀고 STAM.exe 하나만 실행하세요.':'ZIP 전체를 풀고 STAM.exe를 실행하세요.'} Node 설치나 관리자 권한은 필요하지 않습니다.

- 이전에 선택한 Game.log에 자동 연결하며, 처음 실행하면 일반 설치 경로의 LIVE 로그를 찾습니다. 여러 설치 또는 테스트 채널은 직접 선택합니다.
- 앱의 **미션콘솔 열기** 버튼으로 공개 사이트를 엽니다. 브라우저의 로컬 네트워크 접근 허용 후 수주 계약이 자동 수신됩니다.
- 창을 닫아도 트레이에서 수신합니다. 같은 STAM 아이콘을 다시 누르면 기존 창이 열리며, 종료는 트레이 메뉴에서 합니다.
- 한국어·English 선택과 로그 경로를 기억합니다. 업데이트·앱 삭제로 이 설정이나 브라우저의 진행 중 운항을 지우지 않습니다.
- 선택한 운송·개인 교역·공동 교역 요약을 오버레이로 볼 수 있습니다. 운송 관제에서 표시를 연결한 뒤 네비게이터 또는 오버레이에서 **눌러서 말하기**를 사용하세요. 기본 단축키는 키보드 숫자 1 왼쪽의 백틱 키입니다. 누른 채 말하고 떼면 명령을 처리합니다. 게임 중 계속 들으려면 **연속 듣기 켜기**를 선택하세요. 다시 누르면 마이크가 꺼집니다. 한국어는 “적재 완료”, “배송 완료”, “다음 단계”를 지원합니다. Windows 음성 인식을 사용합니다.
- 웹 화면·항로·적재 기능은 별도로 업데이트됩니다. 게임 로그는 읽기 전용입니다.
- Windows 10/11 x64용이며 코드 서명은 없습니다.

[미션콘솔](https://limmin3-sudo.github.io/stam-freight-control/#/mission?lang=ko)

Windows 패키지 검사와 포함 런타임 검증을 통과했습니다. 실제 게임 검증을 완료했다는 뜻은 아닙니다.
검사: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}
소스: ${process.env.GITHUB_SHA}
ZIP SHA-256: ${release.sha256}
${release.installer?'설치 EXE SHA-256: '+release.installer.sha256+'\n':''}
파일별 체크섬은 PACKAGE.json, 출처·라이선스는 app/THIRD-PARTY-NOTICES.md·app/desktop/fonts/·runtime/LICENSE에 있습니다.
`;
const preview=await readFile('dist/launcher-preview.png');
const blob=JSON.parse(execFileSync('gh',['api','repos/'+process.env.GITHUB_REPOSITORY+'/git/blobs','--input','-'],{input:JSON.stringify({encoding:'base64',content:preview.toString('base64')}),encoding:'utf8'}));
if(!/^[a-f0-9]{40}$/.test(blob.sha))throw Error('launcher-image-blob');
release.launcherBlobSha=blob.sha;
release.launcherSha256=createHash('sha256').update(preview).digest('hex');
await writeFile('dist/desktop-release.json',JSON.stringify(release,null,2));
await writeFile('dist/RELEASE-NOTES.md',body);
// No --clobber: an existing version is immutable and must not be silently replaced.
execFileSync('gh',['release','create',version,...assets,'dist/SHA256SUMS.txt','dist/desktop-release.json','dist/launcher-preview.png','dist/launcher-preview-en.png','--repo',process.env.GITHUB_REPOSITORY,'--target',process.env.GITHUB_SHA,'--prerelease','--title','STAM 네비게이터 · Windows x64','--notes-file','dist/RELEASE-NOTES.md'],{stdio:'inherit'});

console.log('STAM_RELEASE_METADATA '+JSON.stringify(release));
