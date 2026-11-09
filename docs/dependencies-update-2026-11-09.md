# 2026-11-09 의존성·보안 업데이트

공식 npm manifest의 peer·Node 요구사항과 업스트림 릴리스/보안 권고를 확인했습니다. React·React DOM·RSC 19.3.1, TypeScript 5.9.3, ESLint 9.39.5를 유지하면서 호환되는 프레임워크 그룹과 개발 도구를 갱신합니다.

| 패키지 | 이전 | 적용 |
| --- | --- | --- |
| @cloudflare/vite-plugin | 1.66.0 | 1.67.0 |
| @cloudflare/workers-types | 5.20261030.1 | 5.20261109.1 |
| wrangler | 4.156.0 | 4.158.0 |
| vinext | 1.4.0 | 1.4.4 |
| vite | 8.3.5 | 8.3.7 |
| @vitejs/plugin-react | 6.1.2 | 6.3.0 |
| @vitejs/plugin-rsc | 0.5.38 | 0.5.39 |
| @next/eslint-plugin-next | 16.4.3 | 16.4.5 |
| tailwindcss / @tailwindcss/postcss | 4.3.3 | 4.3.5 |
| playwright-core | 1.64.1 | 1.65.0 |
| fast-glob 호환 계층의 glob | 13.0.6 | 14.0.4 |
| typescript-estree 및 glob 경로의 minimatch | 10.2.6 | 11.0.5 |

## 보안 수정 범위

변경 전 전체 감사는 moderate 8건, high/critical 0건이었습니다. 8건은 독립 취약점 8개가 아니라 아래 두 원인과 TypeScript ESLint 소비 패키지로의 영향 전파를 포함합니다.

- [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4): glob 9.0.0~14.0.1의 취소 이후 파일 탐색 지속 문제. 첫 수정판은 14.0.2이며, 이번에는 공식 14.0.4를 사용합니다. 로컬 fast-glob 호환 계층의 백엔드만 갱신하고 입력 제한과 두 소비 경로는 유지합니다.
- [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): minimatch 7.0.0 이상 11.0.1 미만의 패턴 증폭 문제. glob 14.0.4는 수정된 minimatch ^11.0.5를 사용합니다. typescript-eslint 최신 8.72.1은 여전히 ^10.2.2를 요구하므로 `@typescript-eslint/typescript-estree` 경로만 11.0.5로 override합니다. 이 소비자는 CommonJS의 이름 있는 `minimatch()` API를 사용합니다. ESLint·React 플러그인의 minimatch 3.x는 이 권고의 영향 범위가 아니므로 바꾸지 않습니다.

`npm audit fix --force`의 typescript-eslint 8.36.0 다운그레이드 제안은 적용하지 않습니다. 두 보안 백엔드의 major 변경은 수정판에 도달하기 위해 필요하며, glob 소비 계약과 TypeScript parser 경로를 검증합니다.

## 호환성 유지

- Cloudflare plugin 1.67.0은 Vite 6/7/8, Wrangler ^4.156.1을 지원합니다. 루트 Wrangler 4.158.0과 Workers types 5.20261109.1은 해당 조건을 충족합니다. 플러그인의 고정 Wrangler 4.156.1/Miniflare 5.20261101.0-beta와 루트 Wrangler의 Miniflare 5.20261104.0-beta는 각 공식 요구대로 잠급니다.
- Vinext 1.4.4는 Vite ^8, React/RSC ^19.3.1, RSC 플러그인 ^0.5.37, React 플러그인 ^5.1.4 또는 ^6을 지원합니다. React 플러그인 6.3.0의 추가 컴파일러 peer는 선택 사항입니다.
- 새 Miniflare도 Undici 7.30.1을 요구하므로 기존 scoped override를 보존합니다.
- OG 1.0.3 / Satori 0.33.5 / fflate 0.7.5 버전과 공식 소스맵 기반 `deps:prepare` 처리는 유지합니다. 변경 전 `npm ls`가 hoist된 Satori→fflate를 invalid로 판정했으므로 Satori override를 최상위로 옮겨 그 의존 경로에 직접 적용합니다. Satori 최신 버전을 임의로 도입하지 않습니다.
- @types/node 22.20.5 및 typescript-eslint 8.72.1은 현재 사용 계열의 최신판입니다. React·접근성 ESLint 플러그인은 ESLint 10을 허용하지 않습니다. TypeScript 7은 parser의 `<6.1.0` peer 범위를 벗어납니다. Node 타입·globals의 새 major도 이번 범위에서 제외합니다.

