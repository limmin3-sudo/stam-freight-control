# 로그인 안내 문구 — 2026-11-16 / 미배포

사용자가 승인한 Firebase 인증·기본 Google 권한·운항 저장 목적·비로그인 이용 설명을 로그인/회원가입과 계정 이용안내에 반영했다. 비밀번호를 “암호화해 보관”한다고 단정하던 문구는 제거하고, 운영자가 저장 비밀번호를 조회할 수 없다고 표현했다. 아이디 방식의 비밀번호 복구 제한은 유지한다.

코드 근거: `account.mjs`는 Firebase의 createUserWithEmailAndPassword/signInWithEmailAndPassword를 호출하고, GoogleAuthProvider에 추가 scope를 설정하지 않는다. 운항 데이터 저장·복원은 기존 `flightCloud` 경로다. 인증 구현이나 보안 규칙은 수정하지 않았다. 실제 새 로그인·운영 서버 저장은 하지 않았다.

생산 빌드/타입·JS 구문·diff 검사 통과. 한국어/영어 로그인·회원가입/안내, 390px 모바일 표시 확인: [결과](report.json), [한국어](login-ko.png), [영어](login-en.png), [모바일](login-mobile.png). 초기 검수에서 기존 서비스센터의 legacy 문구가 URL 영어 모드를 따르지 않는 것을 확인해 이번 안내만 명시적으로 언어를 따라 갱신한다. 다른 로그인 UI의 번역 전체를 개편하지 않았다.

커밋·푸시·배포 없음.
