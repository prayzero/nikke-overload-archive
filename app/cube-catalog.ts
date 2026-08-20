export const cubeIds = [
  "assault",
  "onslaught",
  "resilience",
  "bastion",
  "adjutant",
  "wingman",
  "quantum",
  "vigor",
  "endurance",
  "healing",
  "tempering",
  "assist",
  "destruction",
  "piercing",
  "crush",
  "cover",
  "divide",
] as const;

export type CubeId = (typeof cubeIds)[number];
export type CubeConfidence = "guide" | "mechanic";

export type CubeRecommendation = {
  name: string;
  primary: CubeId;
  alternatives: CubeId[];
  mode: string;
  note: string;
  confidence: CubeConfidence;
  verifiedAt: string;
};

export type CubeDetails = {
  name: string;
  shortName: string;
  effect: string;
};

export const cubeCatalog: Record<CubeId, CubeDetails> = {
  assault: { name: "렐릭 어설트 큐브", shortName: "Assault", effect: "명중률" },
  onslaught: { name: "택티컬 어설트 큐브", shortName: "Onslaught", effect: "차지 대미지" },
  resilience: { name: "렐릭 베어 큐브", shortName: "Resilience", effect: "재장전 속도" },
  bastion: { name: "택티컬 베어 큐브", shortName: "Bastion", effect: "탄환 충전" },
  adjutant: { name: "렐릭 부스트 큐브", shortName: "Adjutant", effect: "차지 속도" },
  wingman: { name: "택티컬 부스트 큐브", shortName: "Wingman", effect: "최대 장탄 수" },
  quantum: { name: "렐릭 퀀텀 큐브", shortName: "Quantum", effect: "버스트 충전" },
  vigor: { name: "렐릭 비거 큐브", shortName: "Vigor", effect: "최대 HP" },
  endurance: { name: "렐릭 엔듀어 큐브", shortName: "Endurance", effect: "방어력" },
  healing: { name: "렐릭 힐링 큐브", shortName: "Healing", effect: "회복량" },
  tempering: { name: "렐릭 템퍼링 큐브", shortName: "Tempering", effect: "받는 대미지 감소" },
  assist: { name: "렐릭 어시스트 큐브", shortName: "Assist", effect: "위기 시 최대 HP" },
  destruction: { name: "렐릭 디스트로이 큐브", shortName: "Destruction", effect: "파츠 대미지" },
  piercing: { name: "렐릭 피어싱 큐브", shortName: "Piercing", effect: "관통 대미지" },
  crush: { name: "렐릭 크러쉬 큐브", shortName: "Crush", effect: "방어력 무시 대미지" },
  cover: { name: "렐릭 커버 큐브", shortName: "Cover", effect: "엄폐물 최대 HP" },
  divide: { name: "렐릭 디바이드 큐브", shortName: "Divide", effect: "분배 대미지" },
};

export function getCubeDetails(id: CubeId): CubeDetails {
  return cubeCatalog[id] ?? { name: id, shortName: id, effect: "효과 정보 확인 중" };
}
