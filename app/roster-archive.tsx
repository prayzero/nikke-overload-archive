"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import rosterJson from "./roster.json";

type NikkeClass = "attacker" | "defender" | "supporter";
type Weapon = "AR" | "MG" | "RL" | "SG" | "SMG" | "SR";

type Nikke = {
  id: string;
  name: string;
  nameKo: string;
  image: string;
  class: NikkeClass;
  weapon: Weapon;
  burst: string;
  manufacturer: string;
  code: string;
};

type StatKey =
  | "attack"
  | "element"
  | "maxAmmo"
  | "chargeSpeed"
  | "chargeDamage"
  | "hitRate"
  | "critRate"
  | "critDamage"
  | "defense";

type Scope = "all" | "owned" | "unowned";

const roster = rosterJson as Nikke[];
const STORAGE_KEY = "nikke-overload-archive:roster:v1";

const classLabels: Record<NikkeClass, string> = {
  attacker: "화력형",
  defender: "방어형",
  supporter: "지원형",
};

const manufacturerLabels: Record<string, string> = {
  elysion: "엘리시온",
  missilis: "미실리스",
  tetra: "테트라",
  pilgrim: "필그림",
  abnormal: "어브노멀",
};

const codeLabels: Record<string, string> = {
  fire: "작열",
  water: "수냉",
  wind: "풍압",
  electric: "전격",
  iron: "철갑",
};

const statLabels: Record<StatKey, string> = {
  attack: "공격력 증가",
  element: "우월 코드 대미지",
  maxAmmo: "최대 장탄 수",
  chargeSpeed: "차지 속도",
  chargeDamage: "차지 대미지",
  hitRate: "명중률",
  critRate: "크리티컬 확률",
  critDamage: "크리티컬 대미지",
  defense: "방어력 증가",
};

const statShortLabels: Record<StatKey, string> = {
  attack: "공격력",
  element: "우월 코드",
  maxAmmo: "장탄 수",
  chargeSpeed: "차지 속도",
  chargeDamage: "차지 대미지",
  hitRate: "명중률",
  critRate: "크리 확률",
  critDamage: "크리 대미지",
  defense: "방어력",
};

const gearSlots = [
  { code: "HEAD", label: "머리" },
  { code: "BODY", label: "몸통" },
  { code: "ARMS", label: "팔" },
  { code: "LEGS", label: "다리" },
] as const;

const lastBulletNames = new Set([
  "Dorothy",
  "Anis: Sparkling Summer",
  "Privaty",
  "Privaty: Unkind Maid",
  "Pepper",
  "Marciana",
  "Soline",
]);

const specialBuilds: Record<string, { stats: StatKey[]; note: string }> = {
  Alice: {
    stats: ["chargeSpeed", "element", "attack"],
    note: "차지 속도 임계값을 먼저 맞춘 뒤 우월 코드와 공격력을 확보하세요.",
  },
  "Red Hood": {
    stats: ["element", "attack", "chargeSpeed"],
    note: "보스전 기준 우월 코드와 공격력이 핵심이며 차지 속도로 운용감을 보완합니다.",
  },
  "Snow White": {
    stats: ["chargeDamage", "element", "attack"],
    note: "버스트 한 발의 피해를 높이는 차지 대미지를 우선합니다.",
  },
  Modernia: {
    stats: ["maxAmmo", "element", "attack"],
    note: "지속 사격 시간을 늘리는 장탄 수가 최우선입니다.",
  },
  Scarlet: {
    stats: ["maxAmmo", "element", "attack"],
    note: "낮은 기본 탄창을 보완한 뒤 우월 코드와 공격력을 챙깁니다.",
  },
  "Scarlet: Black Shadow": {
    stats: ["element", "attack", "maxAmmo"],
    note: "우월 코드와 공격력을 중심으로 장탄 수를 보완합니다.",
  },
  "2B": {
    stats: ["element", "critDamage", "attack"],
    note: "자체 공격력 전환 효율을 고려해 우월 코드와 크리티컬 대미지를 우선합니다.",
  },
  Cinderella: {
    stats: ["element", "attack", "chargeDamage"],
    note: "우월 코드와 공격력을 기반으로 차지 대미지를 더합니다.",
  },
  "Cinderella: Crystal Wave": {
    stats: ["element", "attack", "maxAmmo"],
    note: "우월 코드와 공격력 4줄을 우선하고 장탄 수로 지속 화력을 보완합니다.",
  },
  "Snow White: Heavy Arms": {
    stats: ["element", "attack", "critDamage"],
    note: "우월 코드와 공격력이 핵심이며 크리티컬 대미지를 보조로 사용합니다.",
  },
  "Neon: Vision Eye": {
    stats: ["element", "attack", "chargeSpeed"],
    note: "우월 코드와 공격력을 중심으로 차지 속도를 보완합니다.",
  },
};

