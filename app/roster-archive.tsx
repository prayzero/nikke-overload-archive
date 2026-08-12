"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import overloadJson from "./overloads.json";
import rosterJson from "./roster.json";

type NikkeClass = "attacker" | "defender" | "supporter";
type Weapon = "AR" | "MG" | "RL" | "SG" | "SMG" | "SR";

type Nikke = {
  id: string;
  name: string;
  nameKo: string;
  image: string;
  artwork: string;
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
type BuildPriority = "meta" | "high" | "medium" | "low" | "skip";
type BuildConfidence = "guide" | "mechanic" | "recent-guide" | "recent-kit";

type OverloadBuild = {
  name: string;
  primary: Array<{
    stat: StatKey;
    count: number;
    grade: "essential" | "ideal" | "filler";
  }>;
  alternatives: StatKey[];
  avoid: StatKey[];
  priority: BuildPriority;
  mode: string;
  note: string;
  confidence: BuildConfidence;
  verifiedAt: string;
};

const roster = rosterJson as Nikke[];
const overloads = overloadJson as OverloadBuild[];
const overloadByName = new Map(overloads.map((build) => [build.name, build]));
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

const priorityLabels: Record<BuildPriority, string> = {
  meta: "META",
  high: "HIGH",
  medium: "MID",
  low: "LOW",
  skip: "재설정 비추천",
};

const confidenceLabels: Record<BuildConfidence, string> = {
  guide: "개별 가이드 검토",
  mechanic: "기믹 규칙 기반",
  "recent-guide": "최신 가이드",
  "recent-kit": "최신 키트 기반",
};

function getBuild(nikke: Nikke): OverloadBuild {
  const build = overloadByName.get(nikke.name);
  if (!build) throw new Error(`${nikke.name}의 오버로드 데이터가 없습니다.`);
  return build;
}

const featuredNikkes = ["Rapi: Red Hood", "Cinderella", "Red Hood"]
  .map((name) => roster.find((nikke) => nikke.name === name))
  .filter((nikke): nikke is Nikke => Boolean(nikke));

function getInitials(name: string) {
  return name
    .split(/[\s:()-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function NikkeArtwork({
  nikke,
  owned,
  variant,
}: {
  nikke: Nikke;
  owned: boolean;
  variant: "card" | "detail";
}) {
  const sources = [nikke.artwork, nikke.image].filter(
    (source, index, allSources) => source && allSources.indexOf(source) === index,
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];

  return (
    <span
      className={`nikke-artwork nikke-artwork--${variant} ${owned ? "is-owned" : "is-unowned"} ${source ? "" : "is-failed"}`}
    >
      <span className="nikke-artwork__fallback" aria-hidden="true">
        {getInitials(nikke.name)}
      </span>
      {source && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="nikke-artwork__backdrop"
            src={source}
            alt=""
            aria-hidden="true"
            loading={variant === "card" ? "lazy" : "eager"}
            decoding="async"
            referrerPolicy="no-referrer"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="nikke-artwork__image"
            src={source}
            alt={`${nikke.nameKo} 캐릭터 전신 일러스트`}
            loading={variant === "card" ? "lazy" : "eager"}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setSourceIndex((current) => current + 1)}
          />
        </>
      )}
      <span className="nikke-artwork__shade" aria-hidden="true" />
    </span>
  );
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
  const selectedBuild = selected ? getBuild(selected) : null;

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
          <span>196 BUILDS ONLINE</span>
          <strong>2026.08.12</strong>
        </div>
      </header>

      <main id="top">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow"><span>ARK DATABASE</span> / OVERLOAD LAB</p>
            <h1 id="hero-title"><span>196명의</span><br /><em>오버로드.</em></h1>
            <p className="hero-description">
              모든 니케의 추천 옵션을 4부위 × 3칸으로 정리했습니다.
              흑백 일러스트를 눌러 보유 캐릭터를 컬러로 해제하고, 캐릭터별 목표 줄 수까지 확인하세요.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#roster">전체 니케 보기 <span aria-hidden="true">↓</span></a>
              <span className="auto-save"><i aria-hidden="true" /> 브라우저 자동 저장</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-portraits" aria-hidden="true">
              {featuredNikkes.map((nikke, index) => (
                <span className={`hero-portrait hero-portrait--${["secondary", "primary", "tertiary"][index]}`} key={nikke.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={nikke.artwork} alt="" decoding="async" referrerPolicy="no-referrer" />
                </span>
              ))}
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
          </div>
        </section>

        <section className="roster-section" id="roster" aria-labelledby="roster-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span>01</span> PERSONNEL ROSTER</p>
              <h2 id="roster-title">전체 니케 빌드 아카이브</h2>
              <p>일러스트를 누르면 흑백에서 컬러로 전환됩니다. OL 버튼에서 캐릭터별 추천을 확인하세요.</p>
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
                const build = getBuild(nikke);
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
                      <NikkeArtwork nikke={nikke} owned={isOwned} variant="card" />
                      <span className="owned-badge"><b aria-hidden="true">✓</b>{isOwned ? "보유 중" : "미보유"}</span>
                      <span className={`ol-rank ol-rank--${build.priority}`}>OL {priorityLabels[build.priority]}</span>
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
                        {build.mode} 빌드 보기 <span aria-hidden="true">↗</span>
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
            <h2 id="guide-title">12칸을 낭비하지 않는 법</h2>
          </div>
          <div className="guide-grid">
            <article><span>01</span><h3>4부위 × 3옵션</h3><p>머리·몸통·팔·다리의 세 줄을 그대로 배치합니다. 목표 개수 밖은 자유 옵션으로 표시됩니다.</p></article>
            <article><span>02</span><h3>기믹별 개별 추천</h3><p>막탄, 차지 임계값, 지속 사격, HP 스케일링처럼 캐릭터마다 다른 조건을 반영합니다.</p></article>
            <article><span>03</span><h3>투자 우선도 표시</h3><p>META부터 재설정 비추천까지 구분해 커스텀 모듈을 어디에 먼저 쓸지 보여줍니다.</p></article>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-brand"><span>{"//"}</span> NIKKE OVERLOAD ARCHIVE</div>
        <p>비공식·비상업 팬 프로젝트입니다. NIKKE의 캐릭터·명칭·이미지 권리는 © Proxima Beta Pte. Limited, © SHIFT UP CORP. 및 각 라이선스 제공자에게 있습니다.</p>
        <div className="footer-links">
          <a href="https://nikke-goddess-of-victory-international.fandom.com/wiki/Category:Playable_characters" target="_blank" rel="noreferrer">명단·이미지 참고</a>
          <a href="https://nikke.gg/overload-equipment/" target="_blank" rel="noreferrer">오버로드 기본 원리</a>
          <a href="https://policy.shiftup.co.kr/ip/en/index.html" target="_blank" rel="noreferrer">SHIFT UP IP 가이드</a>
        </div>
      </footer>

      {selected && selectedBuild && (
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
                <NikkeArtwork key={selected.id} nikke={selected} owned={ownedIds.has(selected.id)} variant="detail" />
              </div>
              <div>
                <p>{manufacturerLabels[selected.manufacturer] ?? selected.manufacturer} / {codeLabels[selected.code] ?? selected.code}</p>
                <h2 id="drawer-title">{selected.nameKo}</h2>
                <span>{selected.name}</span>
                <div className="identity-tags">
                  <b>BURST {selected.burst}</b><b>{selected.weapon}</b><b>{classLabels[selected.class]}</b><b>{selectedBuild.mode}</b>
                </div>
              </div>
            </div>

            <div className="loadout-heading">
              <div><p>RECOMMENDED OVERLOAD</p><h3>4부위 × 3줄 목표</h3></div>
              <span>4 × 3</span>
            </div>

            <div className="gear-matrix">
              {gearSlots.map((slot, slotIndex) => (
                <article key={slot.code}>
                  <header><span>{slot.code}</span><strong>{slot.label}</strong></header>
                  <ol>
                    {selectedBuild.primary.map((target, optionIndex) => {
                      const isTargetSlot = slotIndex < target.count;
                      return (
                        <li
                          key={target.stat}
                          className={`${isTargetSlot ? `stat-${target.stat} target-${target.grade}` : "stat-free is-flex"}`}
                        >
                          <span>0{optionIndex + 1}</span>
                          <strong>{isTargetSlot ? statLabels[target.stat] : "자유 옵션"}</strong>
                          <small>{isTargetSlot ? `${target.count}/4 목표` : "KEEP / FLEX"}</small>
                        </li>
                      );
                    })}
                  </ol>
                </article>
              ))}
            </div>

            <div className="build-summary">
              <div className="build-meta">
                <span className={`build-priority build-priority--${selectedBuild.priority}`}>{priorityLabels[selectedBuild.priority]}</span>
                <span>{selectedBuild.mode}</span>
                <span>{confidenceLabels[selectedBuild.confidence]}</span>
              </div>
              <p>CORE TARGET · 4부위 합산</p>
              <div className="core-targets">
                {selectedBuild.primary.map((target) => (
                  <span key={target.stat}>{statShortLabels[target.stat]} ×{target.count}</span>
                ))}
              </div>
              <div className="option-groups">
                <p><b>대체/유효</b>{selectedBuild.alternatives.length ? selectedBuild.alternatives.map((stat) => statShortLabels[stat]).join(" · ") : "자유 옵션"}</p>
                <p className={selectedBuild.avoid.length ? "is-avoid" : ""}><b>회피</b>{selectedBuild.avoid.length ? selectedBuild.avoid.map((stat) => statShortLabels[stat]).join(" · ") : "없음"}</p>
              </div>
              <p className="build-note">{selectedBuild.note}</p>
            </div>

            <div className="drawer-caution">
              <span aria-hidden="true">!</span>
              <p><strong>{selectedBuild.verifiedAt} 데이터 · 부위 순서 무관</strong>목표 줄 수를 4부위에 배치한 예시입니다. 큐브·파티·보스·PvP 임계값에 따라 최종 세팅은 달라질 수 있습니다.</p>
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
