import { readFile, writeFile } from "node:fs/promises";

const rosterPath = new URL("../app/roster.json", import.meta.url);
const outputPath = new URL("../app/overloads.json", import.meta.url);
const roster = JSON.parse((await readFile(rosterPath, "utf8")).replace(/^\uFEFF/, ""));

const line = (stat, count, grade = "ideal") => ({ stat, count, grade });
const validStats = new Set([
  "attack", "element", "maxAmmo", "chargeSpeed", "chargeDamage",
  "hitRate", "critRate", "critDamage", "defense",
]);
const validGrades = new Set(["essential", "ideal", "filler"]);
const make = ({
  primary,
  alternatives = [],
  avoid = [],
  priority = "low",
  mode = "PvE",
  note,
  confidence = "mechanic",
}) => ({ primary, alternatives, avoid, priority, mode, note, confidence });

const unique = (values) => [...new Set(values)];

function normalizeBuild(build) {
  const avoid = unique(build.avoid);
  const excludedAlternatives = new Set([
    ...build.primary.map(({ stat }) => stat),
    ...avoid,
  ]);
  const alternatives = unique(build.alternatives)
    .filter((stat) => !excludedAlternatives.has(stat));

  return { ...build, alternatives, avoid };
}

const profiles = {
  ar: make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["critRate", "critDamage", "hitRate"],
    note: "지속 화력형 기본안. 우월 코드와 공격력을 먼저 확보하고 장탄 수로 재장전 손실을 줄입니다.",
  }),
  mg: make({
    primary: [line("element", 4), line("maxAmmo", 4), line("attack", 4)],
    alternatives: ["critRate", "critDamage", "hitRate"],
    note: "기관총 지속 사격 기본안. 우월 코드·장탄 수·공격력의 3유효를 목표로 합니다.",
  }),
  shotgun: make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["critRate", "critDamage", "hitRate"],
    note: "산탄 화력 기본안. 우월 코드와 공격력이 핵심이고 장탄 수는 재장전 공백을 줄여 줍니다.",
  }),
  charge: make({
    primary: [line("element", 4), line("attack", 4), line("chargeSpeed", 2)],
    alternatives: ["chargeDamage", "maxAmmo", "critDamage"],
    note: "차지 딜러 기본안. 우월 코드·공격력을 우선하고 필요한 차지 속도 임계만 맞춥니다.",
  }),
  utilityCharge: make({
    primary: [line("chargeSpeed", 1, "filler"), line("attack", 1, "filler"), line("element", 1, "filler")],
    alternatives: ["element", "chargeDamage", "defense"],
    priority: "skip",
    note: "지원·방어 목적이라 옵션 재설정 효율이 낮습니다. 표의 1줄은 붙으면 유지하는 후보이며, 4부위 개조와 장비 레벨만 먼저 확보하세요.",
  }),
  utilityAuto: make({
    primary: [line("attack", 1, "filler"), line("maxAmmo", 1, "filler"), line("element", 1, "filler")],
    alternatives: ["hitRate", "critRate", "defense"],
    priority: "skip",
    note: "지원·방어 목적이라 옵션 재설정 효율이 낮습니다. 표의 1줄은 붙으면 유지하는 후보이며, 좋은 줄이 자연스럽게 붙을 때만 유지하세요.",
  }),
};

const skipInvestment = new Set([
  "Ade", "Admi", "Anchor", "Anne: Miracle Fairy", "Avistar", "Belorta", "Biscuit",
  "Blanc", "Centi", "Clay", "Cocoa", "Crow", "Crust", "D", "Delta", "Dolla",
  "Emma", "Ether", "Exia", "Folkwang", "Frima", "Himeno", "IDoll Flower",
  "IDoll Ocean", "IDoll Sun", "Julia", "Kurumi", "Lily", "Liter", "Ludmilla",
  "Makima", "Mary", "Mary: Bay Goddess", "Mica", "Mica: Snow Buddy", "Milk",
  "Miranda", "Misato Katsuragi", "N102", "Neon", "Novel", "Pascal", "Poli",
  "Product 08", "Product 12", "Product 23", "Quency", "Quiry", "Ram", "Rapi",
  "Rapunzel", "Rei", "Rupee: Winter Shopper", "Signal", "Sin", "Soldier EG",
  "Soldier FA", "Soldier OW", "Soline", "Sora", "Volume", "Yan", "Yulha", "Yuni",
]);

function defaultProfile(nikke) {
  if (skipInvestment.has(nikke.name)) {
    return nikke.weapon === "RL" || nikke.weapon === "SR"
      ? profiles.utilityCharge
      : profiles.utilityAuto;
  }
  if (nikke.class !== "attacker") {
    return nikke.weapon === "RL" || nikke.weapon === "SR"
      ? { ...profiles.utilityCharge, priority: "low" }
      : { ...profiles.utilityAuto, priority: "low" };
  }
  if (nikke.weapon === "MG") return profiles.mg;
  if (nikke.weapon === "SR" || nikke.weapon === "RL") return profiles.charge;
  if (nikke.weapon === "SG") return profiles.shotgun;
  return profiles.ar;
}

