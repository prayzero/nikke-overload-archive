# 2026-10-23 개발 의존성 보안 수정

## 원인과 수정 범위

수정 전 `npm audit --json`은 high 15건을 보고했습니다. 이는 독립 취약점 15개가 아니라 취약한 하위 패키지를 사용하는 상위 도구의 경고를 포함한 패키지 수입니다.

| 경로 | 수정 |
| --- | --- |
| Vite 8.0.16 | 8.3.5로 갱신 |
| Cloudflare Vite plugin 1.54.10 / Wrangler 4.132.0 | 1.64.0 / 4.151.0 및 peer 요구사항을 만족하는 Workers 타입 5.20261023.1로 함께 갱신 |
| Miniflare의 sharp 0.35.4 / undici 7.29.0 | 새 Cloudflare 도구가 제공하는 0.35.5 / 7.29.1로 갱신 |
| brace-expansion 1.1.18 / 5.0.9 | 기존 major를 유지하여 1.1.21 / 5.0.12로 갱신 |
| source-map-js 1.2.1 | 1.2.2로 갱신 |
| Next ESLint / Vinext → fast-glob → micromatch → braces | 두 소비 경로의 파일 탐색을 glob 13.0.6 기반 제한된 호환 계층으로 대체 |

공식 보안 근거:

- [Vite 개발 서버의 Windows 에디터 실행 취약점](https://github.com/advisories/GHSA-587h-7wmj-h5pm)
- [sharp의 librsvg 취약점: 0.35.5에서 수정](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)
- [undici TLS 검증 문제: 7.29.1에서 수정](https://github.com/advisories/GHSA-w293-vg96-wgc3)
- [brace-expansion의 과도한 CPU 사용과 수정 버전](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr)
- [source-map-js: 1.2.2에서 수정](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
- [braces의 중첩 패턴 스택 고갈: 공식 수정 버전 없음](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)

## 미패치 패키지의 대체

2026-10-23 확인 기준 `braces`의 npm 최신 3.0.3도 취약합니다. 최신 Next ESLint와 Vinext 역시 이 경로를 사용하므로 단순 버전 갱신으로 해결되지 않습니다.

`vendor/fast-glob-compat`는 취약한 코드를 복사하거나 경고를 제외하지 않습니다. 실제 파일 탐색을 `glob@13.0.6`에 위임하고 두 소비자에 필요한 동기 API만 제공합니다. 전체 fast-glob API의 호환 구현은 아닙니다. 지원하지 않는 옵션·문자/숫자 brace 범위·extglob과 과도한 패턴은 오류로 거부합니다. 일반 경로, 확장자 대안, globstar, 제외 패턴, 심볼릭 링크 등 지원 계약과 회귀 검사 근거는 해당 디렉터리의 README에 기록합니다.

`overrides`는 `@next/eslint-plugin-next`와 `vite-plugin-dynamic-import`의 fast-glob에만 적용합니다. 업스트림이 취약한 경로를 제거하면 두 override와 호환 계층을 함께 제거하고 lint·정적 빌드·회귀 검사를 재실행해야 합니다. 두 소비자가 새 API나 옵션을 도입할 때도 계약 검사를 먼저 갱신해야 합니다.

로컬 패키지는 루트 개발 의존성에 `file:vendor/fast-glob-compat`로 선언하고, 두 override는 `$fast-glob`으로 그 선언을 참조합니다. 잠금 파일의 링크는 저장소 루트의 `vendor/fast-glob-compat`를 가리켜야 합니다. 소비자 패키지 디렉터리 아래의 `vendor`나 머신별 절대 경로를 가리키면 잘못된 설치입니다.

## 재현 검사

```sh
npm ci --ignore-scripts
npm ls --all
npm run security:audit
npm run qa
```

PR와 배포 workflow는 개발 의존성을 포함한 보안 감사를 실행합니다. 감사 통과는 실행 시점의 npm 취약점 데이터베이스 기준이며, 미래의 미공개 취약점까지 없다는 뜻은 아닙니다.

최종 로컬 설치에서 `npm ci --ignore-scripts`, `npm ls --all`, 개발 의존성을 포함한 보안 감사(0건), 전체 `npm run qa`가 통과했습니다. 테스트는 66개 통과·실패 0개·스킵 0개이며, 실제 소비자의 모듈 해석, 파일 탐색 동등성, 심볼릭 링크, 과도한 입력 거부, 기존 203명 명단과 정적 자산을 검사합니다. Linux 환경은 PR 및 배포 workflow에서 같은 설치·감사·QA 명령으로 검증합니다.
