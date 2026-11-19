# STAM 파트너 질문 서버

GitHub Pages의 무역관·중개인·교수 대화창에서 질문을 보낼 때 이 Worker를 호출한다. Firebase 로그인 확인 후 OpenAI Responses API로 텍스트 질문과 직전 문답 한 쌍을 전송한다. 첫인사와 이동 버튼은 API를 호출하지 않는다.

## 배포 전 검증

저장소 루트에서 Node.js 22.13 이상으로 실행한다. Wrangler와 로컬 Cloudflare 런타임은 이 폴더의 잠금 파일을 사용한다.

```sh
npm ci --prefix workers/partner
npm test --prefix workers/partner
```

검사는 임시 폴더에 배포 번들을 만들고 로컬 Worker와 SQLite 기반 Durable Object를 실행한다. Firebase와 OpenAI 응답은 테스트 안에서 제공한다.

## 처음 공개할 때

1. Cloudflare 계정의 **Workers Free** 플랜을 사용한다. Workers & Pages에서 계정의 workers.dev 하위 도메인을 설정한다.
2. 이 작업이 포함된 저장소에서 아래 명령을 실행한다. 로그인 창에서 배포할 Cloudflare 계정을 선택한다. 출력되는 `https://stam-partner-chat.<계정>.workers.dev` 주소를 확인한다.

   ```sh
   cd workers/partner
   npx --no-install wrangler login
   npm run deploy
   ```

3. Cloudflare 대시보드의 **Workers & Pages → stam-partner-chat → Settings → Variables and Secrets**에서 **Secret** 유형으로 `OPENAI_API_KEY`를 추가하고 적용한다. 같은 폴더에서 `npm run secret`으로 숨김 입력해도 된다.
4. GitHub 저장소의 **Settings → Secrets and variables → Actions → Variables**에 `STAM_PARTNER_API_ORIGIN`을 등록한다. 값은 2단계에서 확인한 HTTPS 서버 주소만 넣는다. 공개 웹의 빌드 설정에는 이 주소만 사용한다.
5. 이 작업이 들어간 릴리스로 Pages를 다시 빌드·게시한다. 설정 전 빌드는 기존 화면을 표시한다. 웹 주소가 바뀌면 `wrangler.partner.toml`의 `STAM_WEB_ORIGIN`도 맞춰 Worker를 갱신한다.
6. 공개 웹에서 로그인 후 링 가문 중개인에게 질문하고, 후속 답변의 이동 버튼이 행성계 간 계획을 여는지 확인한다. 실제 질문은 OpenAI 크레딧을 사용한다.

## 비용 및 운영

- 모델은 `gpt-5.4-mini`, 기본 앱 한도는 누적 $8, UTC 월 $8, 계정당 60초에 5회다. Firebase ID 토큰 확인과 전체 예산 예약이 성공해야 질문이 모델로 전송된다.
- 단일 SQLite 기반 Durable Object가 전 세계 요청의 최대 예상액을 먼저 예약하고 응답에 포함된 토큰 사용량으로 정산한다. 타임아웃·사용량 누락은 예약을 유지한다. 만료된 요청의 상세 정보를 삭제해도 사용액은 보존한다. 월이 바뀌면 새 월 한도를 적용하며 누적 한도는 계속 적용한다.
- 한도는 이 Worker를 통한 사용만 집계한다. OpenAI 프로젝트의 실제 크레딧 잔액이나 이전 로컬 시험본의 장부는 별도다. 무료 Cloudflare 할당량이 소진되거나 장부를 읽지 못하면 질문이 실패할 수 있다.
- 즉시 중단하려면 Worker의 `OPENAI_API_KEY`를 비활성화하거나 제거한다. 한도로 중단하려면 `wrangler.partner.toml`의 `STAM_PARTNER_FUNDED_USD` 또는 `STAM_PARTNER_MONTHLY_USD`를 `"0"`으로 바꾸고 재배포한다. 이미 전송한 질문에는 비용이 발생할 수 있다.
- Worker 이름·Durable Object 클래스·공유 객체 이름은 장부의 주소다. 재배포 시 이 이름을 유지한다. 요금이나 사용 모델이 바뀌면 서버의 단가와 최대 예약액도 점검한다.

[Cloudflare Durable Objects 무료 플랜 조건과 할당량](https://developers.cloudflare.com/durable-objects/platform/pricing/)
