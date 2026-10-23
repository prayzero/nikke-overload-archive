# 2026-10-23 니케 명단 갱신 근거

검증 기준일은 한국 시간 2026-10-23입니다. 기존 200명에 정식 출시된 수집 대상 3명을 추가하여 203명이 되었습니다. 기존 ID와 레코드는 보존했으며, 디젤 이미지 수정은 별도 작업에서 반영했습니다.

## 추가 명단

| 한국어 이름 | 영어 이름 | 아카이브 ID | 출시일 (UTC+9) | 제조사 | 클래스 | 버스트 | 코드 | 무기 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 길티 : 마이티 바니 | Guilty: Mighty Bunny | 24919 | 2026-09-17 | 미실리스 | 화력형 | III | 수냉 | SR |
| 신 : 스위프트 바니 | Sin: Swift Bunny | 24918 | 2026-09-24 | 미실리스 | 화력형 | III | 수냉 | SR |
| 벨로타 : 펌킨 위치 | Belorta: Pumpkin Witch | 25019 | 2026-10-08 | 테트라 | 지원형 | II | 수냉 | RL |

새 ID는 기존 숫자 ID와 같은 International NIKKE Wiki `pageid` 규칙을 따릅니다. 게임 클라이언트의 캐릭터 리소스 ID와는 다릅니다. 기존 페르소나 캐릭터의 `c870`, `c871`, `c872` ID를 포함해 저장된 보유 목록의 키를 변경하지 않았습니다.

## 출시 및 속성 근거

