// Run only in the package workflow after the Windows EXE smoke test succeeds.
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='limmin3-sudo/stam-freight-control'||!/^refs\/heads\/rebuild\//.test(process.env.GITHUB_REF||''))throw Error('publish-context');
const release=JSON.parse((await readFile('dist/desktop-release.json','utf8')).replace(/^\uFEFF/,''));
const version=JSON.parse(await readFile('data/rebuild-version.json','utf8')).version;
if(release.version!==version||!/^rebuild\.\d{8}\.\d+$/.test(version))throw Error('version-mismatch');
const zip=`dist/STAM-${version}-win-x64.zip`,bytes=await readFile(zip);
if(bytes.length!==release.bytes||createHash('sha256').update(bytes).digest('hex')!==release.sha256)throw Error('package-integrity');
const body=`Windows x64용 **개발판 관제 연결 앱**입니다. 전체 재구축과 실게임 검증이 끝난 완성본은 아닙니다.

1. ZIP을 새 폴더에 전부 풀고 **STAM.exe**를 실행해 주세요.
2. StarCitizen/LIVE/Game.log를 선택하면 기본 브라우저에 관제가 열립니다.
3. Node 설치·관리자 권한은 필요하지 않습니다. runtime·app 폴더를 함께 유지해 주세요.
4. 실행기 창은 최소화해 두셔도 됩니다. 닫으면 로그 연결이 종료됩니다.
5. 상단 **이용 안내**에서 13단계 슬라이드와 24초 1080p 출항 브리핑을 볼 수 있습니다.

영상은 독자적인 화물선 콘셉트 이미지·예시 관제 화면·오리지널 음악과 효과음으로 만든 브리핑입니다. 영어 화면 문구와 한글 자막을 사용합니다. 공식 Star Citizen 영상/음악을 복사하지 않았으며 실게임 검증 영상이 아닙니다. 별도 briefing.mp4 파일로도 볼 수 있습니다.

- Windows 10/11 x64 휴대형 앱. ARM/설치 관리자는 지원하지 않습니다. 코드 서명 전이므로 출처와 체크섬을 확인하세요. 보안 기능을 끄도록 안내하지 않습니다.
- 선택한 로그만 읽습니다. 게임 수정·메모리 접근·주입·패킷 감청·자동 입력을 하지 않습니다. CIG/EAC의 공식 승인을 받았다고 주장하지 않습니다.
- 같은 PC·브라우저·기본 로컬 주소에서 설정을 이어 씁니다. 기존 연결 종료 후 새 버전을 별도 폴더에 풀어 실행하세요.
- **모든 유형의 자동 명세, 실제 위치의 연속 추적, 전체 운항 상태의 기기 간 동기화, 새 UI 전체 English 전환은 미완료**입니다.

검증: Windows에서 전체 테스트→실제 EXE 컴파일→포함된 Node 런타임으로 로컬 서비스·안내 페이지 확인 후 이 파일을 생성했습니다. 실게임 미확인.
검사 실행: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}
소스: ${process.env.GITHUB_SHA}
ZIP SHA-256: ${release.sha256}
파일별 목록은 ZIP의 PACKAGE.json, 라이선스는 runtime/LICENSE와 app/THIRD-PARTY-NOTICES.md에 있습니다.

사이트는 별도 Pages 배포로 갱신됩니다. 앱 버전은 이 릴리스의 소스와 체크섬을 기준으로 확인하세요.
`;
await writeFile('dist/RELEASE-NOTES.md',body);
// No --clobber: an existing version is immutable and must not be silently replaced.
execFileSync('gh',['release','create',version,zip,'dist/SHA256SUMS.txt','assets/onboarding/briefing.mp4','--repo',process.env.GITHUB_REPOSITORY,'--target',process.env.GITHUB_SHA,'--prerelease','--title','STAM Windows 개발판 · 출항 안내','--notes-file','dist/RELEASE-NOTES.md'],{stdio:'inherit'});