function getBuild(nikke: Nikke) {
  if (specialBuilds[nikke.name]) return specialBuilds[nikke.name];

  if (lastBulletNames.has(nikke.name)) {
    return {
      stats: ["element", "attack", "critDamage"] as StatKey[],
      note: "막탄 기믹을 위해 최대 장탄 수는 피하고 화력 옵션을 우선합니다.",
    };
  }

  if (nikke.class === "attacker") {
    if (nikke.weapon === "MG") {
      return {
        stats: ["maxAmmo", "element", "attack"] as StatKey[],
        note: "지속 화력형 세팅입니다. 장탄 수, 우월 코드, 공격력을 4줄씩 목표로 합니다.",
      };
    }
    if (nikke.weapon === "SR" || nikke.weapon === "RL") {
      return {
        stats: ["element", "attack", "chargeSpeed"] as StatKey[],
        note: "차지 무기 범용 세팅입니다. 캐릭터별 임계값이 있다면 차지 속도를 먼저 맞추세요.",
      };
    }
    return {
      stats: ["element", "attack", "maxAmmo"] as StatKey[],
      note: "일반 PvE 화력형 범용 세팅입니다. 우월 코드와 공격력을 우선합니다.",
    };
  }

  if (nikke.weapon === "SR" || nikke.weapon === "RL") {
    return {
      stats: ["chargeSpeed", "attack", "maxAmmo"] as StatKey[],
      note: "지원 운용과 버스트 수급을 위한 차지 속도 중심의 범용 세팅입니다.",
    };
  }

  if (nikke.weapon === "MG") {
    return {
      stats: ["maxAmmo", "attack", "hitRate"] as StatKey[],
      note: "지속 사격과 스킬 계수를 보조하는 유틸리티 세팅입니다.",
    };
  }

  return {
    stats: ["attack", "maxAmmo", "hitRate"] as StatKey[],
    note: "지원·방어형 범용 세팅입니다. 스킬 구조와 콘텐츠에 따라 투자 우선순위가 낮을 수 있습니다.",
  };
}

