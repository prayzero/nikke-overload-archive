# 2026-11-09 니케 명단 갱신 근거

검증 기준일은 한국 시간 2026-11-09입니다. 10월 30일의 205명에 11월 5일 출시된 **홍련 : 신살**을 추가하여 206명이 되었습니다. 마리안 : 퀸은 새로 확인한 기본 전신 이미지로 상세 이미지를 교체했습니다. 예정 캐릭터, 코스튬, 재모집, 튜토리얼·만우절 임시 플레이 캐릭터는 별도 레코드로 추가하지 않았습니다.

## 추가 명단과 출시 근거

| 한국어 이름 | 영어 이름 | 아카이브 ID | 모집 시작 (UTC+9) | 제조사 | 클래스 | 버스트 | 코드 | 무기 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 홍련 : 신살 | Scarlet: Goddeath | 25133 | 2026-11-05 05:00 | 필그림 | 화력형 | III | 작열 | AR |

- [공식 한국어 10월 29일 업데이트 공지](https://game.naver.com/lounge/nikke/board/detail/8369216)와 [공식 대만 업데이트 공지](https://nikke.hotcool.tw/News_detail-237)에서 클래스·무기·코드·제조사와 모집 기간을 확인했습니다. 모집 시작은 11월 5일 05:00, 종료는 11월 26일 04:59:59 (UTC+9)입니다. 10월 30일에는 예정 캐릭터였지만 이번 기준일에는 모집 기간에 들어왔습니다.
- [Prydwen 프로필](https://www.prydwen.gg/nikke/characters/scarlet-goddeath), [Nikke.gg 캐릭터 데이터](https://nikke.gg/characters/scarlet-goddeath), [니케허브 프로필](https://nikkehub.com/nikkes/scarlet-goddeath)의 영문 이름·속성·버스트와 출시일을 교차 확인했습니다. [니케허브 모집 이력](https://nikkehub.com/pickup/history)에서도 11월 5일 모집 중인 캐릭터로 표시됩니다.
- [International NIKKE Wiki 고정 리비전 72677](https://nikke-goddess-of-victory-international.fandom.com/index.php?title=Scarlet:_Goddeath&oldid=72677)의 공개 API 원문에서 한국어명, `attacker / fire / 3 / ar / pilgrim`과 출시일을 확인했습니다. 페이지 ID `25133`을 새 저장 ID로 사용했습니다. 리비전 시각은 2026-10-30T17:17:02Z이며, 위키의 사전 등록만으로 출시를 판정하지 않았습니다.
- 한국 공식 공지의 영문 표기와 글로벌 데이터베이스 표기가 다르므로, 검색·추천 데이터에 사용하는 영어 이름은 기존 글로벌 명명 관례인 `Scarlet: Goddeath`로 통일했습니다. 원본 홍련 `265`, 홍련 : 흑영 `8816`은 그대로 유지합니다.

## 전체 명단과 기존 저장 데이터 대조

위키 API `action=query&list=categorymembers&cmtitle=Category:Playable characters&cmnamespace=0&cmlimit=500&format=json` 응답은 211개이며 추가 페이지가 없었습니다. 기존 205명 모두 ID 또는 이름으로 대응했습니다. 새 홍련을 추가한 206명과 비교하면 영구 수집 대상에 넣지 않는 Marian, Shifty, Syuen, Mecha Shifty, Mekami Shifty 5명만 남습니다. [니케허브 전체 목록](https://nikkehub.com/)의 표시 수 206명도 일치했습니다. 확인한 공식 모집 일정과 이 두 목록에서 추가로 누락된 출시 캐릭터를 발견하지 못했습니다.

기존 페르소나 캐릭터 Aigis, Queen (Makoto Niijima), Yukiko Amagi는 아카이브 ID `c872`, `c870`, `c871`을 이미 사용합니다. 현재 위키 페이지 ID `24683`, `24670`, `24687`과 다르지만 이름으로 동일 캐릭터임을 대조했으며, 보유 목록 호환을 위해 기존 ID를 보존했습니다.

저장 직전에 최신 roster가 갱신 전 HEAD `141f061968403c415c816a22bab8ac3779a29949`와 같음을 확인했습니다. 기존 205명의 모든 ID 및 필드는 마리안 : 퀸의 `artwork` 교체를 제외하고 보존했습니다. 영어 이름의 `localeCompare` 정렬 관례도 유지했습니다.

## 이미지 출처와 응답 검증 범위

추측한 파일명이나 리소스 ID로 URL을 만들지 않았습니다. 초상화는 니케허브 캐릭터 페이지의 실제 연결 주소, 전신은 위키 `imageinfo` 응답의 `thumburl`을 그대로 사용했습니다.

| 용도 | 실제 파일·주소 | 확인 결과 |
| --- | --- | --- |
| 홍련 : 신살 아이콘·대체 이미지 | [blabla link CDN](https://sg-tools-cdn.blablalink.com/ud-13/hp-46/2668d4ae685fe7ec154f20f2301120d3.webp) | GET 200, image/webp, 256×512, 32,172바이트. 내부 이미지 도구로 내용을 확인한 초상화이며 전신이 아닙니다. |
| 홍련 : 신살 기본 전신 | [위키 파일](https://nikke-goddess-of-victory-international.fandom.com/wiki/File:Scarlet_Goddeath_FB.png) · [표시용 주소](https://static.wikia.nocookie.net/nikke-goddess-of-victory-international/images/d/de/Scarlet_Goddeath_FB.png/revision/latest/scale-to-width-down/512?cb=20260831155954) | 파일 ID 24644, 원본 1013×1469, 표시용 512×742. API에서 파일 존재와 주소 확인. |
| 마리안 : 퀸 기본 전신 | [위키 파일](https://nikke-goddess-of-victory-international.fandom.com/wiki/File:Marian_Queen_FB.png) · [표시용 주소](https://static.wikia.nocookie.net/nikke-goddess-of-victory-international/images/c/c0/Marian_Queen_FB.png/revision/latest/scale-to-width-down/512?cb=20261101085819) | 파일 ID 25159, 원본 1080×1112, 표시용 512×527. 11월 1일 업로드된 기본 전신이며 코스튬 파일이 아닙니다. |

마리안의 전신은 10월 30일 조사 당시 없었으나 이번 API에서 실제 파일이 확인되어 교체했습니다. 기존 아이콘은 그대로 유지합니다. Prydwen의 홍련 `scarlet-goddeath_full.webp`는 조회 시 HTTP 404여서 사용하지 않았습니다.

**위키 파일 존재 확인과 CDN 응답 성공을 구별합니다.** 이 조사 환경의 Node GET은 두 위키 전신 URL에 HTTP 403을 반환했습니다. 따라서 전신 이미지의 실제 다운로드·렌더링 성공은 이 조사에서 확인하지 못했습니다. 파일 API가 제공한 정식 주소만 반영했으며, 병합 전 격리 브라우저 또는 별도 이미지 검사에서 응답과 렌더링을 확인해야 합니다. HTTP 403이 환경 문제인지 CDN 접근 문제인지는 단정하지 않았습니다.

통합 담당의 격리 headless 검사에서도 새 전신 2개의 로드는 실패했습니다. 비교 대상으로 검사한 기존 홍련·디젤 전신과 새 파일의 원본 주소도 같은 로컬 환경에서 HTTP 403을 반환하여 로컬 CDN 접근 문제 가능성이 확인됐습니다. 기존 main의 [원격 이미지 검사 실행 42610555794](https://github.com/prayzero/nikke-overload-archive/actions/runs/42610555794)는 성공했지만 새 URL은 포함하지 않습니다. **새 URL을 포함하는 이번 PR의 원격 이미지 검사 성공을 병합 조건으로 둡니다.** 최종 응답 결과는 해당 PR의 `Check remote artwork` 기록에서 확인하며, 로컬 조사만으로 신규 전신의 렌더링 성공을 주장하지 않습니다.

API 응답·원문·이미지 응답 기록은 로컬 무시 경로 `work/roster-update-2026-11-09-evidence.json`에 저장했습니다. 확인한 초상화는 `work/roster-20261109-scarlet-icon.webp`이며 SHA-256은 `bdb3ccd2f3a422130ba8736fd1dada3c134d6826be7a1bb59429886b4d6a84f4`입니다. 이 조사에서는 CUA를 사용하지 않았습니다.

## 회귀 검사

- 갱신 전 HEAD의 205명 ID를 `tests/fixtures/roster-ids-2026-10-30.json`에 추가했습니다. 이전 200명·203명 스냅샷도 보존하며 세 스냅샷의 ID를 모두 검사합니다.
- `tests/roster-update.test.mjs`에 신규 홍련의 명칭·ID·전투 속성, 이전 홍련 2종과의 구별, 206명 총수와 정렬 검사를 추가했습니다. 마리안의 새 기본 전신과 홍련의 실제 출처 URL도 검사합니다.
- 명단 테스트는 URL의 값·형식과 속성을 검사하며 원격 이미지 응답 성공을 보증하지 않습니다. 응답 검증의 미완료 범위는 위에 별도로 기록했습니다.
- `node --test tests/roster-update.test.mjs`는 7개 모두 통과했습니다. 별도 Node 대조에서도 기존 205명 ID와 허용한 이미지 1개 외의 전체 필드 보존, HEAD와 fixture 일치, 206명의 중복 없는 ID·이름 및 정렬, 위키 211개 목록과 임시 캐릭터 5명 차이, 사용한 이미지 URL과 수집한 API 응답의 일치를 확인했습니다. 담당 변경 파일의 `git diff --check`도 통과했습니다.
- 오버로드·큐브·아레나 데이터는 이 명단 작업에서 수정하지 않았습니다.
