import { readFile, writeFile } from "node:fs/promises";

const rosterPath = new URL("../app/roster.json", import.meta.url);
const outputPath = new URL("../app/cubes.json", import.meta.url);
const roster = JSON.parse((await readFile(rosterPath, "utf8")).replace(/^\uFEFF/, ""));

const verifiedAt = "2026-08-20";
const validCubeIds = new Set([
  "assault", "onslaught", "resilience", "bastion", "adjutant", "wingman",
  "quantum", "vigor", "endurance", "healing", "tempering", "assist",
  "destruction", "piercing", "crush", "cover", "divide",
]);

const make = (
  primary,
  alternatives,
  note,
  mode = "PvE",
  confidence = "mechanic",
) => ({ primary, alternatives, mode, note, confidence, verifiedAt });

const defaultRecommendations = {
  MG: make(
    "bastion",
    ["resilience", "wingman"],
    "기관총의 긴 재장전과 재가속 손실을 줄이기 위해 탄환 환급을 우선합니다. 큐브 레벨이 낮거나 재장전 버프 팀이면 렐릭 베어로 바꿉니다.",
  ),
  AR: make(
    "resilience",
    ["bastion", "assault"],
    "범용 재장전 단축으로 사격 공백을 줄입니다. 장탄 OL이 충분하고 택티컬 베어 레벨이 높다면 탄환 환급이 더 좋아질 수 있습니다.",
  ),
  SMG: make(
    "resilience",
    ["bastion", "assault"],
    "범용 재장전 단축을 우선합니다. 장탄 수가 충분하면 택티컬 베어, 명중이 필요한 전장에서는 렐릭 어설트를 대안으로 사용합니다.",
  ),
  SG: make(
    "resilience",
    ["bastion", "wingman", "assault"],
    "산탄총의 재장전 공백을 줄이는 범용 선택입니다. 장탄 OL 전에는 택티컬 부스트, 장탄 확보 뒤에는 택티컬 베어를 비교합니다.",
  ),
  RL: make(
    "resilience",
    ["bastion", "adjutant", "onslaught"],
    "로켓 런처의 긴 재장전 공백을 줄이는 범용 선택입니다. 차지 임계가 필요한 운용에서만 부스트·차지 대미지 큐브를 사용합니다.",
  ),
  SR: make(
    "resilience",
    ["bastion", "adjutant", "onslaught"],
    "스나이퍼의 재장전 공백을 줄이는 범용 선택입니다. 스킬 회전에 차지 속도 임계가 있을 때만 렐릭 부스트를 우선합니다.",
  ),
};

