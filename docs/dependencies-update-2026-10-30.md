# 2026-10-30 의존성 정기 업데이트

공식 npm 레지스트리의 버전·peer 요구사항과 업스트림 릴리스 노트를 확인하고, 기존 React/RSC·Vite·TypeScript·ESLint 조합을 유지하면서 관련 도구를 함께 갱신했습니다.

| 패키지 | 이전 | 적용 |
| --- | --- | --- |
| @cloudflare/vite-plugin | 1.64.0 | 1.66.0 |
| wrangler | 4.151.0 | 4.156.0 |
| @cloudflare/workers-types | 5.20261023.1 | 5.20261030.1 |
| vinext | 1.0.0-beta.10 | 1.4.0 |
| @vitejs/plugin-react | 6.0.2 | 6.1.2 |
| @vitejs/plugin-rsc | 0.5.35 | 0.5.38 |
| @types/react | 19.2.14 | 19.3.0 |
| @types/react-dom | 19.2.3 | 19.3.0 |
| tailwindcss / @tailwindcss/postcss | 4.2.1 | 4.3.3 |
| @next/eslint-plugin-next | 16.2.6 | 16.4.3 |
| typescript-eslint | 8.59.3 | 8.72.1 |
| @types/node | 22.19.19 | 22.20.5 |
| globals | 16.4.0 | 16.5.0 |

React·React DOM·RSC 19.3.1, Vite 8.3.5, TypeScript 5.9.3, ESLint / @eslint/js 9.39.5는 유지했습니다. 현재 React·접근성 ESLint 플러그인의 peer 범위는 ESLint 9까지이며, typescript-eslint 8.72.1은 TypeScript 6.1 미만을 요구합니다. 최신 major만을 따라 ESLint 10·TypeScript 7·Node 타입 26으로 바꾸지 않았습니다.

## 호환성과 보안

- Cloudflare Vite plugin 1.66.0은 Wrangler ^4.154.0과 Vite 6/7/8을 지원합니다. 루트 Wrangler 4.156.0은 이 peer 범위를 충족합니다. 플러그인이 직접 고정한 Wrangler 4.154.0과 Miniflare 5.20261023.1-beta, 루트 Wrangler가 고정한 Miniflare 5.20261023.3-beta는 잠금 파일에서 각각 유지됩니다.
- Cloudflare 1.66.0은 npm 감사에 개별적으로 드러나지 않을 수 있는 내부 번들의 Undici·Zod도 수정합니다. 로컬 개발 레지스트리 변수는 `MINIFLARE_REGISTRY_PATH`에서 `CLOUDFLARE_DEV_REGISTRY_PATH`로 변경되므로 Vite 설정도 새 이름을 사용해야 합니다.
- Vinext 1.4.0은 React/RSC ^19.3.1, Vite ^8, RSC 플러그인 ^0.5.37을 요구합니다. 이번 그룹은 해당 조건을 만족합니다. 새 Vinext도 @vercel/og 1.0.3을 사용합니다.
- @vercel/og 1.0.3 / Satori 0.33.5 / fflate 0.7.5 override와 `scripts/prepare-og.mjs`를 보존했습니다. 소스맵에서 공식 코드를 재생성해 외부 보안 패키지를 사용하도록 하는 처리는 여전히 필요합니다. Satori 최신 버전이라는 이유만으로 검증된 OG 조합을 교체하지 않았습니다.
- Next ESLint 16.4.3은 여전히 fast-glob 3.3.1을 사용하며, Vinext의 CommonJS 플러그인도 dynamic-import 소비 경로를 유지합니다. 두 경로의 로컬 fast-glob 호환 계층과 override를 보존했습니다.
- 두 새 Miniflare 모두 Undici 7.30.1을 직접 요구합니다. 기존의 동일 버전 scoped override는 이번 변경에서 보존했습니다.

## 검증 기록

조회 전 상태에서 `npm audit --include=dev --audit-level=low --json`은 취약점 0건, 종료 코드 0이었습니다. `npm ls --all --json`도 종료 코드 0이었으나, 선택적 Sharp WASM 경로의 `@img/sharp-wasm32`, `@emnapi/runtime`, `tslib` 세 패키지를 extraneous로 표시했습니다. 이 세 패키지는 잠금 파일에 optional로 기록되어 있으며 peer 버전 충돌과는 구분합니다.