function getInitials(name: string) {
  return name
    .split(/[\s:()-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function RosterArchive() {
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [manufacturer, setManufacturer] = useState("all");
  const [nikkeClass, setNikkeClass] = useState("all");
  const [weapon, setWeapon] = useState("all");
  const [selected, setSelected] = useState<Nikke | null>(null);
  const [toast, setToast] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { ownedIds?: string[] };
          const validIds = new Set(roster.map((nikke) => nikke.id));
          setOwnedIds(new Set((parsed.ownedIds ?? []).filter((id) => validIds.has(id))));
        }
      } catch {
        // A malformed local save should never block the roster.
      } finally {
        setHydrated(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, ownedIds: [...ownedIds], updatedAt: new Date().toISOString() }),
    );
  }, [ownedIds, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected]);

  const filteredRoster = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    return roster.filter((nikke) => {
      const isOwned = ownedIds.has(nikke.id);
      const matchesQuery =
        !normalizedQuery ||
        nikke.name.toLocaleLowerCase("en-US").includes(normalizedQuery) ||
        nikke.nameKo.toLocaleLowerCase("ko-KR").includes(normalizedQuery);
      const matchesScope = scope === "all" || (scope === "owned" ? isOwned : !isOwned);
      const matchesManufacturer = manufacturer === "all" || nikke.manufacturer === manufacturer;
      const matchesClass = nikkeClass === "all" || nikke.class === nikkeClass;
      const matchesWeapon = weapon === "all" || nikke.weapon === weapon;
      return matchesQuery && matchesScope && matchesManufacturer && matchesClass && matchesWeapon;
    });
  }, [manufacturer, nikkeClass, ownedIds, query, scope, weapon]);

  const ownedCount = ownedIds.size;
  const progress = Math.round((ownedCount / roster.length) * 100);

  function toggleOwned(nikke: Nikke) {
    setOwnedIds((current) => {
      const next = new Set(current);
      const willOwn = !next.has(nikke.id);
      if (willOwn) next.add(nikke.id);
      else next.delete(nikke.id);
      setToast(`${nikke.nameKo}${willOwn ? " 보유 등록 완료" : " 보유 목록에서 제외"}`);
      return next;
    });
  }

  function resetFilters() {
    setQuery("");
    setScope("all");
    setManufacturer("all");
    setNikkeClass("all");
    setWeapon("all");
  }

  function resetRoster() {
    if (window.confirm("이 기기에 저장된 보유 니케 목록을 모두 초기화할까요?")) {
      setOwnedIds(new Set());
      setToast("보유 목록을 초기화했습니다");
    }
  }

  function exportRoster() {
    const data = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        owned: roster.filter((nikke) => ownedIds.has(nikke.id)).map(({ id, name, nameKo }) => ({ id, name, nameKo })),
      },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nikke-roster.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("보유 목록을 내보냈습니다");
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="NIKKE Overload Archive 홈">
          <span className="wordmark-mark" aria-hidden="true">{"//"}</span>
          <span>NIKKE</span>
          <span className="wordmark-muted">OVERLOAD ARCHIVE</span>
        </a>
        <div className="topbar-status">
          <span className="status-dot" aria-hidden="true" />
          <span>DATA SNAPSHOT</span>
          <strong>2026.08.12</strong>
        </div>
      </header>

      <main id="top">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow"><span>ARK DATABASE</span> / COMMANDER&apos;S INDEX</p>
            <h1 id="hero-title">내 니케,<br /><em>한눈에.</em></h1>
            <p className="hero-description">
              보유 니케를 체크하고, 각 니케의 오버로드 4부위 × 3옵션 목표를 바로 확인하세요.
              선택한 목록은 이 기기에 자동 저장됩니다.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#roster">전체 니케 보기 <span aria-hidden="true">↓</span></a>
              <span className="auto-save"><i aria-hidden="true" /> 브라우저 자동 저장</span>
            </div>
          </div>

          <div className="hero-dashboard" aria-label="보유 현황">
            <div className="dashboard-topline">
              <span>ROSTER SYNC</span>
              <span>{hydrated ? "ONLINE" : "LOADING"}</span>
            </div>
            <div className="dashboard-count">
              <span className="count-current">{String(ownedCount).padStart(3, "0")}</span>
              <span className="count-divider">/</span>
              <span className="count-total">{roster.length}</span>
            </div>
            <div className="progress-label"><span>보유율</span><strong>{progress}%</strong></div>
            <div className="progress-track" aria-label={`보유율 ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="dashboard-metrics">
              <div><span>TOTAL</span><strong>{roster.length}</strong><small>전체 니케</small></div>
              <div><span>OWNED</span><strong>{ownedCount}</strong><small>보유 니케</small></div>
              <div><span>LOCKED</span><strong>{roster.length - ownedCount}</strong><small>미보유</small></div>
            </div>
            <div className="matrix-motif" aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => <span key={index} className={index < Math.max(1, Math.round(progress / 9)) ? "active" : ""} />)}
            </div>
          </div>
        </section>

        <section className="roster-section" id="roster" aria-labelledby="roster-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span>01</span> PERSONNEL ROSTER</p>
              <h2 id="roster-title">전체 니케 아카이브</h2>
              <p>일러스트를 누르면 미보유의 흑백 상태가 컬러로 전환됩니다.</p>
            </div>
            <div className="section-tools">
              <button type="button" className="text-button" onClick={exportRoster} disabled={!ownedCount}>목록 내보내기</button>
              <button type="button" className="text-button danger" onClick={resetRoster} disabled={!ownedCount}>보유 초기화</button>
            </div>
          </div>

          <div className="filter-panel">
            <label className="search-field">
              <span className="sr-only">니케 이름 검색</span>
              <span className="search-symbol" aria-hidden="true">⌕</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="니케 이름 검색 (한글 / 영문)"
              />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기">×</button>}
            </label>

            <div className="scope-tabs" aria-label="보유 상태 필터">
              {([
                ["all", "전체"],
                ["owned", `보유 ${ownedCount}`],
                ["unowned", `미보유 ${roster.length - ownedCount}`],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" className={scope === value ? "active" : ""} onClick={() => setScope(value)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="select-filters">
              <label>
                <span>제조사</span>
                <select value={manufacturer} onChange={(event) => setManufacturer(event.target.value)}>
                  <option value="all">모든 제조사</option>
                  {Object.entries(manufacturerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                <span>클래스</span>
                <select value={nikkeClass} onChange={(event) => setNikkeClass(event.target.value)}>
                  <option value="all">모든 클래스</option>
                  {Object.entries(classLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                <span>무기</span>
                <select value={weapon} onChange={(event) => setWeapon(event.target.value)}>
                  <option value="all">모든 무기</option>
                  {(["AR", "MG", "RL", "SG", "SMG", "SR"] as Weapon[]).map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <button type="button" className="reset-filter" onClick={resetFilters}>필터 초기화</button>
            </div>
          </div>

          <div className="result-row">
            <p><strong>{filteredRoster.length}</strong> NIKKES FOUND</p>
            <p><span className="legend-swatch owned" /> 보유 <span className="legend-swatch" /> 미보유</p>
          </div>

          {filteredRoster.length ? (
            <div className="character-grid">
              {filteredRoster.map((nikke, index) => {
                const isOwned = ownedIds.has(nikke.id);
                return (
                  <article className={`nikke-card ${isOwned ? "owned" : ""}`} key={nikke.id}>
                    <button
                      type="button"
                      className="portrait-toggle"
                      aria-pressed={isOwned}
                      aria-label={`${nikke.nameKo} ${isOwned ? "보유 해제" : "보유 등록"}`}
                      onClick={() => toggleOwned(nikke)}
                    >
                      <span className="card-index" aria-hidden="true">{String(index + 1).padStart(3, "0")}</span>
                      <span className="portrait-fallback" aria-hidden="true">{getInitials(nikke.name)}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={nikke.image}
                        alt={`${nikke.nameKo} 캐릭터 일러스트`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                          event.currentTarget.parentElement?.classList.add("image-failed");
                        }}
                      />
                      <span className="owned-badge"><b aria-hidden="true">✓</b>{isOwned ? "보유 중" : "미보유"}</span>
                      <span className="scan-line" aria-hidden="true" />
                    </button>
                    <div className="card-body">
                      <div className="card-tags">
                        <span>B{nikke.burst}</span>
                        <span>{nikke.weapon}</span>
                        <span>{classLabels[nikke.class]}</span>
                      </div>
                      <h3>{nikke.nameKo}</h3>
                      <p>{nikke.name}</p>
                      <button type="button" className="overload-button" onClick={() => setSelected(nikke)}>
                        오버로드 보기 <span aria-hidden="true">↗</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <h3>조건에 맞는 니케가 없습니다</h3>
              <p>필터를 줄이거나 다른 이름을 검색해 보세요.</p>
              <button type="button" onClick={resetFilters}>모든 필터 초기화</button>
            </div>
          )}
        </section>

        <section className="guide-section" aria-labelledby="guide-title">
          <div>
            <p className="eyebrow"><span>02</span> LOADOUT PROTOCOL</p>
            <h2 id="guide-title">오버로드 추천을 읽는 법</h2>
          </div>
          <div className="guide-grid">
            <article><span>01</span><h3>4부위 × 3옵션</h3><p>머리·몸통·팔·다리마다 목표 옵션 3개를 우선순위대로 보여줍니다.</p></article>
            <article><span>02</span><h3>범용 PvE 기준</h3><p>우월 코드와 공격력을 기본으로 무기와 캐릭터 기믹을 반영합니다.</p></article>
            <article><span>03</span><h3>세팅은 달라질 수 있음</h3><p>큐브, 파티, 보스, PvP, 차지 임계값에 따라 최종 세팅은 달라질 수 있습니다.</p></article>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-brand"><span>{"//"}</span> NIKKE OVERLOAD ARCHIVE</div>
        <p>GODDESS OF VICTORY: NIKKE 비공식·비상업 팬 아카이브입니다. 게임 및 캐릭터 권리는 SHIFT UP에 있습니다.</p>
        <div className="footer-links">
          <a href="https://nikke-goddess-of-victory-international.fandom.com/wiki/Category:Playable_characters" target="_blank" rel="noreferrer">명단·대표 이미지 출처 (CC BY-SA)</a>
          <a href="https://nikke.gg/overload-equipment/" target="_blank" rel="noreferrer">오버로드 기본 원리</a>
          <a href="https://policy.shiftup.co.kr/ip/en/index.html" target="_blank" rel="noreferrer">SHIFT UP IP 가이드</a>
        </div>
      </footer>

      {selected && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <aside
            className="detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <div className="drawer-header">
              <p><span>LOADOUT FILE</span> / {selected.id}</p>
              <button ref={closeButtonRef} type="button" onClick={() => setSelected(null)} aria-label="상세 닫기">×</button>
            </div>
            <div className="drawer-identity">
              <div className={`drawer-portrait ${ownedIds.has(selected.id) ? "owned" : ""}`}>
                <span>{getInitials(selected.name)}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.image} alt={`${selected.nameKo} 일러스트`} referrerPolicy="no-referrer" />
              </div>
              <div>
                <p>{manufacturerLabels[selected.manufacturer] ?? selected.manufacturer} / {codeLabels[selected.code] ?? selected.code}</p>
                <h2 id="drawer-title">{selected.nameKo}</h2>
                <span>{selected.name}</span>
                <div className="identity-tags">
                  <b>BURST {selected.burst}</b><b>{selected.weapon}</b><b>{classLabels[selected.class]}</b>
                </div>
              </div>
            </div>

            <div className="loadout-heading">
              <div><p>RECOMMENDED OVERLOAD</p><h3>목표 옵션 매트릭스</h3></div>
              <span>4 × 3</span>
            </div>

            <div className="gear-matrix">
              {gearSlots.map((slot) => {
                const build = getBuild(selected);
                return (
                  <article key={slot.code}>
                    <header><span>{slot.code}</span><strong>{slot.label}</strong></header>
                    <ol>
                      {build.stats.map((stat, index) => (
                        <li key={stat} className={`stat-${stat}`}>
                          <span>0{index + 1}</span><strong>{statLabels[stat]}</strong>
                        </li>
                      ))}
                    </ol>
                  </article>
                );
              })}
            </div>

            <div className="build-summary">
              <p>CORE TARGET</p>
              <div>{getBuild(selected).stats.map((stat) => <span key={stat}>{statShortLabels[stat]} ×4</span>)}</div>
              <p className="build-note">{getBuild(selected).note}</p>
            </div>

            <div className="drawer-caution">
              <span aria-hidden="true">!</span>
              <p><strong>일반 PvE 1차 목표</strong>수치 임계, 파티 조합, 큐브와 콘텐츠에 따라 옵션 우선순위가 달라질 수 있습니다.</p>
            </div>

            <button type="button" className={`drawer-owned ${ownedIds.has(selected.id) ? "active" : ""}`} onClick={() => toggleOwned(selected)}>
              {ownedIds.has(selected.id) ? "✓ 보유 목록에 등록됨" : "+ 보유 목록에 추가"}
            </button>
          </aside>
        </div>
      )}

      <div className={`toast ${toast ? "visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