const overrides = {
  "Anis: Sparkling Summer": make("resilience", ["destruction", "assault"], "마지막 탄환 기믹을 빠르게 돌려야 하므로 재장전 속도가 핵심입니다. 탄환 환급과 장탄 증가 큐브는 사용하지 않습니다.", "보스", "guide"),
  Dorothy: make("resilience", ["divide", "destruction"], "마지막 탄환 스킬 회전을 위해 렐릭 베어를 사용합니다. 분배 대미지나 파츠 보스에서는 전문 큐브를 상황별로 비교합니다.", "보스", "guide"),
  Exia: make("resilience", ["adjutant", "onslaught"], "마지막 탄환 발동을 앞당기는 재장전 속도가 가장 안정적입니다. 장탄 증가와 탄환 환급은 피합니다."),
  Helm: make("resilience", ["healing", "piercing"], "마지막 탄환 기믹을 유지하면서 재장전 공백을 줄입니다. 회복량이나 관통 피해가 더 중요한 전투에서만 전문 큐브를 사용합니다.", "보스"),
  Julia: make("resilience", ["bastion", "assault"], "탄창 회전을 빠르게 가져가는 범용안입니다. Julia의 실전 큐브 검증이 적어 보유 큐브 레벨을 우선합니다."),
  K: make("resilience", ["assault", "destruction"], "마지막 탄환 운용을 망치지 않도록 재장전 속도를 우선합니다. 장탄 증가·탄환 환급은 사용하지 않습니다."),
  Marciana: make("resilience", ["vigor", "healing"], "사격 횟수 기반 회복을 더 자주 발동시키도록 재장전 속도를 우선합니다. 순수 회복량이 필요하면 비거·힐링을 비교합니다."),
  Pepper: make("resilience", ["healing", "vigor"], "마지막 탄환과 스택 회전을 빠르게 돌리는 선택입니다. 자동 운용보다 수동 재장전에서 효과가 큽니다.", "PvE", "guide"),
  Privaty: make("resilience", ["destruction", "assault"], "마지막 탄환 발동과 자체 재장전 버프를 함께 살립니다. 탄환 환급·장탄 증가 큐브는 피합니다."),
  Eunhwa: make("resilience", ["adjutant", "onslaught"], "마지막 탄환 기믹 때문에 탄환 환급과 장탄 증가를 피하고 재장전 속도를 사용합니다."),
  Ludmilla: make("resilience", ["tempering", "vigor"], "마지막 탄환 기믹을 유지하면서 재장전 공백을 줄입니다. PvP 생존이 목적이면 템퍼링을 사용합니다.", "PvE/PvP"),
  Crow: make("resilience", ["tempering", "assault"], "마지막 탄환 발동을 방해하지 않는 범용 선택입니다. PvP 생존이 필요하면 템퍼링으로 교체합니다."),
  Sin: make("resilience", ["tempering", "vigor"], "마지막 탄환 기믹 때문에 장탄·환급 큐브를 피합니다. PvP 탱킹에서는 템퍼링이 더 중요할 수 있습니다.", "PvE/PvP"),
  "IDoll Ocean": make("resilience", ["healing", "assault"], "마지막 탄환 발동을 유지하는 재장전 큐브가 안전합니다. 장탄·환급 큐브는 제외합니다."),
  "Vesti: Tactical Upgrade": make("resilience", ["crush", "adjutant"], "마지막 탄환 회전이 핵심이라 재장전을 우선합니다. 방어력 무시 대미지 비중이 높은 전투에서만 크러쉬를 비교합니다.", "보스", "guide"),

  Crown: make("resilience", ["bastion", "destruction"], "자체 재장전 버프와 조합해 사격 공백을 최소화합니다. 파츠 보스이거나 장탄 OL이 충분하면 대안을 비교합니다.", "범용", "guide"),
  Modernia: make("bastion", ["resilience", "assault", "destruction"], "기관총의 재장전과 재가속을 최대한 피하도록 탄환 환급을 사용합니다. 명중 OL이 없을 때만 어설트가 스킬 발동 보조가 됩니다.", "보스", "guide"),
  "Ludmilla: Winter Owner": make("bastion", ["resilience", "wingman"], "기관총 지속 사격과 자체 탄환 효과를 살리는 탄환 환급이 우선입니다.", "보스", "guide"),
  Rem: make("bastion", ["resilience", "healing"], "기관총 사격 유지가 회복과 피해 양쪽에 도움이 됩니다. 회복량만 필요한 전투에서는 힐링을 사용합니다."),
  "Rapi: Red Hood": make("bastion", ["resilience", "destruction"], "높은 장탄 수와 기관총 지속 화력을 살리는 탄환 환급이 우선입니다. 파츠가 오래 유지되는 보스에서는 디스트로이를 비교합니다.", "보스", "guide"),
  "Little Mermaid": make("resilience", ["bastion", "vigor"], "지원 비중이 큰 기관총이라 범용 재장전을 우선합니다. 장탄 OL과 고레벨 택티컬 베어가 있으면 탄환 환급을 비교합니다."),
  EVE: make("bastion", ["resilience", "wingman"], "기관총 사격을 끊지 않는 탄환 환급이 가장 안정적입니다. 큐브 레벨과 장탄 세팅에 따라 렐릭 베어를 비교합니다.", "보스", "guide"),
  "Privaty: Unkind Maid": make("bastion", ["resilience", "wingman"], "버스트 중 탄창을 유지해야 하므로 탄환 환급을 우선합니다. 장탄 OL이 부족하면 택티컬 부스트를 사용합니다.", "보스", "guide"),
  Grave: make("bastion", ["destruction", "assault", "piercing"], "특정 절대 1순위는 없지만 고레벨 택티컬 베어가 가장 무난합니다. 느린 팀에서 재장전 큐브는 버프를 일찍 끝낼 수 있어 주의합니다.", "보스", "guide"),
  "Cinderella: Crystal Wave": make("resilience", ["bastion", "destruction", "piercing"], "재장전 팀·SR 운용은 렐릭 베어, 외부 MG 운용은 택티컬 베어를 비교합니다. 노출 파츠는 디스트로이, 관통 구간은 피어싱이 유효합니다.", "보스", "guide"),
  "Dorothy: Serendipity": make("bastion", ["resilience", "destruction"], "산탄 지속 화력과 장탄 세팅을 살리는 탄환 환급이 우선입니다. 파츠가 오래 남는 보스에서는 디스트로이를 비교합니다.", "보스", "guide"),
  "Guillotine: Winter Slayer": make("bastion", ["resilience", "wingman", "destruction"], "기관총의 사격 유지가 핵심입니다. 장탄이 부족하면 부스트, 파츠 보스에서는 디스트로이를 비교합니다.", "보스"),
  Ade: make("bastion", ["resilience"], "장탄 지원과 자동 사격 흐름을 유지하는 택티컬 베어가 무난합니다. 큐브 레벨이 낮으면 렐릭 베어를 사용합니다."),
  "Anis: Star": make("resilience", ["bastion", "destruction", "wingman"], "재장전 공백을 줄이는 선택이 기본입니다. 장탄 OL 전에는 고레벨 택티컬 부스트, 파츠 보스에서는 디스트로이를 비교합니다.", "보스", "guide"),

  "2B": make("vigor", ["resilience", "tempering"], "최대 HP를 공격력으로 전환하므로 비거가 직접적인 화력 증가가 됩니다. PvP 생존이 더 중요하면 템퍼링을 비교합니다.", "PvE/PvP", "guide"),
  Kilo: make("vigor", ["tempering", "resilience"], "최대 HP 기반 보호막과 버스트 피해를 함께 올리는 비거가 기믹에 가장 잘 맞습니다.", "PvE/PvP", "guide"),
  "Laplace: Ultimate Hero": make("vigor", ["resilience", "piercing"], "최대 HP 기반 기믹을 직접 강화하는 비거를 우선합니다. 관통이 유효한 보스에서는 피어싱을 비교합니다.", "보스", "guide"),
  Cinderella: make("resilience", ["bastion", "vigor"], "자가 HP·공격력 버프로 비거 효율이 희석되어 재장전 큐브가 더 안정적입니다. 팀과 큐브 레벨에 따라 택티컬 베어를 비교합니다.", "보스", "guide"),
  "Maiden: Ice Rose": make("resilience", ["bastion", "vigor"], "HP 스케일만 보기보다 사격 업타임을 높이는 재장전 큐브가 우선입니다. reload 버퍼가 없다면 택티컬 베어도 비슷합니다.", "보스", "guide"),
  "Alice: Wonderland Bunny": make("vigor", ["healing", "tempering"], "최대 HP 기반 회복과 생존 기믹을 강화합니다. 순수 회복량만 필요하면 힐링을 비교합니다."),
  Blanc: make("vigor", ["healing", "tempering"], "최대 HP 기반 보호와 회복을 함께 강화합니다. PvP에서 직접 피해 감소가 필요하면 템퍼링을 사용합니다."),
  Noise: make("vigor", ["healing", "tempering"], "최대 HP 기반 회복과 도발 탱킹을 동시에 강화합니다. PvP 집중 공격에는 템퍼링도 유효합니다.", "PvE/PvP", "guide"),
  Quiry: make("vigor", ["healing", "resilience"], "최대 HP 기반 지원 효과를 직접 강화합니다. 회복량만 필요하면 힐링을 비교합니다."),
  Sora: make("vigor", ["healing", "tempering"], "최대 HP 기반 지원과 생존을 강화합니다. 회복량 또는 PvP 피해 감소가 더 필요하면 대안을 사용합니다."),
  "Claire Redfield": make("healing", ["vigor", "resilience"], "주는 회복량을 직접 높이는 힐링 큐브가 우선입니다. 생존이 부족하면 비거를 사용합니다.", "PvE", "guide"),
  Emma: make("healing", ["vigor", "resilience"], "순수 회복 성능을 올리는 힐링 큐브를 우선합니다. 최대 HP와 생존이 더 필요하면 비거를 사용합니다."),
  Frima: make("healing", ["vigor", "resilience"], "회복량을 직접 높이는 힐링 큐브가 가장 목적에 맞습니다. 비거는 생존 대안입니다."),
  Mary: make("healing", ["vigor", "resilience"], "힐러 역할을 강화하는 주는 회복량 증가가 우선입니다. 최대 HP가 더 필요하면 비거를 사용합니다."),
  "Mary: Bay Goddess": make("healing", ["vigor", "resilience"], "팀 회복량을 직접 높이는 힐링 큐브가 우선입니다. 생존이 부족할 때 비거를 사용합니다."),
  Rapunzel: make("healing", ["vigor", "resilience"], "회복과 부활 지원 역할을 위해 힐링 큐브를 우선합니다. 최대 HP가 더 필요하면 비거를 비교합니다."),
  "Rapunzel: Pure Grace": make("healing", ["vigor", "resilience"], "주는 회복량을 직접 강화합니다. 전투력·생존이 더 필요하면 비거를 사용합니다."),
  Naga: make("resilience", ["healing", "vigor"], "사격 횟수 기반 회복과 코어 지원 회전을 위해 재장전 속도를 우선합니다. 순수 회복이 필요하면 힐링을 사용합니다."),
  Soda: make("resilience", ["healing", "vigor"], "사격 횟수 기반 스택과 회복을 더 자주 발동시키도록 재장전 속도를 사용합니다."),

  "Red Hood": make("piercing", ["resilience", "destruction"], "관통 사격과 버스트 피해를 직접 강화하는 피어싱이 보스전 1순위입니다. 파츠가 많은 보스는 디스트로이를 비교합니다.", "보스", "guide"),
  "Snow White": make("piercing", ["adjutant", "onslaught", "destruction"], "관통 버스트 피해를 직접 강화합니다. 짧은 버프 창에 맞춰야 할 때만 부스트 큐브로 차지 시간을 조정합니다.", "보스", "guide"),
  Maxwell: make("piercing", ["resilience", "onslaught"], "관통 버스트 피해를 직접 강화하는 피어싱이 우선입니다. 일반 사격 업타임은 렐릭 베어를 비교합니다.", "보스", "guide"),
  "Asuka Shikinami Langley": make("piercing", ["bastion", "resilience", "destruction"], "관통 피해가 유효한 보스에서 피어싱을 우선합니다. 장탄 OL과 파츠 구성에 따라 범용 큐브를 비교합니다.", "보스", "guide"),
  "Snow White: Heavy Arms": make("piercing", ["resilience", "destruction"], "관통 공격 비중을 직접 강화합니다. 파츠가 오래 유지되면 디스트로이도 유효합니다.", "보스", "guide"),
  Alice: make("resilience", ["piercing", "adjutant", "destruction"], "일반적으로 재장전 속도가 가장 안정적입니다. 차지 속도 임계가 부족하면 부스트, 관통이 유효하면 피어싱을 사용합니다.", "보스", "guide"),
  Harran: make("resilience", ["piercing", "adjutant"], "범용 재장전이 우선이며 관통이 실제로 겹치는 전투에서만 피어싱을 비교합니다."),
  Nihilister: make("resilience", ["piercing", "adjutant"], "범용 사격 업타임을 우선합니다. 관통이 유효한 보스에서는 피어싱을 비교합니다."),
  Laplace: make("resilience", ["crush", "piercing", "destruction"], "재장전 속도가 가장 범용적입니다. 방어력 무시·관통·파츠 피해가 실제로 유효한 보스에서만 전문 큐브를 선택합니다.", "보스"),

  "Takina Inoue": make("crush", ["resilience"], "방어력 무시 대미지 태그를 직접 강화하는 크러쉬 큐브가 가장 잘 맞습니다.", "보스", "guide"),
  Ein: make("crush", ["resilience", "destruction"], "방어력 무시 피해 비중을 직접 높입니다. 전문 큐브 레벨이 낮으면 렐릭 베어를 사용합니다.", "보스", "guide"),
  "Chisato Nishikigi": make("resilience", ["bastion", "crush"], "사격 업타임을 우선하고 방어력 무시 피해 비중이 중요한 전투에서만 크러쉬를 비교합니다.", "보스", "guide"),
  "Ada Wong": make("resilience", ["crush", "adjutant"], "범용 재장전이 우선입니다. 방어력 무시 피해 비중 또는 차지 임계가 중요할 때 전문 큐브를 사용합니다."),
  Velvet: make("resilience", ["wingman", "crush"], "범용 재장전이 가장 안정적입니다. 장탄 또는 방어력 무시 기믹이 더 중요한 전투에서 대안을 사용합니다."),

  "Scarlet: Black Shadow": make("resilience", ["divide", "bastion", "adjutant"], "재장전 속도가 기본이며 분배 대미지 태그가 적용되는 보스에서 신규 디바이드 큐브를 비교합니다.", "보스", "guide"),
  Phantom: make("resilience", ["divide", "bastion", "destruction"], "범용 재장전을 우선합니다. 분배 피해나 파츠가 실제로 유효한 보스에서만 전문 큐브를 사용합니다."),
  "Delta: Ninja Thief": make("resilience", ["bastion", "divide"], "재장전 속도를 우선하고 분배 대미지 태그가 유효한 전투에서만 디바이드를 비교합니다."),
  Bready: make("resilience", ["divide", "bastion"], "범용 재장전이 우선입니다. 분배 대미지 태그가 적용되는 보스에서 디바이드 큐브를 비교합니다."),
  "Milk: Blooming Bunny": make("resilience", ["divide", "bastion"], "재장전 공백을 줄이는 선택이 기본입니다. 분배 대미지 비중이 높은 전투에서 디바이드를 비교합니다."),
  "Quency: Escape Queen": make("resilience", ["divide", "bastion"], "범용 재장전이 우선입니다. 분배 대미지 태그가 실제로 적용되는 전투에서 디바이드를 사용합니다."),
  Trony: make("resilience", ["divide", "bastion"], "범용 재장전을 우선하며 분배 대미지 보정이 유효한 전투에서 디바이드를 비교합니다."),
  Elegg: make("bastion", ["resilience", "divide"], "기관총 사격 유지가 우선입니다. 분배 대미지 태그 비중이 높은 전투에서 디바이드를 비교합니다."),
  "Queen (Makoto Niijima)": make("resilience", ["divide", "wingman"], "출시일 개별 가이드 기준 재장전 속도가 1순위입니다. 분배 대미지 강화 또는 장탄 보완이 필요할 때 대안을 사용합니다.", "보스", "guide"),
  "Yukiko Amagi": make("resilience", ["divide", "bastion"], "출시일 개별 가이드 기준 재장전 속도가 1순위입니다. 분배 피해 비중과 장탄 OL에 따라 디바이드·택티컬 베어를 비교합니다.", "보스", "guide"),
  Aigis: make("resilience", ["wingman", "bastion"], "지원형 SR이라 고투자보다 보유한 고레벨 큐브를 우선합니다. 개별 가이드 기준 재장전, 장탄, 탄환 환급 순입니다.", "범용", "guide"),

  Jackal: make("quantum", ["adjutant", "tempering", "vigor"], "PvP에서 실제 버스트 발동 프레임이 빨라질 때만 퀀텀을 사용합니다. 브레이크포인트가 같다면 생존 큐브가 낫습니다.", "PvP", "guide"),
  Centi: make("quantum", ["adjutant", "resilience", "tempering"], "PvP 버스트 브레이크포인트를 실제로 한 단계 앞당길 때만 퀀텀이 1순위입니다.", "PvP", "guide"),
  Anis: make("quantum", ["adjutant", "tempering"], "PvP에서 버스트 발동 프레임을 줄일 수 있을 때만 퀀텀을 사용합니다. 차이가 없으면 생존 큐브를 선택합니다.", "PvP"),
  Rumani: make("quantum", ["adjutant", "vigor", "tempering"], "PvP 버스트 브레이크포인트를 앞당길 때 퀀텀을 사용합니다. 그렇지 않으면 HP·피해 감소를 우선합니다.", "PvP"),
  Noah: make("quantum", ["tempering", "vigor", "adjutant"], "무적 버스트를 먼저 켜는 프레임 차이가 생길 때만 퀀텀을 사용합니다. 그 외에는 생존 큐브가 더 안정적입니다.", "PvP", "guide"),
  Emilia: make("adjutant", ["quantum", "resilience", "tempering"], "PvP 차지·버스트 수급 임계에 맞추는 부스트 큐브가 우선입니다. 퀀텀은 실제 버스트 프레임 단축을 확인한 경우에만 사용합니다.", "PvP", "guide"),
  Pascal: make("quantum", ["wingman", "resilience"], "PvP에서 버스트 브레이크포인트가 줄어드는 경우에만 퀀텀을 사용합니다. 차이가 없으면 장탄·재장전 큐브를 사용합니다.", "PvP"),
  Moran: make("tempering", ["vigor", "endurance"], "PvP 도발 탱킹에서 받는 대미지 감소를 우선합니다. HP나 방어력 큐브는 보유 레벨에 따라 비교합니다.", "PvP", "guide"),
  Nero: make("tempering", ["vigor", "endurance"], "PvP 집중 공격을 버티기 위해 받는 대미지 감소를 우선합니다.", "PvP"),
  Makima: make("tempering", ["vigor", "endurance"], "PvP 생존 시간을 늘리는 템퍼링이 역할에 가장 잘 맞습니다.", "PvP"),
  Bay: make("tempering", ["vigor", "endurance", "cover"], "PvP 피해 분담과 생존을 위해 템퍼링을 우선합니다. 엄폐물 유지가 승패를 가르는 전투에서만 커버를 사용합니다.", "PvP", "guide"),
  Tia: make("tempering", ["vigor", "endurance"], "도발과 보호막 운용에서 받는 대미지 감소가 가장 안정적입니다.", "PvP"),

  "Asuka: WILLE": make("bastion", ["resilience", "destruction"], "기관총 사격을 유지하는 탄환 환급이 우선입니다. 파츠가 오래 유지되는 보스에서만 디스트로이를 비교합니다.", "보스"),
  Nayuta: make("resilience", ["destruction", "adjutant"], "범용 재장전을 우선하고 파츠가 오래 노출되는 보스에서만 디스트로이를 사용합니다.", "보스"),
  "Sakura: Bloom in Summer": make("resilience", ["bastion", "destruction"], "범용 재장전이 우선입니다. 장탄 OL이 충분하거나 파츠가 오래 유지될 때 대안을 비교합니다.", "보스"),
};

