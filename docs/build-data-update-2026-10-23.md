# 2026-10-23 추천 데이터 보완 기록

이 문서는 당일 초기 보완의 기록입니다. 이후 범용 추천과 출처 누락 항목을 검토한 결과는 [개별 추천 후속 검토](individual-recommendations-2026-10-23.md)에 있습니다.

## 범위와 근거

출시 명단은 공식 [9월 공지](https://nikke.hotcool.tw/News_detail-223), [10월 공지](https://nikke.hotcool.tw/News_detail-232)와 대조했습니다. 장비·큐브 선택은 공식 최적 세팅이 아니라 아래 전문 가이드의 분석을 요약한 권장안입니다. 직접 전투 시뮬레이션이나 계정별 피해량 측정은 수행하지 않았습니다.

| 대상 | 확인한 출처 | 반영한 내용 |
| --- | --- | --- |
| 길티 : 마이티 바니 | [Nikke.gg 10/2 분석](https://nikke.gg/guilty-mighty-bunny-analysis-should-you-pull/) | 우월 코드·공격력·차지 속도, 장탄 1~2줄 보완, 재장전 큐브. 변환 버스트의 고정 차지와 차지 대미지 비추천을 구분했습니다. |
| 신 : 스위프트 바니 | [Nikke.gg 10/2 분석](https://nikke.gg/sin-swift-bunny-analysis-should-you-pull/) | 기본 사격의 차지 속도와 버스트 고정 차지를 구분했습니다. 장탄 1~2줄, 모드별 크리 옵션, 파츠 보스 큐브 조건을 명시했습니다. |
| 벨로타 : 펌킨 위치 | [Nikke.gg 10/16 분석](https://nikke.gg/belorta-pumpkin-witch-analysis-should-you-pull/), [초기 투자 가이드](https://nikke.gg/belorta-pumpkin-witch-early-analysis/) | 장비 기본 능력치·스킬 우선, 재설정 최소화. 큐브는 재장전을 기본으로 보유 레벨과 버스트 수급을 비교합니다. OL 차지 속도 1줄은 기믹 기반 유지 후보이며 검증된 최적 줄 수가 아닙니다. |
| 디젤 : 윈터 스위츠 | [Nikke.gg 개별 분석](https://nikke.gg/diesel-winter-sweets-analysis-should-you-pull/) | 일반 RL 규칙을 지속 대미지용 우월 코드·공격력·크리 추천으로 교체했습니다. 3초 버프 유지를 위한 재장전 큐브 조건을 추가했습니다. |
| 미하라 : 본딩 체인 | [Nikke.gg 개별 가이드](https://nikke.gg/mihara-bonding-chain-best-builds-teams-and-how-to-play/) | 장탄 4줄 고정 범용안 대신 장탄 2줄 이상·약 600발 조건을 명시하고 재장전 지원 유무에 따른 큐브를 설명했습니다. |
| 라벨 | [Nikke.gg 개별 분석](https://nikke.gg/label-analysis-should-you-pull/) | AR 범용 큐브를 피해 감소·HP 보호막용 큐브로 교체했습니다. |
| 민트 | [Nikke.gg 개별 분석](https://nikke.gg/mint-analysis-should-you-pull/) | 3초 버프 유지 때문에 재장전 큐브를 쓰는 이유를 추가했습니다. |
| 맥스웰 : 오디너리 미케닉 | [Nikke.gg 개별 분석](https://nikke.gg/maxwell-ordinary-mechanic-analysis-should-you-pull/) | 주력 지원·관통 딜러·버스트를 쓰지 않는 보조 역할별 큐브를 구분했습니다. |

## 데이터 표현

- OL 5명, 큐브 8명의 검토 날짜만 2026-10-23으로 갱신하고 `sources`에 링크를 추가했습니다. 기존 검토 날짜는 유지합니다.
- 기존 무기·역할 범용 추천은 삭제하지 않고 `mechanic` 신뢰도와 “개별 스킬 검증 전” 안내를 함께 표시합니다. 전체 203명의 개별 키트나 현재 메타를 다시 검증했다는 의미가 아닙니다.
- 바니 두 명은 우월 코드 4줄·공격력 4줄·차지 속도 2줄·장탄 2줄의 총 12줄 예시를 데이터에 명시합니다. 가이드가 제시한 범위 안의 조합이며 팀·장탄 수치에 따라 배분을 조정합니다. 각 장비에서 원하는 옵션이 나오는 것을 보장하는 표가 아닙니다.
- 벨로타의 상세 줄 수는 기믹 해석이며 `guide`로 표시하지 않습니다. 최신 분석도 신규 캐릭터 평가가 조정될 수 있음을 밝힙니다.

## 재현과 검증

```sh
node scripts/build-overloads.mjs
node scripts/build-cubes.mjs
node --test tests/recommendations-update.test.mjs
```

검증은 새 캐릭터의 개별 근거, 버스트 차지 예외, 무기 범용안의 한계 표시, 날짜 보존, 출처 링크 구조를 확인합니다. 전체 빌드·타입·린트·배포 검증은 통합 작업에서 별도로 실행합니다.