const overrides = {
  "Ark Ranger Black": make({
    primary: [line("element", 4), line("critDamage", 4), line("attack", 4)],
    alternatives: ["critRate", "maxAmmo"], priority: "medium", mode: "보스",
    note: "우월 코드와 크리 대미지 연동을 우선하고 공격력을 채웁니다. 장탄 수는 남는 유효 줄로 봅니다.", confidence: "guide",
  }),
  "2B": make({
    primary: [line("element", 4, "essential"), line("critDamage", 4), line("critRate", 4)],
    alternatives: ["attack"], priority: "low", mode: "보스",
    note: "최대 HP 기반 공격력 전환으로 공격력 옵션이 희석됩니다. 우월 코드와 크리티컬 계열을 우선합니다.", confidence: "guide",
  }),
  "A2": make({
    primary: [line("element", 4), line("attack", 4), line("chargeSpeed", 4)],
    alternatives: ["maxAmmo", "chargeDamage"], priority: "low", mode: "보스/PvP",
    note: "부위가 많은 보스용. 우월 코드·공격력 뒤 차지 속도를 확보하고 장탄 수는 1~2줄만 사용합니다.", confidence: "guide",
  }),
  "Aigis": make({
    primary: [line("attack", 1, "filler"), line("maxAmmo", 1, "filler"), line("element", 1, "filler")],
    alternatives: ["hitRate", "critRate", "defense"], priority: "skip", mode: "범용",
    note: "지원형 SR이라 4부위 개조와 자연스럽게 붙은 유효 줄만 사용합니다. 커스텀 모듈을 써서 재설정하는 것은 권장하지 않습니다.", confidence: "recent-kit",
  }),
  "Queen (Makoto Niijima)": make({
    primary: [line("element", 4, "essential"), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["critRate", "critDamage", "hitRate"], priority: "medium", mode: "보스",
    note: "작열 약점 보스에서 우월 코드와 공격력을 우선하고, 장탄 수 1~2줄로 샷건 재장전 공백을 줄입니다. 출시 직후 키트 기준 임시 권장안입니다.", confidence: "recent-kit",
  }),
  "Yukiko Amagi": make({
    primary: [line("element", 4, "essential"), line("maxAmmo", 4), line("attack", 4)],
    alternatives: ["critRate", "critDamage"], priority: "medium", mode: "보스",
    note: "작열 약점 보스에서 우월 코드·장탄 수·공격력의 3유효를 목표로 기관총 사격과 분배 피해를 유지합니다. 출시 직후 키트 기준 임시 권장안입니다.", confidence: "recent-kit",
  }),
  "Ada Wong": make({
    primary: [line("element", 4), line("maxAmmo", 2), line("attack", 4)],
    alternatives: ["critDamage", "chargeSpeed"], priority: "medium", mode: "보스",
    note: "전격 약점 보스용. 우월 코드 4줄을 우선하고 1~2 장탄 수로 공격 주기를 안정화합니다.", confidence: "guide",
  }),
  "Alice": make({
    primary: [line("chargeSpeed", 2, "essential"), line("element", 4), line("maxAmmo", 3)],
    alternatives: ["attack", "chargeDamage"], priority: "high", mode: "보스",
    note: "스킬·큐브·팀 버프를 포함한 총 차지 속도 99% 초과를 먼저 맞추고, 장탄 수 2~3줄과 우월 코드를 확보합니다.", confidence: "guide",
  }),
  "Anis: Sparkling Summer": make({
    primary: [line("element", 4, "essential"), line("attack", 4), line("critDamage", 4)],
    alternatives: ["critRate"], avoid: ["maxAmmo"], priority: "high", mode: "보스",
    note: "마지막 탄환 기믹 때문에 장탄 수를 피합니다. 우월 코드와 공격력, 크리티컬 대미지를 사용합니다.", confidence: "guide",
  }),
  "Anis: Star": make({
    primary: [line("element", 4, "essential"), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["critRate", "critDamage"], priority: "meta", mode: "보스",
    note: "우월 코드·공격력이 핵심입니다. 운용 단계와 팀에 따라 장탄 수 1~3줄을 조정합니다.", confidence: "guide",
  }),
  "Arcana: Fortune Mate": make({
    primary: [line("element", 4), line("attack", 4), line("critDamage", 2)],
    alternatives: ["critRate", "hitRate"], avoid: ["maxAmmo"], priority: "medium", mode: "보스",
    note: "산탄 보조 딜러용. 장탄 수는 필요하지 않아 피하고, 작열 약점 우월 코드와 공격력 뒤 크리 계열을 사용합니다.",
  }),
  "Asuka Shikinami Langley": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 4)],
    alternatives: ["critRate", "critDamage"], priority: "medium", mode: "보스",
    note: "AR 지속 딜러. 우월 코드와 공격력 이후 장탄 수로 버프 구간의 재장전을 최소화합니다.",
  }),
  "Asuka: WILLE": make({
    primary: [line("element", 4), line("maxAmmo", 3, "essential"), line("attack", 4)],
    alternatives: ["critRate", "critDamage"], priority: "medium", mode: "보스",
    note: "버스트 중 무재장전을 위해 큐브까지 포함한 총 장탄 증가 약 165~191%를 맞추고 우월 코드·공격력을 채웁니다.",
  }),
  "Bready": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 1)],
    alternatives: ["chargeSpeed", "critDamage"], priority: "medium", mode: "보스",
    note: "수냉 차지 딜러. 우월 코드와 공격력 뒤 장탄 수 1줄을 확보하고 차지 속도는 유효 줄로 유지합니다.",
  }),
  "Cinderella": make({
    primary: [line("element", 4, "essential"), line("attack", 4), line("maxAmmo", 1)],
    alternatives: ["critRate", "critDamage"], priority: "meta", mode: "보스",
    note: "최대 HP 기반 화력형. 우월 코드·공격력 뒤 장탄 수 1줄을 사용합니다. HP는 부츠를 포함한 4부위 장비 레벨로 올립니다.", confidence: "guide",
  }),
  "Cinderella: Crystal Wave": make({
    primary: [line("element", 4, "essential"), line("attack", 4), line("maxAmmo", 3)],
    alternatives: ["critRate", "critDamage"], priority: "meta", mode: "보스",
    note: "고정 차지라 차지 속도는 제외합니다. SR 15 인형 포함 총 장탄 증가 약 188%를 목표로 우월 코드·공격력·장탄 수를 맞춥니다.", confidence: "guide",
  }),
  "Crown": make({
    primary: [line("maxAmmo", 3), line("attack", 4), line("element", 4)],
    alternatives: ["hitRate", "defense"], priority: "medium", mode: "범용",
    note: "핵심은 장비 레벨과 전투력입니다. 장탄 수는 기관총 유지력, 공격력·우월 코드는 보조 피해에 사용합니다.",
  }),
  "D: Killer Wife": make({
    primary: [line("maxAmmo", 1, "essential"), line("chargeSpeed", 2), line("attack", 4)],
    alternatives: ["element"], priority: "medium", mode: "범용",
    note: "쿨다운 감소 발동과 버스트 수급을 안정시키는 장탄 수 1줄이 핵심입니다. 이후 재설정은 우선순위가 낮습니다.", confidence: "guide",
  }),
  "Diesel": make({
    primary: [line("maxAmmo", 4, "essential"), line("attack", 4), line("element", 4)],
    alternatives: ["hitRate"], priority: "low", mode: "보스",
    note: "기관총 팀 탄약 버퍼로 사용할 때 장탄 수 3~4줄이 목적입니다. 이 역할이 아니면 재설정하지 않습니다.", confidence: "guide",
  }),
  "Dorothy": make({
    primary: [line("attack", 4), line("element", 4), line("critDamage", 4)],
    alternatives: ["critRate", "hitRate"], avoid: ["maxAmmo"], priority: "high", mode: "보스",
    note: "마지막 탄환 스킬 회전을 위해 장탄 수를 피합니다. 공격력은 분배 대미지와 스킬 피해를 직접 높입니다.", confidence: "guide",
  }),
  "Dorothy: Serendipity": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["critDamage", "critRate"], priority: "high", mode: "보스",
    note: "수냉 산탄 메인 딜러. 우월 코드·공격력 뒤 적정 장탄 수로 버스트 구간을 안정화합니다.",
  }),
  "Ein": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 3)],
    alternatives: ["chargeSpeed", "critDamage"], priority: "high", mode: "보스",
    note: "전격 차지 딜러. 우월 코드·공격력을 먼저 확보하고 장탄 수 2~3줄로 공격 흐름을 안정화합니다.",
  }),
  "Elegg": make({
    primary: [line("maxAmmo", 2), line("attack", 4), line("element", 4)],
    alternatives: ["hitRate"], priority: "low", mode: "보스",
    note: "지원 역할은 장비 레벨이 우선입니다. 개인 피해까지 볼 때만 장탄 수·공격력·우월 코드를 유지합니다.",
  }),
  "Elegg: Boom and Shock": make({
    primary: [line("element", 4), line("maxAmmo", 1), line("attack", 4)],
    alternatives: ["critRate", "critDamage"], priority: "high", mode: "보스",
    note: "수냉 기관총 딜러. 우월 코드와 공격력이 핵심이며 장탄 수는 1줄만 확보하고 크리 계열을 유효 줄로 봅니다.",
  }),
  "Emilia": make({
    primary: [line("chargeSpeed", 4, "essential"), line("element", 4), line("attack", 4)],
    alternatives: ["chargeDamage", "maxAmmo"], priority: "high", mode: "PvP/보스",
    note: "S1과 OL을 합한 차지 속도 21% 초과 임계가 핵심입니다. 임계 달성 뒤 우월 코드·공격력을 확보합니다.", confidence: "guide",
  }),
  "EVE": make({
    primary: [line("element", 4), line("attack", 4), line("critDamage", 4)],
    alternatives: ["critRate", "maxAmmo"], priority: "high", mode: "보스",
    note: "철갑 AR 메인 딜러. 우월 코드·공격력·크리 대미지를 우선하고 장탄 수는 유효 줄로만 봅니다.",
  }),
  "Grave": make({
    primary: [line("element", 4), line("attack", 4), line("critDamage", 4)],
    alternatives: ["hitRate", "chargeSpeed"], avoid: ["maxAmmo", "critRate"], priority: "medium", mode: "보스",
    note: "강제 재장전과 버스트 무한 탄 때문에 장탄 수가 불필요합니다. 버스트 확정 크리라 크리 확률도 피하고 크리 대미지를 사용합니다.",
  }),
  "Jill Valentine": make({
    primary: [line("element", 4), line("attack", 4), line("critDamage", 3)],
    alternatives: ["critRate", "hitRate"], avoid: ["maxAmmo"], priority: "medium", mode: "자동 PvE",
    note: "자동 전투에서는 장탄 수가 재장전 흐름을 망칠 수 있어 피합니다. 수동 운용은 사이클에 따라 장탄 수를 별도로 검증하세요.", confidence: "guide",
  }),
  "K": make({
    primary: [line("element", 4), line("attack", 4), line("critDamage", 4)],
    alternatives: ["critRate", "hitRate"], avoid: ["maxAmmo"], priority: "low", mode: "PvE",
    note: "마지막 탄환 스택과 탄창 감소 기믹 때문에 장탄 수를 피합니다. 개인 피해용으로 우월 코드·공격력·크리 대미지를 사용합니다.", confidence: "guide",
  }),
  "Kilo": make({
    primary: [line("element", 4), line("critRate", 4), line("critDamage", 4)],
    alternatives: ["attack", "maxAmmo"], priority: "low", mode: "보스",
    note: "최대 HP 기반 버스트라 OL 공격력 효율이 낮습니다. HP는 장비 레벨로 올리고 우월 코드와 크리 계열을 사용합니다.", confidence: "guide",
  }),
  "Guillotine": make({
    primary: [line("element", 4), line("maxAmmo", 4), line("attack", 4)],
    alternatives: ["critRate", "critDamage"], priority: "medium", mode: "보스",
    note: "전격 기관총 딜러. 장탄 수로 저체력 버프 구간의 사격 시간을 늘리고 우월 코드·공격력을 더합니다.",
  }),
  "Helm": make({
    primary: [line("element", 4), line("attack", 4), line("chargeSpeed", 2)],
    alternatives: ["maxAmmo", "critDamage"], priority: "low", mode: "수동 보스",
    note: "힐러 겸 서브 딜러. 수동 퀵스코프에서는 장탄 수 1줄도 쓸 수 있지만, 자동 운용에서는 마지막 탄환 발동이 늦어지므로 피하거나 제한합니다.",
  }),
  "Eunhwa: Tactical Upgrade": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["chargeSpeed", "critDamage"], priority: "medium", mode: "보스",
    note: "우월 코드와 공격력을 우선하고 장탄 수 2줄로 버스트 전후 사격 흐름을 안정화합니다.", confidence: "guide",
  }),
  "Isabel": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["critRate", "critDamage"], priority: "low", mode: "보스",
    note: "짧은 풀버스트 산탄 조합에서만 투자합니다. 우월 코드·공격력·장탄 수 순입니다.",
  }),
  "Laplace": make({
    primary: [line("element", 4), line("attack", 4), line("chargeSpeed", 4)],
    alternatives: ["maxAmmo", "chargeDamage"], priority: "medium", mode: "PvP/보스",
    note: "보물 포함 차지 딜러. 우월 코드·공격력 뒤 차지 속도를 확보하고 장탄 수는 최대 1~2줄만 사용합니다.", confidence: "guide",
  }),
  "Laplace: Ultimate Hero": make({
    primary: [line("maxAmmo", 4, "essential"), line("element", 4), line("attack", 4)],
    alternatives: ["chargeSpeed", "critDamage"], priority: "high", mode: "보스",
    note: "변환 무기의 120발 구간을 늘리는 장탄 수가 핵심입니다. 우월 코드·공격력을 더하고 다리 장비 레벨로 HP를 확보합니다.", confidence: "recent-guide",
  }),
  "Liberalio": make({
    primary: [line("element", 4, "essential"), line("attack", 4), line("maxAmmo", 1)],
    alternatives: ["chargeSpeed", "critDamage"], priority: "meta", mode: "보스",
    note: "우월 코드와 공격력 2유효가 핵심입니다. 장탄 수는 1줄만, 나머지는 차지 속도·크리 대미지로 보완합니다.", confidence: "guide",
  }),
  "Little Mermaid": make({
    primary: [line("attack", 4), line("element", 4), line("maxAmmo", 2)],
    alternatives: ["hitRate", "critRate"], priority: "medium", mode: "보스",
    note: "핵심 지원은 스킬 레벨에서 나옵니다. 개인 피해와 전투력을 볼 때만 공격력·우월 코드·장탄 수를 유지합니다.",
  }),
  "Ludmilla: Winter Owner": make({
    primary: [line("maxAmmo", 2, "essential"), line("element", 4), line("attack", 4)],
    alternatives: ["critRate", "critDamage"], priority: "high", mode: "보스",
    note: "전체 장탄 증가량 약 120% 이상을 목표로 2줄을 우선합니다. 이후 우월 코드·공격력을 채웁니다.", confidence: "guide",
  }),
  "Maiden": make({
    primary: [line("attack", 4), line("element", 4), line("maxAmmo", 2)],
    alternatives: ["critRate", "critDamage"], priority: "low", mode: "PvP",
    note: "광역 버스트 피해용 공격력·우월 코드가 핵심입니다. 장탄 수는 산탄 운용 보조입니다.", confidence: "guide",
  }),
  "Maiden: Ice Rose": make({
    primary: [line("attack", 4), line("element", 4), line("maxAmmo", 4)],
    alternatives: ["critRate", "critDamage"], priority: "low", mode: "보스",
    note: "시전자 공격력 버프와 개인 피해를 함께 높이기 위해 공격력·우월 코드·장탄 수를 사용합니다.", confidence: "guide",
  }),
  "Marciana: Marine Study": make({
    primary: [line("element", 4), line("attack", 4), line("critDamage", 4)],
    alternatives: ["hitRate", "maxAmmo"], avoid: ["critRate"], priority: "high", mode: "보스",
    note: "보장 크리 조합에서는 크리 확률이 무의미합니다. 우월 코드·공격력·크리 대미지를 사용합니다.", confidence: "guide",
  }),
  "Milk: Blooming Bunny": make({
    primary: [line("maxAmmo", 4, "essential"), line("element", 4), line("attack", 4)],
    alternatives: ["chargeSpeed", "critDamage"], priority: "medium", mode: "보스",
    note: "버스트 구간의 사격 횟수를 유지하기 위한 장탄 수 4줄이 핵심입니다. 우월 코드와 공격력을 더합니다.", confidence: "guide",
  }),
  "Marciana": make({
    primary: [line("attack", 4), line("element", 4), line("critDamage", 4)],
    alternatives: ["critRate", "hitRate"], avoid: ["maxAmmo"], priority: "low", mode: "범용",
    note: "마지막 탄환 회복 주기를 늦추는 장탄 수는 피합니다. 장비 레벨 이후 공격력 위주로 유지합니다.",
  }),
  "Maxwell": make({
    primary: [line("element", 4), line("attack", 4), line("critDamage", 4)],
    alternatives: ["maxAmmo", "chargeSpeed"], priority: "high", mode: "보스",
    note: "큰 버스트 기본 계수에서 차지 대미지는 희석됩니다. 우월 코드·공격력·크리 대미지를 사용하고 장탄 수는 최대 2줄까지 유효합니다.", confidence: "guide",
  }),
  "Maxwell: Ordinary Mechanic": make({
    primary: [line("element", 4), line("maxAmmo", 1), line("attack", 4)],
    alternatives: ["chargeSpeed", "chargeDamage"], priority: "medium", mode: "보스",
    note: "지원 성능은 HP 장비 레벨이 우선입니다. 딜 빌드는 우월 코드·공격력과 장탄 수 1줄을 쓰며 고정 버스트 차지는 차지 속도로 줄지 않습니다.", confidence: "recent-kit",
  }),
  "Modernia": make({
    primary: [line("maxAmmo", 4, "essential"), line("element", 4), line("attack", 4)],
    alternatives: ["hitRate", "critRate", "critDamage"], priority: "meta", mode: "범용",
    note: "장탄 수로 고속 사격 구간을 최대화하고 우월 코드·공격력 4줄을 더합니다. 명중률은 레드 후드 단독 B1 캠페인 등 일부 조합에서만 고려합니다.", confidence: "guide",
  }),
  "Noise": make({
    primary: [line("chargeSpeed", 4, "essential"), line("defense", 2), line("attack", 1, "filler")],
    alternatives: ["element", "chargeDamage"], avoid: ["maxAmmo"], priority: "low", mode: "PvP",
    note: "첫 버스트 수급용 차지 속도가 핵심입니다. 장탄 수는 첫 탄 최대 HP·회복 갱신을 늦춰 PvP에서 피합니다.", confidence: "guide",
  }),
  "Naga": make({
    primary: [line("attack", 4), line("element", 4), line("maxAmmo", 2)],
    alternatives: ["hitRate", "critRate"], priority: "medium", mode: "범용",
    note: "회복과 보조 피해에 공격력이 유효합니다. 전투력 이후 우월 코드·장탄 수는 자연 롤만 유지합니다.",
  }),
  "Nayuta": make({
    primary: [line("element", 4), line("attack", 4), line("critRate", 4)],
    alternatives: ["critDamage", "chargeDamage"], priority: "high", mode: "보스",
    note: "지원형이지만 개인 피해가 높습니다. 우월 코드·공격력을 먼저, 크리티컬 계열을 보조로 사용합니다.", confidence: "guide",
  }),
  "Neon: Vision Eye": make({
    primary: [line("element", 4, "essential"), line("chargeSpeed", 4), line("attack", 3)],
    alternatives: ["maxAmmo"], priority: "meta", mode: "보스",
    note: "우월 코드와 차지 속도 4줄이 핵심입니다. 공격력 2~3줄 뒤 장탄 수 1~2줄을 운용에 맞춰 추가합니다.", confidence: "guide",
  }),
  "Nero": make({
    primary: [line("attack", 4), line("element", 4), line("defense", 4)],
    alternatives: ["maxAmmo"], priority: "low", mode: "PvP",
    note: "PvP 전투력·생존 보강용. 공격력과 우월 코드는 반격 피해, 방어력은 생존에 사용합니다.", confidence: "guide",
  }),
  "Nihilister": make({
    primary: [line("chargeSpeed", 4, "essential"), line("attack", 4), line("element", 4)],
    alternatives: ["chargeDamage"], priority: "low", mode: "PvP",
    note: "PvP 차지 속도 임계가 목적입니다. PvE 화력 투자는 우선순위가 낮습니다.", confidence: "guide",
  }),
  "Noah": make({
    primary: [line("chargeSpeed", 4, "essential"), line("attack", 4), line("element", 4)],
    alternatives: ["defense", "maxAmmo"], priority: "medium", mode: "PvP",
    note: "빠른 버스트 수급을 위한 차지 속도 4줄이 목적입니다. 나머지는 전투력용 자연 롤만 유지합니다.", confidence: "guide",
  }),
  "Noir": make({
    primary: [line("element", 4), line("maxAmmo", 3), line("attack", 4)],
    alternatives: ["critRate", "critDamage"], priority: "low", mode: "보스",
    note: "풍압 약점 산탄 조합의 서브 딜러용. 우월 코드 뒤 장탄 수 2~3줄, 공격력을 사용합니다.", confidence: "guide",
  }),
  "Pepper": make({
    primary: [line("attack", 4), line("element", 4), line("critDamage", 4)],
    alternatives: ["critRate", "hitRate"], avoid: ["maxAmmo"], priority: "low", mode: "범용",
    note: "마지막 탄환 회복을 자주 발동하려면 장탄 수를 피합니다. 공격력은 회복과 개인 피해 보조입니다.",
  }),
  "Phantom": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["critRate", "critDamage"], priority: "medium", mode: "보스",
    note: "수냉 AR 딜러. 우월 코드와 공격력 뒤 장탄 수로 사격 구간을 늘립니다.",
  }),
  "Power": make({
    primary: [line("element", 4), line("attack", 4), line("chargeSpeed", 4)],
    alternatives: ["chargeDamage", "maxAmmo"], priority: "low", mode: "보스",
    note: "우월 코드와 공격력 뒤 차지 속도로 공격 및 버스트 수급을 개선합니다. 차지 대미지는 남는 유효 줄입니다.",
  }),
  "Privaty": make({
    primary: [line("element", 1, "filler"), line("critDamage", 1, "filler"), line("hitRate", 1, "filler")],
    alternatives: ["critRate", "attack"], avoid: ["maxAmmo"], priority: "skip", mode: "범용",
    note: "기본형은 재설정 비추천입니다. 마지막 탄환을 늦추는 장탄 수를 피하고, 수영복 아니스와 함께 쓰면 공격력으로 최고 공격력 타게팅을 바꾸지 않도록 주의합니다.", confidence: "guide",
  }),
  "Privaty: Unkind Maid": make({
    primary: [line("maxAmmo", 4, "essential"), line("element", 4), line("attack", 4)],
    alternatives: ["hitRate", "critRate"], priority: "medium", mode: "보스",
    note: "풀버스트 중 재장전하면 스택이 초기화되므로 장탄 수 3~4줄이 핵심입니다. 우월 코드와 공격력을 함께 맞춥니다.", confidence: "guide",
  }),
  "Quency: Escape Queen": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["critRate", "critDamage"], priority: "high", mode: "보스",
    note: "수냉 SMG 메인 딜러. 우월 코드·공격력 4줄 뒤 장탄 수로 재장전을 줄입니다.",
  }),
  "Rapi: Red Hood": make({
    primary: [line("element", 4, "essential"), line("attack", 4), line("maxAmmo", 3)],
    alternatives: ["critRate", "critDamage"], priority: "meta", mode: "범용",
    note: "작열 기관총 메인 딜러. 우월 코드·공격력 4줄과 장탄 수 최소 3줄로 버스트 사격 구간을 안정화합니다.", confidence: "guide",
  }),
  "Red Hood": make({
    primary: [line("element", 4, "essential"), line("maxAmmo", 2), line("attack", 4)],
    alternatives: ["chargeSpeed", "chargeDamage"], priority: "meta", mode: "범용",
    note: "우월 코드와 공격력 4줄 뒤 장탄 수 1~2줄로 사격 흐름을 보완합니다. 차지 속도는 남는 유효 줄입니다.", confidence: "guide",
  }),
  "Rei Ayanami": make({
    primary: [line("element", 4), line("maxAmmo", 4), line("attack", 4)],
    alternatives: ["critRate", "critDamage"], priority: "medium", mode: "보스",
    note: "작열 기관총 딜러. 우월 코드·장탄 수·공격력 3유효를 목표로 합니다.",
  }),
  "Rem": make({
    primary: [line("maxAmmo", 4), line("attack", 4), line("element", 4)],
    alternatives: ["hitRate", "critRate"], priority: "medium", mode: "보스",
    note: "기관총 사격 유지와 공격력 기반 회복을 위해 장탄 수·공격력을 우선하고 수냉 약점에서 우월 코드를 더합니다.",
  }),
  "Rouge": make({
    primary: [line("maxAmmo", 1), line("chargeSpeed", 2), line("attack", 4)],
    alternatives: ["element", "chargeDamage"], priority: "medium", mode: "범용",
    note: "버스트 수급 안정용 장탄 수 1줄과 차지 속도가 실용적입니다. 지원 효과 자체는 재설정 의존도가 낮습니다.",
  }),
  "Sakura: Bloom in Summer": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["critRate", "critDamage"], priority: "high", mode: "보스",
    note: "풍압 AR 보스 딜러. 우월 코드와 공격력 4줄 뒤 장탄 수로 버스트 구간을 안정화합니다.",
  }),
  "Scarlet": make({
    primary: [line("maxAmmo", 4, "essential"), line("element", 4), line("attack", 4)],
    alternatives: ["hitRate", "critRate", "critDamage"], priority: "high", mode: "범용",
    note: "낮은 기본 탄창을 보완하는 장탄 수가 최우선입니다. 우월 코드와 공격력을 채우고 명중·크리 계열은 유효 줄로 봅니다.", confidence: "guide",
  }),
  "Scarlet: Black Shadow": make({
    primary: [line("element", 4, "essential"), line("attack", 4), line("maxAmmo", 1)],
    alternatives: ["chargeSpeed", "critDamage"], priority: "meta", mode: "보스",
    note: "우월 코드·공격력 4줄과 장탄 수 1줄이 핵심입니다. 차지 속도는 OL 합계 약 5% 초과 임계를 맞출 때 1줄을 사용합니다.", confidence: "guide",
  }),
  "Snow Crane": make({
    primary: [line("maxAmmo", 1), line("chargeSpeed", 2), line("attack", 4)],
    alternatives: ["element", "defense"], priority: "skip", mode: "PvP",
    note: "버스트 수급용 장탄 수 1~2줄 외에는 재설정하지 않습니다. 생존과 전투력은 장비 레벨로 확보합니다.", confidence: "guide",
  }),
  "Snow White": make({
    primary: [line("element", 4, "essential"), line("attack", 4), line("critDamage", 4)],
    alternatives: ["critRate", "chargeSpeed"], priority: "high", mode: "보스",
    note: "큰 버스트 기본 계수에서 차지 대미지는 희석됩니다. 한방 피해용 우월 코드·공격력·크리 대미지를 사용합니다.", confidence: "guide",
  }),
  "Snow White: Heavy Arms": make({
    primary: [line("element", 4, "essential"), line("attack", 4), line("maxAmmo", 1)],
    alternatives: ["critRate", "critDamage"], priority: "meta", mode: "보스",
    note: "수냉 약점에서는 우월 코드를 최우선으로 하고 공격력 4줄을 더합니다. 장탄 수는 1줄이면 충분합니다.", confidence: "guide",
  }),
  "Snow White: Innocent Days": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 4)],
    alternatives: ["critRate", "critDamage"], priority: "medium", mode: "보스",
    note: "AR 연사 구간을 위해 우월 코드·공격력·장탄 수를 사용합니다.",
  }),
  "Soda: Twinkling Bunny": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["critRate", "critDamage"], priority: "high", mode: "보스",
    note: "철갑 산탄 메인 딜러. 우월 코드·공격력과 장탄 수 1~2줄로 풀버스트 사격 수를 확보합니다.",
  }),
  "Sugar": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 3)],
    alternatives: ["critRate", "critDamage"], priority: "medium", mode: "보스",
    note: "철갑 산탄 딜러. 우월 코드·공격력 뒤 장탄 수로 공격 속도 버프 구간의 재장전을 줄입니다.",
  }),
  "Tia": make({
    primary: [line("maxAmmo", 1, "essential"), line("chargeSpeed", 2), line("attack", 4)],
    alternatives: ["element", "defense"], priority: "medium", mode: "범용",
    note: "버스트 수급 안정에 장탄 수 1줄이 실용적입니다. 지원 성능은 옵션 재설정보다 장비 레벨이 우선입니다.",
  }),
  "Takina Inoue": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["chargeSpeed", "critDamage"], priority: "low", mode: "보스",
    note: "지원 겸 서브 딜러로 우월 코드·공격력과 장탄 수 2줄을 사용합니다. 지원만 보면 재설정 우선도는 낮습니다.", confidence: "guide",
  }),
  "Trony": make({
    primary: [line("element", 4), line("attack", 4), line("maxAmmo", 2)],
    alternatives: ["chargeSpeed", "critDamage"], priority: "medium", mode: "보스",
    note: "작열 차지 딜러. 우월 코드·공격력을 우선하고 장탄 수 2줄로 공격 회전을 안정화합니다.",
  }),
  "Velvet": make({
    primary: [line("element", 4), line("attack", 3), line("maxAmmo", 1)],
    alternatives: ["chargeSpeed", "critDamage"], priority: "medium", mode: "보스",
    note: "풍압 약점 지원 겸 서브 딜러. 우월 코드 4줄, 공격력 2~4줄 뒤 장탄 수는 최대 1~2줄만 사용합니다.", confidence: "guide",
  }),
  "Vesti: Tactical Upgrade": make({
    primary: [line("maxAmmo", 2, "essential"), line("element", 4), line("attack", 4)],
    alternatives: ["chargeSpeed", "chargeDamage"], priority: "high", mode: "PvE",
    note: "장탄 수 2줄로 최종 탄창 16발과 4의 배수를 맞춰 회전을 유지합니다. PvP 장탄 목표는 별도로 조정합니다.", confidence: "guide",
  }),
};

