# NIKKE // OVERLOAD ARCHIVE

보유 니케와 오버로드·하모니 큐브 추천을 한곳에서 관리하는 비공식 팬 아카이브입니다.

## 주요 기능

- 2026-09-16 기준 플레이어블 니케 200명 수록
- 200명 전원의 일러스트와 아이콘 폴백
- 한글·영문 이름 검색 및 제조사·클래스·무기 필터
- 카드 클릭으로 미보유 흑백 → 보유 컬러 전환
- 보유 목록을 브라우저에 자동 저장
- 머리·몸통·팔·다리, 각 3개씩 총 12개 오버로드 목표 표시
- 17종 하모니 큐브를 기준으로 200명 전원의 1순위·대안 큐브 표시
- GitHub Pages 자동 배포

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm ci
npm run dev
```

프로덕션 정적 빌드는 `npm run build`로 생성되며 결과물은 `dist/client/` 폴더에 저장됩니다.

## 품질·보안 검사

```bash
npm run qa
npm run artwork:check
```

`qa`는 타입, 린트, 정적 빌드, 데이터 완전성·배포 자산·이미지 검사기 테스트를 실행합니다. 빌드 결과에는 해시 기반 Content Security Policy가 자동 적용됩니다. 주간 GitHub Actions는 전신 일러스트와 대체 아이콘을 모두 검사하고, HEAD 실패는 GET으로 재확인하며, 실제로 없어진 파일은 실패로 보고합니다.

## 2026-09-16 점검

- 드레이크 : 그레이트 빌런 추가. 9월 17일/24일 예정인 길티·신 바니는 아직 출시 명단에 포함하지 않습니다.
- 파일명이 바뀐 에반게리온 4명과 퀸의 주소 수정. 페르소나 3명의 임시 스킬 컷을 전신 일러스트로 교체했습니다. 기존 보유 ID는 유지합니다.
- 퀸·유키코의 출시 후 공략, 순례자 라푼젤 등의 큐브, 애장품 조건을 재검토했습니다. 확인한 레코드만 검증 날짜를 갱신합니다.
- 반복 실패 알림은 삭제된 이미지 주소 및 React/RSC·Vinext 플러그인의 개별 업데이트로 인한 버전 불일치에서 발생했습니다. 연동 패키지는 함께 갱신하고, 미지원 도구 major 업데이트는 호환성 검토 후 적용합니다.

출처: [공식 9월 3일 업데이트](https://nikke.hotcool.tw/News_detail-218), [공식 9월 예정 업데이트](https://nikke.hotcool.tw/News_detail-223), [드레이크 분석](https://nikke.gg/drake-great-villain-analysis-should-you-pull/), [퀸 가이드](https://www.prydwen.gg/nikke/characters/queen-makoto), [유키코 가이드](https://www.prydwen.gg/nikke/characters/yukiko), [큐브 효과](https://www.prydwen.gg/nikke/guides/harmony-cubes-information).

## 데이터와 권리

캐릭터 명단·한국어 이름·대표 이미지는 NIKKE International Wiki와 공개 게임 데이터 매핑을 참고하며, 신규 명단과 변경된 이미지 주소는 2026-09-16에 갱신했습니다. 이미지에는 위키 본문의 CC BY-SA가 자동으로 적용된다고 보지 않습니다. 오버로드와 큐브 값은 공개 가이드와 캐릭터 기믹을 교차 검토한 권장안이며, 파티·콘텐츠·보스·PvP 임계와 보유 큐브 레벨에 따라 달라질 수 있습니다. 개별 레코드의 검증 날짜와 신뢰도 표시를 함께 확인하세요.

이 프로젝트는 비공식·비상업 팬 프로젝트입니다. NIKKE의 캐릭터·명칭·이미지 권리는 © Proxima Beta Pte. Limited, © SHIFT UP CORP. 및 각 라이선스 제공자에게 있습니다. 본 프로젝트는 권리자와 제휴·후원·승인 관계가 없습니다.
