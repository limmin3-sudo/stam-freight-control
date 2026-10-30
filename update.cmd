@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo Git이 없습니다. Git for Windows를 설치한 뒤 다시 실행해 주세요.
  pause
  exit /b 1
)
set "new_url=https://github.com/limmin3-sudo/stam-freight-control.git"
for /f "delims=" %%u in ('git remote get-url origin 2^>nul') do set "old_url=%%u"
if not defined old_url (
  echo 이 폴더는 Git 저장소가 아니거나 origin이 없습니다.
  pause
  exit /b 1
)
echo %old_url% | findstr /i "verse-hauler" >nul
if not errorlevel 1 (
  git remote set-url origin %new_url%
  echo 저장소 주소를 새 이름으로 바꿨습니다.
)
git fetch origin
if errorlevel 1 (
  echo 최신 정보를 받지 못했습니다. 인터넷 연결과 GitHub 로그인을 확인해 주세요.
  pause
  exit /b 1
)
set "dirty="
for /f "delims=" %%s in ('git status --porcelain') do set "dirty=1"
if defined dirty (
  echo.
  echo 수정 중인 파일이 있어서 최신 변경을 받지 않았습니다. 아무것도 지우거나 덮어쓰지 않았습니다.
  git status --short
  echo 위 파일을 AI에게 보여 주고 정리한 뒤 다시 실행해 주세요.
  pause
  exit /b 1
)
git pull --ff-only
if errorlevel 1 (
  echo.
  echo 이 PC와 GitHub의 기록이 갈라져 자동으로 합치지 않았습니다. 아무것도 지우지 않았습니다. AI에게 확인을 요청해 주세요.
  pause
  exit /b 1
)
echo.
echo 최신 상태입니다.
git log -3 --oneline
pause