const output = roster.map((nikke) => normalizeBuild({
  name: nikke.name,
  ...defaultProfile(nikke),
  ...(overrides[nikke.name] ?? {}),
  verifiedAt: "2026-08-20",
}));

const names = new Set(output.map((entry) => entry.name));
if (output.length !== roster.length || names.size !== roster.length) {
  throw new Error("Every roster entry must have exactly one overload record.");
}
const rosterNames = new Set(roster.map((nikke) => nikke.name));
for (const name of [...skipInvestment, ...Object.keys(overrides)]) {
  if (!rosterNames.has(name)) throw new Error(`${name}: overload rule does not match the roster.`);
}
for (const entry of output) {
  if (entry.primary.length !== 3) throw new Error(`${entry.name}: expected exactly 3 primary lines.`);
  if (new Set(entry.primary.map(({ stat }) => stat)).size !== 3) {
    throw new Error(`${entry.name}: primary option names must be unique.`);
  }
  if (entry.primary.some(({ count }) => count < 1 || count > 4)) {
    throw new Error(`${entry.name}: option counts must stay between 1 and 4.`);
  }
  if (entry.primary.some(({ stat, grade }) => !validStats.has(stat) || !validGrades.has(grade))) {
    throw new Error(`${entry.name}: primary options must use supported stats and grades.`);
  }
  if ([...entry.alternatives, ...entry.avoid].some((stat) => !validStats.has(stat))) {
    throw new Error(`${entry.name}: alternatives and avoided options must use supported stats.`);
  }
  if (entry.primary.reduce((total, { count }) => total + count, 0) > 12) {
    throw new Error(`${entry.name}: target lines cannot exceed four gear pieces by three slots.`);
  }
  if (entry.primary.some(({ stat }) => entry.avoid.includes(stat))) {
    throw new Error(`${entry.name}: a primary option cannot also be avoided.`);
  }
  if (new Set(entry.alternatives).size !== entry.alternatives.length) {
    throw new Error(`${entry.name}: alternative option names must be unique.`);
  }
  if (new Set(entry.avoid).size !== entry.avoid.length) {
    throw new Error(`${entry.name}: avoided option names must be unique.`);
  }
  const primaryStats = new Set(entry.primary.map(({ stat }) => stat));
  if (entry.alternatives.some((stat) => primaryStats.has(stat) || entry.avoid.includes(stat))) {
    throw new Error(`${entry.name}: alternatives must be disjoint from primary and avoided options.`);
  }
}

await writeFile(outputPath, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Overload builds: ${output.length}/${roster.length}`);
console.log(`Named mechanic overrides: ${Object.keys(overrides).length}`);
