# 2026-10-30 니케 명단 갱신 근거

검증 기준일은 한국 시간 2026-10-30입니다. 기존 수집 대상 203명에 10월 29일 출시된 2명을 추가하여 205명이 되었습니다. 예정 캐릭터, 코스튬, 튜토리얼·만우절 임시 플레이 캐릭터는 추가하지 않았습니다.

## 추가 명단

| 한국어 이름 | 영어 이름 | 아카이브 ID | 출시일 (UTC+9) | 제조사 | 클래스 | 버스트 | 코드 | 무기 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 마리안 : 퀸 | Marian: Queen | 25132 | 2026-10-29 | 필그림 | 화력형 | III | 작열 | MG |
| 라푼젤 : 생츄어리 | Rapunzel: Sanctuary | 25134 | 2026-10-29 | 필그림 | 지원형 | II | 작열 | RL |

새 ID는 기존 숫자 ID와 같은 International NIKKE Wiki의 `pageid`입니다. 게임 클라이언트의 리소스 ID로 바꾸지 않았습니다. 기존 203개의 ID와 모든 레코드 값은 보존했고, 영어 이름 정렬 관례를 유지했습니다.

## 출시·명칭·속성 근거

- [공식 한국어 10월 29일 업데이트 공지](https://game.naver.com/lounge/nikke/board/detail/8369216): 두 캐릭터의 한국어·영어 이름, 클래스, 무기, 코드, 필그림 소속 및 10월 29일 점검 후 모집·획득 시작을 확인했습니다.
- [공식 대만 10월 29일 업데이트 공지](https://nikke.hotcool.tw/News_detail-237): 조회 시점에 점검 완료와 서버 개방을 안내하고 있었습니다. 두 캐릭터의 출시일과 전투 속성이 한국어 공지와 일치합니다. 마리안은 특수 모집, 라푼젤은 4TH ANNIVERSARY 로그인 보상 등으로 획득할 수 있습니다.
- [위키 마리안 : 퀸](https://nikke-goddess-of-victory-international.fandom.com/wiki/Marian:_Queen), [위키 라푼젤 : 생츄어리](https://nikke-goddess-of-victory-international.fandom.com/wiki/Rapunzel:_Sanctuary): 공개 MediaWiki API 원문에서 ID, 영문·한국어명, 버스트 III/II, 제조사·클래스·코드·무기·출시일을 확인했습니다. 위키는 공식 운영 자료가 아니므로 출시 여부는 공식 공지를 우선했습니다.
- [Prydwen 마리안 프로필](https://www.prydwen.gg/nikke/characters/marian-queen), [Prydwen 라푼젤 프로필](https://www.prydwen.gg/nikke/characters/rapunzel-sanctuary): 두 캐릭터의 버스트 III/II와 전투 속성이 위키·공식 공지와 일치합니다.
- [니케허브 마리안](https://nikkehub.com/nikkes/marian-queen), [니케허브 라푼젤](https://nikkehub.com/nikkes/rapunzel-sanctuary): 두 명의 한국어 명칭과 신규 출시 표시, 이미지의 실제 연결 주소를 확인했습니다. [전체 목록](https://nikkehub.com/)도 205명을 표시합니다.
- [nikkers.cc 마리안 API](https://nikkers.cc/nikkes/Marian%3A%20Queen)는 HTTP 200으로 Fire/MG/Attacker/PILGRIM/B3를 반환했습니다. 같은 서비스의 라푼젤 신규 항목은 HTTP 404였으므로 라푼젤의 근거로 사용하지 않았습니다. 해당 API의 평가·추천 수치는 이 명단 변경에 사용하지 않았습니다.

## 전체 목록 대조와 제외 항목

`https://nikke-goddess-of-victory-international.fandom.com/api.php`의 `action=query`, `list=categorymembers`, `cmtitle=Category:Playable characters`, `cmnamespace=0`, `cmlimit=500`, `format=json` 응답을 기존 203명과 ID/이름으로 대조했습니다. 응답 211개이며 다음 페이지는 없었습니다. 기존 203명 전원이 대응했고, 차이는 위 신규 2명과 다음 6명뿐입니다.

- [Scarlet: Goddeath / 홍련 : 신살](https://nikke-goddess-of-victory-international.fandom.com/wiki/Scarlet:_Goddeath): 공식 공지의 모집 시작은 **2026-11-05 05:00 KST**입니다. 위키에 이미 데이터가 존재하지만 10월 30일 기준 미출시이므로 제외했습니다.
- Marian, Shifty, Syuen, Mecha Shifty, Mekami Shifty: 기존 [10월 23일 갱신 문서](roster-update-2026-10-23.md)의 튜토리얼·만우절 임시 플레이 전용 5명과 동일합니다. 영구 수집 대상에 추가하지 않았습니다.
- 신데렐라·그레이브·나유타 선택 모집은 기존 캐릭터의 재모집이며 신규 레코드를 만들지 않았습니다. 신규 코스튬도 별도 캐릭터로 추가하지 않았습니다.

## 이미지 근거와 남은 한계

신규 아이콘은 니케허브의 해당 캐릭터 페이지 HTML에서 직접 연결된 blabla link CDN 주소를 사용합니다. 추정한 파일명이나 리소스 ID로 URL을 만들지 않았습니다.

| 용도 | 확인한 주소 | 검증 결과 |
| --- | --- | --- |
| 마리안 아이콘·상세 대체 이미지 | [blabla link CDN](https://sg-tools-cdn.blablalink.com/pv-63/bj-03/a447f201daaa56f38a438779cc967c77.webp) | GET 200, image/webp, 256×512, 32,492바이트 |
| 라푼젤 아이콘 | [blabla link CDN](https://sg-tools-cdn.blablalink.com/zj-41/mw-73/352fc04b8a69cec22aea5f10fbe5a404.webp) | GET 200, image/webp, 256×512, 32,432바이트 |
| 라푼젤 전신 | [위키 파일 정보](https://nikke-goddess-of-victory-international.fandom.com/wiki/File:Rapunzel_Sanctuary_FB.png) | API 파일 ID 24643, 원본 919×1147, 표시용 thumburl 512×639 |

**마리안의 상세 이미지는 현재 검증된 초상화로 대체합니다. 전신 일러스트를 확보했다고 표시하지 않습니다.** 위키 API에서 `Marian Queen MI.png`, `Marian Queen FB.png`, `Rapunzel Sanctuary MI.png`는 missing이었고, 파일 목록·검색에서도 마리안 퀸의 전신을 찾지 못했습니다. Prydwen 프로필이 연결하는 두 신규 캐릭터의 `*_full.webp`는 모두 HTTP 404라 채택하지 않았습니다. 위키에 실제 존재한 라푼젤 전신만 사용했습니다.

API의 파일 존재·주소 확인과 HTTP 이미지 응답 검증을 구분했습니다. 이 조사에서는 화면 조작/CUA를 사용하지 않았으며 실제 화면에서의 시각적 확인을 완료했다고 주장하지 않습니다. 이미지 정책과 통합 화면 검증은 별도 통합 작업에서 확인합니다.

통합 단계에서는 내려받은 두 초상화 파일을 내부 이미지 도구로 열어 이미지 내용을 확인했고, 새 CDN만 CSP에 추가했습니다. 마리안의 초상화를 전신이라고 설명하지 않도록 공통 이미지 대체 텍스트를 `캐릭터 이미지`로 바꿨습니다. 격리된 headless Chrome에서 신규 두 명의 검색·보유 등록·새로고침 후 복원·상세 추천 표시를 검사했습니다. 원격 이미지 전체의 응답 검사는 PR의 별도 artwork 작업에서 수행합니다.

## 회귀 검증

- 갱신 전 HEAD `cad7f8f621e15b03fb15812ee11836614e6cba45`의 203명 ID를 `tests/fixtures/roster-ids-2026-10-28.json`으로 보존했습니다. 기존 200명 fixture도 유지하며 두 스냅샷 모두 검사합니다.
- 저장 직전에 최신 roster를 다시 읽고 HEAD와 일치함을 확인한 뒤 추가했습니다. 이전 203개 레코드가 객체 값까지 그대로 유지되는지 확인했습니다.
- 새 2명의 명칭·ID·전투 속성, ID/이름 중복, 예정 캐릭터 제외 및 검증된 이미지 사용을 `tests/roster-update.test.mjs`에서 검사합니다.
- `node --test tests/roster-update.test.mjs` 실행 결과 6개 모두 통과했습니다. 추가 독립 대조에서도 이전 203개 전체 레코드 보존, HEAD와 ID fixture 일치, 위키 211개 목록의 완결성·기존 명단 대응 및 205명의 영어 이름 정렬을 확인했습니다.
- 오버로드·큐브 추천은 이 명단 작업에서 추측하여 추가하지 않았습니다.