## 검증 기록

Windows Node 22.18.0 / npm 10.9.3 기준입니다. 설치 전 `npm ls --all`은 fflate invalid와 선택적 Sharp WASM 경로의 extraneous 3개를 보고하며 종료 코드 1이었습니다.

| 명령 | 결과 |
| --- | --- |
| `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` | 종료 코드 0 |
| `npm ci --ignore-scripts --no-audit --no-fund` | 종료 코드 0, 463개 설치 |
| `npm audit --include=dev --audit-level=low --json` | 종료 코드 0, 모든 등급 취약점 0건 |
| `npm ls --all --json` | 종료 코드 0, invalid/missing 없음 |
| `npm run deps:prepare` | 종료 코드 0, OG Node/Edge 진입점 재생성 |
| `node --test tests/dependency-consistency.test.mjs tests/glob-compat.test.mjs` | 45개 통과, 실패·생략 0 |
| `git diff --check` (담당 파일) | 종료 코드 0 |

심볼릭 링크 생성이 가능한 확장 실행 환경에서 계약 테스트를 수행했습니다. 실제 320×160 OG PNG 생성과 시그니처·크기, 두 glob 소비자의 변환 결과, Windows/한글 경로·심볼릭 링크, 악성 패턴 차단을 확인했습니다. 새 회귀 검사는 TypeScript parser의 실제 project service를 거쳐 일반/숨김 JS 파일의 허용 패턴 일치와 다른 확장자 거부를 확인합니다.

설치 후에도 선택적 Sharp WASM 경로의 `@img/sharp-wasm32`, `@emnapi/runtime`, `tslib` 3개는 extraneous로 표시됩니다. 이는 설치 전과 동일하며 `npm ls`는 오류 없이 종료합니다. fflate invalid는 해결됐습니다. npm은 로컬 연결 패키지 아래에도 필요한 glob 의존성을 설치하므로 `/vendor/fast-glob-compat/node_modules/`를 Git 제외 목록에 추가했습니다.

데이터 변경과 통합한 뒤 전체 빌드·타입·린트·정적 테스트 109개와 격리 헤드리스 화면 테스트 15개를 통과했습니다. 통합 후 전체 보안 감사도 0건입니다. 설치 시 ESLint 9 지원 종료 경고는 남으며, 호환 플러그인이 마련되기 전까지 임의의 ESLint 10 전환은 하지 않습니다.

최종 `npm outdated --json`은 종료 코드 1로 의도적으로 보류한 major만 보고했습니다: `@eslint/js` 10.0.1, ESLint 10.14.0, Node 타입 26.6.6, globals 17.14.0, TypeScript 7.0.2. TypeScript 6도 이번에 필수적인 보안 수정은 아니므로 기존 컴파일러를 유지했습니다.

## 공식 근거

- [Cloudflare plugin 1.67.0 릴리스](https://github.com/cloudflare/workers-sdk/releases/tag/%40cloudflare%2Fvite-plugin%401.67.0)
- [Vinext 1.4.4 릴리스](https://github.com/cloudflare/vinext/releases/tag/vinext%401.4.4)
- [Vite 8.3.7 릴리스](https://github.com/vitejs/vite/releases/tag/v8.3.7)
- [React plugin 6.3.0 릴리스](https://github.com/vitejs/vite-plugin-react/releases/tag/plugin-react%406.3.0)
- [glob 14.0.4 공식 manifest](https://registry.npmjs.org/glob/14.0.4)
- [minimatch 11.0.5 공식 manifest](https://registry.npmjs.org/minimatch/11.0.5)
- [typescript-estree 8.72.1 공식 manifest](https://registry.npmjs.org/%40typescript-eslint%2Ftypescript-estree/8.72.1)
- [Vinext 1.4.4 공식 manifest](https://registry.npmjs.org/vinext/1.4.4)
- [Cloudflare plugin 1.67.0 공식 manifest](https://registry.npmjs.org/%40cloudflare%2Fvite-plugin/1.67.0)