- [공식 9월 17일 업데이트 공지](https://nikke.hotcool.tw/News_detail-223): 길티의 9월 17일 및 신의 9월 24일 모집 시작과 두 니케의 화력형/SR/수냉/미실리스 속성을 확인했습니다. 공지 본문은 점검 완료 상태입니다.
- [공식 한국어 10월 8일 업데이트 공지](https://game.naver.com/lounge/nikke/board/detail/8289927): 벨로타 : 펌킨 위치의 한국어 명칭, 10월 8일 모집 시작, 지원형/RL/수냉/테트라 속성을 확인했습니다.
- [공식 대만 10월 8일 업데이트 공지](https://nikke.hotcool.tw/News_detail-232)에서도 벨로타의 출시일과 속성이 일치합니다.
- 위키 원문에서 한국어·영어 이름, 버스트 단계, 출시일을 대조했습니다: [길티](https://nikke-goddess-of-victory-international.fandom.com/wiki/Guilty:_Mighty_Bunny), [신](https://nikke-goddess-of-victory-international.fandom.com/wiki/Sin:_Swift_Bunny), [벨로타](https://nikke-goddess-of-victory-international.fandom.com/wiki/Belorta:_Pumpkin_Witch).
- 독립 공개 데이터 API에서도 제조사·클래스·무기·코드·버스트 값이 세 명 모두 일치했습니다: [길티](https://nikkers.cc/nikkes/Guilty%3A%20Mighty%20Bunny), [신](https://nikkers.cc/nikkes/Sin%3A%20Swift%20Bunny), [벨로타](https://nikkers.cc/nikkes/Belorta%3A%20Pumpkin%20Witch). API의 `resource_id` 404/405/63은 아카이브 ID로 사용하지 않았습니다.

위키 원문 조회는 `https://nikke-goddess-of-victory-international.fandom.com/api.php`에서 `action=query`, `titles=Guilty: Mighty Bunny|Sin: Swift Bunny|Belorta: Pumpkin Witch`, `prop=revisions`, `rvprop=content`, `rvslots=main`, `format=json`으로 실행했습니다. 위키는 공식 운영 자료가 아니므로 출시 여부와 주요 속성은 위 공식 공지와 교차 검증했습니다.

## 전체 명단 대조

같은 위키 API의 `list=categorymembers`, `cmtitle=Category:Playable characters`, `cmnamespace=0`, `cmlimit=500` 응답 208개를 기존 200명 전체와 ID/이름으로 대조했습니다. 응답에 다음 페이지가 없었으며, 기존 캐릭터 200명은 전부 해당 목록과 대응했습니다. 차이는 신규 3명과 아래 임시 플레이 전용 5명입니다.

| 제외한 이름 | 제외 이유와 원문 |
| --- | --- |
| Marian | [튜토리얼에서만 임시 플레이하며 해당 모습은 영구 영입 불가](https://nikke-goddess-of-victory-international.fandom.com/wiki/Marian) |
| Shifty | [2023년 만우절 Full Fool Day의 지정 임무 전용](https://nikke-goddess-of-victory-international.fandom.com/wiki/Shifty) |
| Syuen | [2024년 만우절 Liar's End의 지정 임무 전용](https://nikke-goddess-of-victory-international.fandom.com/wiki/Syuen) |
| Mecha Shifty | [2025년 만우절 Fool Burst Day의 지정 임무 전용](https://nikke-goddess-of-victory-international.fandom.com/wiki/Mecha_Shifty) |
| Mekami Shifty | [2026년 만우절 Fool Metal Panic의 지정 임무 전용](https://nikke-goddess-of-victory-international.fandom.com/wiki/Mekami_Shifty) |

사이트가 보유 목록과 장비 추천을 관리하므로 이 5명은 수집 대상에 넣지 않았습니다. 신규 코스튬과 아직 모집되지 않은 캐릭터도 별도 니케로 추가하지 않았습니다.

## 이미지 근거

주소는 위키 API `prop=imageinfo`, `iiprop=url|size`, `iiurlwidth=512` 응답에서 가져왔습니다. 존재가 확인된 파일 정보는 다음과 같습니다. 아이콘은 원본 `url`, 전신 일러스트는 512픽셀 `thumburl`을 사용합니다.

| 캐릭터 | 아이콘 파일 ID / 원본 크기 | 전신 파일 ID / 원본 크기 | 전신 표시 크기 |
| --- | --- | --- | --- |
| 길티 : 마이티 바니 | 24957 / 256×512 | 24939 / 771×1541 | 512×1023 |
| 신 : 스위프트 바니 | 24961 / 256×512 | 24936 / 777×1346 | 512×887 |
| 벨로타 : 펌킨 위치 | 25071 / 256×471 | 25021 / 1495×1819 | 512×623 |

- 길티 [아이콘 파일 정보](https://nikke-goddess-of-victory-international.fandom.com/wiki/File:Guilty_Mighty_Bunny_MI.png) / [전신 파일 정보](https://nikke-goddess-of-victory-international.fandom.com/wiki/File:Guilty_Mighty_Bunny_FB.png)
- 신 [아이콘 파일 정보](https://nikke-goddess-of-victory-international.fandom.com/wiki/File:Sin_Swift_Bunny_MI.png) / [전신 파일 정보](https://nikke-goddess-of-victory-international.fandom.com/wiki/File:Sin_Swift_Bunny_FB.png)
- 벨로타 [아이콘 파일 정보](https://nikke-goddess-of-victory-international.fandom.com/wiki/File:Belorta_Pumpkin_Witch_MI.png) / [전신 파일 정보](https://nikke-goddess-of-victory-international.fandom.com/wiki/File:Belorta_Pumpkin_Witch_FB.png)

조회 시점의 정확한 CDN 주소와 캐시 버전은 `app/roster.json`의 `image` 및 `artwork` 필드에 저장했습니다. 이 로컬 터미널에서 CDN 직접 HEAD/GET 요청은 403 HTML 응답을 반환했습니다. 따라서 위키 파일의 존재·주소 검증과 실제 브라우저/배포 이미지 검증을 구분합니다. 터미널 응답을 이미지 성공으로 간주하지 않았으며, 브라우저 및 GitHub Actions의 통합 검증 결과는 배포 점검에서 별도로 기록합니다.

## 로컬 데이터 검증

- 저장 직전에 `app/roster.json`을 다시 읽어 병행 작업의 디젤 이미지 변경을 보존했습니다.
- 신규 3개 ID/영어 이름 중복이 없는지 확인했습니다.
- 추가 전 200개 레코드와 추가 후 동일 ID의 레코드를 객체 값으로 비교해 그대로 보존했음을 확인했습니다.
- 오버로드·큐브 값은 이 명단 갱신에서 추측하여 만들지 않았습니다. 해당 추천은 별도로 검토하고 생성합니다.
