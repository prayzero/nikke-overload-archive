# 2026-10-28 보안 의존성 후속 수정

아레나 기능의 배포 검사에서 새로 감지된 하위 의존성 취약점을 수정했습니다. 직접 의존성의 주요 버전은 유지하고, 필요한 경로에만 보안 버전을 지정했습니다.

| 패키지 | 적용 버전 | 적용 범위 |
| --- | --- | --- |
| fast-uri | 3.1.9 | 기존 허용 범위의 잠금 파일 갱신 |
| zod | 4.6.7 | 기존 허용 범위의 잠금 파일 갱신 |
| undici | 7.30.1 | miniflare 하위 경로 override |
| @vercel/og | 1.0.3 | 패키지 내부 번들에도 수정된 Satori가 포함되도록 갱신 |
| satori | 0.33.5 | @vercel/og 하위 경로 override |
| fflate | 0.7.5 | 해당 satori 하위 경로 override |

Satori의 SVG 이스케이프 수정 버전이 고정한 fflate 0.7.3에도 알려진 ZIP 파싱 문제가 있어 같은 0.7 계열의 수정 버전 0.7.5를 함께 적용했습니다. 이전 @vercel/og는 Satori 코드를 내부에 번들하므로 하위 의존성 override만으로 충분하지 않아 OG 패키지도 갱신했습니다. `npm audit fix --force`가 제안한 Vinext 또는 Cloudflare 플러그인 다운그레이드는 적용하지 않았습니다.

기존 fast-glob 호환 계층과 React/RSC 버전 정렬은 유지합니다. OG 이미지 생성기의 실제 PNG 출력·크기를 검사하는 호환성 테스트를 추가했습니다. 배포 시 전체 감사, 의존성 트리, 빌드·타입·린트·테스트를 다시 검사합니다.

## OG 번들 호환 처리

@vercel/og 1.0.3의 Node 번들은 HarfBuzz의 CommonJS 로더를 ESM 안에 넣어 `Dynamic require of "fs" is not supported`로 실패했고, 내부에 fflate 0.7.3도 포함하고 있었습니다. 단순한 npm 감사만으로는 이 번들 문제를 확인할 수 없습니다.

`scripts/prepare-og.mjs`는 설치된 공식 1.0.3 패키지가 제공하는 소스맵의 원본 TypeScript 다섯 파일만 기존 TypeScript 도구로 재생성합니다. OG의 로직·이미지·글꼴은 유지하고, Satori와 하위 라이브러리는 패치된 외부 패키지로 불러오게 합니다. 임의 경로를 추출하지 않으며 버전이나 예상 소스가 달라지면 실패합니다. 원본 패키지의 MIT 라이선스가 적용됩니다.

빌드·개발·정적 테스트 전에 자동 실행하므로 CI의 `npm ci --ignore-scripts` 후에도 적용됩니다. 향후 @vercel/og를 변경할 때에는 이 처리를 먼저 재검토하거나 제거해야 합니다. 현재 사이트는 정적 OG 이미지를 사용하며, 별도로 실제 Node PNG 생성과 두 진입점의 외부 의존성 로딩을 회귀 검사합니다.

근거: [fast-uri URI 해석 취약점](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [Undici EventSource](https://github.com/advisories/GHSA-4qv8-2p9j-2685), [Zod 메모리 사용](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [Satori SVG 이스케이프](https://github.com/advisories/GHSA-wx4j-mvgx-mqwp), [fflate ZIP64](https://github.com/advisories/GHSA-px8p-9vwx-vf98).