const rosterNames = new Set(roster.map(({ name }) => name));
for (const name of Object.keys(overrides)) {
  if (!rosterNames.has(name)) throw new Error(`${name}: cube override does not match the roster.`);
}

const recommendations = roster.map((nikke) => {
  const recommendation = overrides[nikke.name] ?? defaultRecommendations[nikke.weapon];
  if (!recommendation) throw new Error(`${nikke.name}: no cube rule for ${nikke.weapon}.`);
  const alternatives = [...new Set(recommendation.alternatives)]
    .filter((cubeId) => cubeId !== recommendation.primary);
  return { name: nikke.name, ...recommendation, alternatives };
});

if (recommendations.length !== roster.length) {
  throw new Error("Every roster entry must have exactly one cube recommendation.");
}
if (new Set(recommendations.map(({ name }) => name)).size !== roster.length) {
  throw new Error("Cube recommendation names must be unique.");
}
for (const recommendation of recommendations) {
  if (!validCubeIds.has(recommendation.primary)) {
    throw new Error(`${recommendation.name}: invalid primary cube ${recommendation.primary}.`);
  }
  if (recommendation.alternatives.some((cubeId) => !validCubeIds.has(cubeId))) {
    throw new Error(`${recommendation.name}: invalid alternative cube.`);
  }
  if (!recommendation.note || !recommendation.mode) {
    throw new Error(`${recommendation.name}: missing cube explanation.`);
  }
}

await writeFile(outputPath, `${JSON.stringify(recommendations)}\n`, "utf8");
console.log(`Cube recommendations: ${recommendations.length}/${roster.length}`);
console.log(`Named cube overrides: ${Object.keys(overrides).length}`);
