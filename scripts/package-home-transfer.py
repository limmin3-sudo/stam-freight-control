"""Package the current 2.5D source snapshot for a local Codex handoff.

No commits, remote writes, Git objects, dependencies, caches or personal logs.
Explicit reference files live outside source and are never published by the app.
"""
import argparse
import datetime
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])


def paths(*args):
    return [p for p in git(*args).decode().split('\0') if p]


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--reference', action='append', default=[], type=Path,
                    help='Explicit non-source review image/video (repeatable).')
args = parser.parse_args()
if args.output.resolve().is_relative_to(ROOT):
    parser.error('Write the archive outside the source repository.')
if args.output.exists() or args.output.with_suffix(args.output.suffix + '.sha256').exists():
    parser.error('Output already exists; use a new filename to preserve earlier handoffs.')
stamp = datetime.datetime.now(ZoneInfo('Asia/Seoul'))
prefix = f'STAM-LOCAL-2D-{stamp:%Y%m%d}/'
head = git('rev-parse', 'HEAD').decode().strip()
branch = git('branch', '--show-current').decode().strip()
names = sorted(set(paths('ls-files', '-c', '-o', '--exclude-standard', '-z')))
files = {}
for name in names:
    path = ROOT / name
    if path.is_symlink():
        raise RuntimeError(f'Symlink is not a source snapshot file: {name}')
    if not path.is_file():
        continue
    if not path.resolve().is_relative_to(ROOT):
        raise RuntimeError(f'Path outside source root: {name}')
    if any(part in {'.git', 'node_modules', 'dist', '__pycache__', '.aws', '.codex', '.agents'} for part in path.relative_to(ROOT).parts):
        raise RuntimeError(f'Excluded directory in source list: {name}')
    if ((path.name.startswith('.env') and path.name != '.env.example')
            or path.name in {'secrets.json', 'credentials.json', '.dev.vars'}
            or path.suffix.lower() in {'.log', '.pem', '.key', '.pfx', '.p12'}):
        raise RuntimeError(f'Private/local file in source list: {name}')
    files['source/' + name] = path
for path in args.reference:
    if not path.is_file() or path.is_symlink() or path.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp', '.mp4', '.webm'}:
        parser.error(f'Reference must be an existing image or video: {path}')
    name = 'references/' + path.name
    if name in files:
        parser.error(f'Duplicate reference filename: {path.name}')
    files[name] = path
manifest = {
    'created_at_kst': stamp.isoformat(timespec='seconds'),
    'repository': 'https://github.com/limmin3-sudo/stam-freight-control.git',
    'base_commit': head,
    'source_branch': branch,
    'snapshot_only': True,
    'visual_status': 'Image-based STAM lounge/orbital control centre interaction prototype. Full-room 3D/Blender/free roaming plans cancelled. Actual workspaces and final artwork remain in progress.',
    'handoff': 'source/docs/LOCAL-CODEX-HANDOFF.md',
    'modified_tracked_files': paths('diff', '--name-only', '-z', 'HEAD'),
    'deleted_tracked_files': paths('diff', '--name-only', '--diff-filter=D', '-z', 'HEAD'),
    'untracked_source_files': paths('ls-files', '-o', '--exclude-standard', '-z'),
    'excluded': ['Git history', 'node_modules', 'dist', 'ignored caches', 'private settings/logs', 'Gen Studio models'],
    'files': {name: {'bytes': path.stat().st_size, 'sha256': digest(path)} for name, path in files.items()},
}
readme = '''STAM 로컬 Codex 작업 전달본 — 2.5D 라운지·관제센터

1. 기존 프로젝트에 덮어쓰지 말고 새 폴더에 압축을 풉니다.
2. source/docs/LOCAL-CODEX-HANDOFF.md를 읽습니다.
3. 집 PC Codex에서 source 폴더를 '로컬 작업'으로 엽니다.
4. source/start-control-room-preview.cmd 실행 (Node.js 22.12 이상).
5. http://127.0.0.1:5173 에서 현재 라운지 시제품을 확인합니다.
6. Gen Studio는 기존 설치를 사용하고 MCP 진단부터 확인합니다.

source/ = 최신 미커밋 코드·문서·이미지·기존 소개영상
references/ = 사용자 제공 Gemini 비교 영상과 Cloud 화면 검증 자료
TRANSFER-MANIFEST.json = 기준 Git SHA, 변경 목록, 모든 파일 SHA-256

관제실 전체 3D 모델링·Blender·자유 보행 계획은 폐기됐습니다.
소스에 남은 과거 실험은 보존 자료이며 새 작업의 기준이 아닙니다.
현재 공간은 정지 이미지 기반이며 실제 지도/적재 3D는 별도 개발 대상입니다.

이 ZIP에는 .git이 없습니다. 기존 저장소에 덮어쓰기, git init 또는 과거 Git
객체 결합을 하지 마세요. Git 연결이 필요하면 인계 문서의 새 clone 및
기준 SHA 확인 절차를 먼저 따르세요. 커밋·푸시·배포는 하지 않았습니다.

설치된 의존성·개인 설정/로그인·비밀키·게임 로그·Gen Studio 모델은 포함하지
않았습니다. npm ci가 필요한 패키지만 처음 실행할 때 설치합니다.
'''
args.output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(args.output, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    archive.writestr(prefix + 'README-FIRST.txt', readme)
    archive.writestr(prefix + 'TRANSFER-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2))
    for name, path in files.items():
        archive.write(path, prefix + name)
with zipfile.ZipFile(args.output) as archive:
    assert archive.testzip() is None
    for name, info in manifest['files'].items():
        assert hashlib.sha256(archive.read(prefix + name)).hexdigest() == info['sha256'], name
value = digest(args.output)
args.output.with_suffix(args.output.suffix + '.sha256').write_text(f'{value}  {args.output.name}\n')
print(json.dumps({'archive': str(args.output), 'files': len(files), 'bytes': args.output.stat().st_size,
                  'sha256': value, 'base_commit': head, 'integrity_verified': True}, indent=2))