Windows Node 22.18.0 / npm 10.9.3 환경에서 다음을 확인했습니다.

| 명령 | 결과 |
| --- | --- |
| `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` | 성공, 종료 코드 0 |
| `npm ci --ignore-scripts --no-audit --no-fund` | 성공, 456개 패키지 재설치, 종료 코드 0 |
| `npm audit --include=dev --audit-level=low --json` | 취약점 0건, 종료 코드 0 |
| `npm ls --all --json` | 종료 코드 0, invalid/missing 없음; 위 optional 경로의 extraneous 3건은 재설치 후에도 동일 |
| `npm run deps:prepare` | 성공, OG node/edge 진입점 재생성 |
| `node --test tests/dependency-consistency.test.mjs tests/glob-compat.test.mjs` | 43개 통과, 심볼릭 링크 1개는 제한 환경 EPERM으로 생략 |
| 확장 실행 환경의 `node --test tests/glob-compat.test.mjs` | 심볼릭 링크 포함 40개 모두 통과, 생략·실패 0 |
| `git diff --check -- package.json package-lock.json docs/dependencies-update-2026-10-30.md` | 성공 |

의존성 검사 4개와 glob 검사 40개의 서로 다른 44개 항목은 최종적으로 모두 검증했습니다. OG 검사는 실제 320×160 PNG 생성과 파일 시그니처·크기를 확인합니다. 전체 빌드·타입·린트·브라우저 통합 검사는 데이터 업데이트와 합친 뒤 별도 실행합니다.

통합 단계에서 배포용 URL 설정으로 `npm run qa`의 빌드·타입·린트와 정적 테스트 87개, `npm run test:browser` 7개를 모두 통과했습니다(실패·생략 0). Cloudflare 개발 서버도 시작해 HTTP 200, 두 신규 캐릭터·아레나 HTML과 Vite 클라이언트 응답을 확인한 뒤 종료했습니다. 개발 모드의 React eval 디버깅 제한 안내와 향후 Vite native config loader 전환 안내는 출력되지만, 이번 개발 응답과 프로덕션 검사에는 실패가 없었습니다.

GitHub Actions의 `setup-node`는 공식 `v7.1.0` 태그가 가리키는 `949feb2413d6458794dcd2491c4babbbce0c15c1`로 고정했습니다. [공식 릴리스](https://github.com/actions/setup-node/releases/tag/v7.1.0)의 버전 검증·manifest 재시도 및 내부 의존성 수정을 반영합니다.

설치 과정의 ESLint 9.39.5 지원 종료 경고는 남습니다. 보안 감사는 0건이지만 관련 플러그인의 peer 제한 때문에 이번 업데이트에서 ESLint 10으로 바꾸지 않았습니다. 업데이트 후 `npm outdated --json`에는 이번에 제외한 major만 남았습니다: @eslint/js 10.0.1, ESLint 10.13.0, Node 타입 26.6.6, globals 17.13.0, TypeScript 7.0.2. 이 명령의 종료 코드 1은 오래된 버전이 남았음을 알리는 정상 결과입니다.

## 공식 근거

- [Cloudflare Vite plugin 1.66.0 릴리스](https://github.com/cloudflare/workers-sdk/releases/tag/%40cloudflare%2Fvite-plugin%401.66.0)
- [Wrangler 4.156.0 릴리스](https://github.com/cloudflare/workers-sdk/releases/tag/wrangler%404.156.0)
- [typescript-eslint 8.72.1 릴리스](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.72.1)
- [Vinext 1.4.0 릴리스](https://github.com/cloudflare/vinext/releases/tag/vinext%401.4.0)
- [Vinext 1.4.0 공식 npm manifest](https://registry.npmjs.org/vinext/1.4.0)
- [Cloudflare plugin 1.66.0 공식 npm manifest](https://registry.npmjs.org/%40cloudflare%2Fvite-plugin/1.66.0)
- [typescript-eslint 8.72.1 공식 npm manifest](https://registry.npmjs.org/typescript-eslint/8.72.1)
