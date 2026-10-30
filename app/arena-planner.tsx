"use client";

import { useEffect, useMemo, useState } from "react";
import { buildArenaPlan, type ArenaCandidate, type ArenaCatalog, type ArenaNikke } from "./arena-engine.mjs";
import arenaJson from "./arena-presets.json";
import "./arena-planner.css";

const catalog = arenaJson as ArenaCatalog;
const STORAGE_KEY = "nikke-overload-archive:arena:v1";
const PAGE_SIZE = 3;
const sourceById = new Map(catalog.sources.map((source) => [source.id, source]));
const favoriteNames = new Set(catalog.presets.flatMap((preset) => preset.requiresFavorite ?? []));

type ArenaPlannerProps = {
  roster: ArenaNikke[];
  ownedIds: Set<string>;
  hydrated: boolean;
  onViewNikke: (id: string, opener: HTMLButtonElement) => void;
};

function ArenaMember({ nikke, position, missing, favoriteNeeded, favoriteRequired, onViewNikke }: {
  nikke: ArenaNikke;
  position: number;
  missing: boolean;
  favoriteNeeded: boolean;
  favoriteRequired: boolean;
  onViewNikke: ArenaPlannerProps["onViewNikke"];
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const imageVisible = Boolean(nikke.image) && failedImage !== nikke.image;
  const stateLabel = missing ? "미보유" : favoriteNeeded ? "애장품 확인 필요" : favoriteRequired ? "애장품 완료" : "보유";
  return (
    <li className={"arena-member" + (missing ? " arena-member--missing" : "") + (favoriteNeeded ? " arena-member--pending" : "")}>
      <button type="button" className="arena-member__button"
        aria-label={"P" + position + " " + nikke.nameKo + ", " + stateLabel + ", 오버로드와 큐브 세팅 보기"}
        onClick={(event) => onViewNikke(nikke.id, event.currentTarget)}>
        <span className="arena-member__portrait">
          <span className="arena-member__fallback" aria-hidden="true">{nikke.nameKo.slice(0, 2)}</span>
          {imageVisible && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nikke.image} alt="" width={160} height={160} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedImage(nikke.image)} />
          )}
          <span className="arena-member__position" aria-hidden="true">P{position}</span>
          <span className="arena-member__weapon" aria-hidden="true">{nikke.weapon}</span>
        </span>
        <span className="arena-member__name">{nikke.nameKo}</span>
        <span className="arena-member__state">{stateLabel}</span>
      </button>
    </li>
  );
}

function CandidateCard({ team, label, scope, onViewNikke }: {
  team: ArenaCandidate;
  label: string;
  scope: string;
  onViewNikke: ArenaPlannerProps["onViewNikke"];
}) {
  const names = new Map(team.members.map((nikke) => [nikke.name, nikke.nameKo]));
  const titleId = "arena-" + scope + "-" + team.id;
  return (
    <article className={"arena-team " + (team.available ? "arena-team--ready" : "arena-team--pending")} aria-labelledby={titleId}>
      <header className="arena-team__header">
        <div><p className="arena-team__label">{label}</p><h3 id={titleId}>{team.title}</h3></div>
        <span className="arena-team__style">{team.style}</span>
      </header>
      <ol className="arena-lineup" aria-label="편성 화면 기준 P1부터 P5까지">
        {team.members.map((nikke, index) => (
          <ArenaMember key={nikke.id} nikke={nikke} position={index + 1}
            missing={team.missing.some((member) => member.id === nikke.id)}
            favoriteNeeded={team.favoriteMissing.some((member) => member.id === nikke.id)}
            favoriteRequired={(team.requiresFavorite ?? []).includes(nikke.name)} onViewNikke={onViewNikke} />
        ))}
      </ol>
      <div className="arena-burst">
        <span className="arena-detail-label">첫 버스트</span>
        <ol aria-label="첫 버스트 발동 순서">
          {team.burst.map((name, index) => (
            <li key={name + "-" + index}>{index > 0 && <span className="arena-burst__arrow" aria-hidden="true">→</span>}<span>{names.get(name) ?? name}</span></li>
          ))}
        </ol>
      </div>
      {(team.missing.length > 0 || team.favoriteMissing.length > 0 || team.conflicts.length > 0) && (
        <div className="arena-requirements">
          {team.missing.length > 0 && <p><strong>미보유</strong><span>{team.missing.map(({ nameKo }) => nameKo).join(" · ")}</span></p>}
          {team.favoriteMissing.length > 0 && <p><strong>애장품 확인</strong><span>{team.favoriteMissing.map(({ nameKo }) => nameKo).join(" · ")} — 최종 단계 완료 여부를 확인해 주세요.</span></p>}
          {team.conflicts.length > 0 && <p className="arena-requirements__overlap"><strong>편성 중복</strong><span>{team.conflicts.map((name) => names.get(name) ?? name).join(" · ")} — 현재 추천팀과 함께 편성할 수 없습니다.</span></p>}
        </div>
      )}
      <div className="arena-team__explanation">
        <div><h4 className="arena-detail-label">운용 포인트</h4><ul className="arena-team__notes">{team.notes.map((note, index) => <li key={index}>{note}</li>)}</ul></div>
        <div className="arena-team__weakness"><h4 className="arena-detail-label">확인할 약점</h4><p>{team.weakness}</p></div>
      </div>
      <footer className="arena-team__sources">
        <span>공략 근거</span>
        {team.sourceIds.map((id) => {
          const source = sourceById.get(id);
          return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.title}<span aria-hidden="true"> ↗</span><span className="sr-only"> (새 탭)</span></a> : null;
        })}
        <time dateTime={catalog.checkedAt}>{catalog.checkedAt.replaceAll("-", ".")} 확인</time>
      </footer>
    </article>
  );
}

function CandidateGroup({ title, description, candidates, scope, onViewNikke }: {
  title: string;
  description: string;
  candidates: ArenaCandidate[];
  scope: string;
  onViewNikke: ArenaPlannerProps["onViewNikke"];
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const remaining = Math.max(0, candidates.length - visibleCount);
  return (
    <details className="arena-candidates">
      <summary><span>{title} <b>{candidates.length}</b></span><span className="arena-candidates__toggle" aria-hidden="true" /></summary>
      <div className="arena-candidates__content">
        <p className="arena-candidates__description">{description}</p>
        {candidates.length === 0 ? <p className="arena-candidates__empty">현재 조건에 해당하는 공략 조합이 없습니다.</p> : (
          <>
            <div className="arena-candidates__list">
              {candidates.slice(0, visibleCount).map((team, index) => <CandidateCard key={team.id} team={team} label={"후보 " + String(index + 1).padStart(2, "0")} scope={scope} onViewNikke={onViewNikke} />)}
            </div>
            {remaining > 0 && <button type="button" className="arena-button arena-button--more" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>{Math.min(PAGE_SIZE, remaining)}개 더 보기 <span>남은 {remaining}개</span></button>}
          </>
        )}
      </div>
    </details>
  );
}

export default function ArenaPlanner({ roster, ownedIds, hydrated, onViewNikke }: ArenaPlannerProps) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteHydrated, setFavoriteHydrated] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [copyResult, setCopyResult] = useState<{ text: string; success: boolean } | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (!saved || typeof saved !== "object" || !("version" in saved) || saved.version !== 1 || !("favoriteIds" in saved) || !Array.isArray(saved.favoriteIds)) throw new Error("Invalid arena save");
          const validIds = new Set(roster.map(({ id }) => id));
          setFavoriteIds(new Set(saved.favoriteIds.filter((id): id is string => typeof id === "string" && validIds.has(id))));
        }
      } catch {
        setStorageMessage("저장된 애장품 설정을 읽지 못했습니다. 완료 여부를 다시 체크해 주세요.");
      } finally {
        setFavoriteHydrated(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [roster]);

  const plan = useMemo(() => buildArenaPlan({ roster, ownedIds, favoriteIds, presets: catalog.presets, pendingReviews: catalog.pendingReviews }), [roster, ownedIds, favoriteIds]);
  const eligibleFavorites = useMemo(() => roster.filter((nikke) => ownedIds.has(nikke.id) && favoriteNames.has(nikke.name)), [roster, ownedIds]);
  const ready = hydrated && favoriteHydrated;
  const copyText = useMemo(() => {
    const heading = "스페셜 아레나 · 보유 기반 추천 " + plan.teams.length + "팀\n편성 화면 기준 P1 → P5 · 공략 확인 " + catalog.checkedAt + "\n상대 편성과 육성 상태에 따라 조정해 주세요.";
    const teams = plan.teams.map((team, index) => {
      const names = new Map(team.members.map(({ name, nameKo }) => [name, nameKo]));
      const members = team.members.map(({ nameKo }, position) => "P" + (position + 1) + " " + nameKo).join(" / ");
      const favorite = team.requiresFavorite?.length ? "\n애장품 최종 단계: " + team.requiresFavorite.map((name) => names.get(name) ?? name).join(", ") : "";
      return (index + 1) + "팀 · " + team.title + "\n" + members + "\n첫 버스트: " + team.burst.map((name) => names.get(name) ?? name).join(" → ") + favorite;
    });
    return [heading, ...teams].join("\n\n");
  }, [plan.teams]);
  const currentCopyResult = copyResult?.text === copyText ? copyResult : null;

  function toggleFavorite(id: string) {
    const next = new Set(favoriteIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavoriteIds(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, favoriteIds: [...next] }));
      setStorageMessage("");
    } catch {
      setStorageMessage("이 브라우저에 저장할 수 없어 애장품 설정이 이번 화면에서만 적용됩니다.");
    }
    setCopyResult(null);
  }

  async function copyPlan() {
    setCopying(true);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(copyText);
      setCopyResult({ text: copyText, success: true });
    } catch {
      setCopyResult({ text: copyText, success: false });
    } finally {
      setCopying(false);
    }
  }

  return (
    <section className="arena-planner" id="arena" aria-labelledby="arena-title">
      <div className="arena-planner__heading">
        <div>
          <p className="eyebrow"><span>SP ARENA</span> / TEAM PLANNER</p>
          <h2 id="arena-title">내 니케로 짜는<br />스페셜 아레나</h2>
          <p className="arena-planner__intro">보유 목록과 공략을 대조해, 니케가 겹치지 않는 최대 3팀을 찾습니다.</p>
        </div>
        <div className="arena-readiness" role="status" aria-live="polite">
          <span>중복 없는 추천팀</span><p><strong>{ready ? String(plan.teams.length).padStart(2, "0") : "—"}</strong><span> / 03</span></p>
          <small>{ready ? "보유 " + plan.ownedCount + "명 · 조건 충족 " + plan.availableCount + "조합" : "이 기기의 보유 목록을 불러오는 중"}</small>
        </div>
      </div>
      <div className="arena-briefing">
        <p><strong>P1 → P5</strong><span>게임의 편성 화면 순서입니다. 니케를 누르면 OL·큐브 세팅을 확인할 수 있습니다.</span></p>
        <p>상대 편성과 육성 상태를 입력하지 않은 추천입니다. 공격·방어 배치는 상대에 맞춰 조정해 주세요.</p>
      </div>
      {!ready ? (
        <div className="arena-empty" role="status"><span className="arena-empty__code" aria-hidden="true">SYNC</span><h3>보유 정보와 애장품 설정을 불러오고 있습니다.</h3></div>
      ) : plan.ownedCount === 0 ? (
        <div className="arena-empty">
          <span className="arena-empty__code" aria-hidden="true">01 / REGISTER</span><h3>먼저 보유 니케를 등록해 주세요.</h3>
          <p>아래 목록에서 캐릭터를 눌러 보유 상태로 바꾸면, 이곳에 가능한 조합이 표시됩니다.</p>
          <a className="arena-button arena-button--primary" href="#roster">보유 니케 등록하기 <span aria-hidden="true">↓</span></a>
        </div>
      ) : (
        <>
          {plan.pendingOwned.length > 0 && (
            <section className="arena-review" aria-labelledby="arena-review-title">
              <h3 id="arena-review-title">보유 니케의 편성 검토</h3>
              <p className="arena-review__intro">아래 니케는 보유 목록에 정상 반영돼 있습니다. 아레나용 5인 조합이 확인되지 않아 추천팀 수에는 포함하지 않습니다.</p>
              <div className="arena-review__grid">
                {plan.pendingOwned.map((review) => (
                  <article className="arena-review__card" key={review.nikke.id} aria-labelledby={`arena-review-${review.nikke.id}`}>
                    <div className="arena-review__heading">
                      <h4 id={`arena-review-${review.nikke.id}`}>{review.nikke.nameKo}</h4>
                      <span>편성 검증 대기</span>
                    </div>
                    <p className="arena-review__role">B{review.nikke.burst} · {review.nikke.weapon}</p>
                    <p className="arena-review__reason">{review.reason}</p>
                    <details>
                      <summary>스킬 조건과 확인 자료</summary>
                      <ul>{review.notes.map((note) => <li key={note}>{note}</li>)}</ul>
                      <div className="arena-review__sources">
                        {review.sourceIds.map((id) => {
                          const source = sourceById.get(id);
                          return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a> : null;
                        })}
                      </div>
                    </details>
                    <div className="arena-review__footer">
                      <time dateTime={review.checkedAt}>자료 확인 {review.checkedAt.replaceAll("-", ".")}</time>
                      <button type="button" onClick={(event) => onViewNikke(review.nikke.id, event.currentTarget)} aria-label={`${review.nikke.nameKo} 검토 카드에서 장비 정보 보기`}>장비 정보 보기 ↗</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          {eligibleFavorites.length > 0 && (
            <div className="arena-favorites">
              <fieldset>
                <legend>애장품 최종 단계 완료</legend>
                <p id="arena-favorite-help">완료한 니케만 체크해 주세요. 일부 공략의 최소 단계보다 보수적으로 적용한 조건이며, 체크하면 애장품 전제 조합에 포함됩니다.</p>
                <div className="arena-favorites__options">
                  {eligibleFavorites.map((nikke) => (
                    <label key={nikke.id} className={"arena-favorite" + (favoriteIds.has(nikke.id) ? " arena-favorite--checked" : "")}>
                      <input type="checkbox" checked={favoriteIds.has(nikke.id)} onChange={() => toggleFavorite(nikke.id)} aria-describedby="arena-favorite-help" />
                      <span>{nikke.nameKo}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="arena-favorites__save">보유 등록과 별도로 이 기기에 저장됩니다.</p>
            </div>
          )}
          {storageMessage && <p className="arena-storage-message" role="status">{storageMessage}</p>}
          {plan.teams.length > 0 ? (
            <div className="arena-teams" aria-label="중복 없이 함께 편성할 추천팀">
              {plan.teams.map((team, index) => <CandidateCard key={team.id} team={team} label={"추천 " + String(index + 1).padStart(2, "0") + "팀"} scope="selected" onViewNikke={onViewNikke} />)}
              {plan.teams.length < 3 && <div className="arena-open-slot"><span aria-hidden="true">+ {3 - plan.teams.length}</span><p>검토한 조합 중 중복 없이 추가할 팀이 부족합니다.<br />아래 후보에서 미보유 니케와 애장품 조건을 확인해 주세요.</p></div>}
            </div>
          ) : (
            <div className="arena-empty arena-empty--compact">
              <span className="arena-empty__code" aria-hidden="true">CHECK CONDITIONS</span><h3>아직 조건이 맞는 공략 조합이 없습니다.</h3>
              <p>애장품 완료 여부와 아래 후보의 부족 조건을 확인해 주세요. 보유 목록을 바꾸면 추천도 함께 갱신됩니다.</p>
              <a className="arena-link" href="#roster">보유 목록 확인 <span aria-hidden="true">↓</span></a>
            </div>
          )}
          <div className="arena-planner__candidates">
            <CandidateGroup title="다른 조합 후보" description="보유·애장품 조건을 충족한 교체 후보입니다. 현재 추천팀과 겹치는 니케를 확인하고 한 팀씩 비교해 주세요." candidates={plan.alternatives} scope="alternative" onViewNikke={onViewNikke} />
            <CandidateGroup title="부족 조건이 있는 후보" description="미보유 니케 또는 확인하지 않은 애장품이 있는 조합입니다. 실제 편성 전 표시된 조건을 충족해야 합니다." candidates={plan.nearMatches} scope="near" onViewNikke={onViewNikke} />
          </div>
          <div className="arena-export">
            <div><span className="arena-detail-label">편성 메모</span><p>추천팀의 자리 순서와 첫 버스트를 텍스트로 가져가세요.</p></div>
            <button type="button" className="arena-button arena-button--primary" disabled={plan.teams.length === 0 || copying} onClick={copyPlan}>{copying ? "복사 중…" : "추천 " + plan.teams.length + "팀 복사"}<span aria-hidden="true">↗</span></button>
          </div>
          <p className="arena-copy-status" role="status" aria-live="polite">{currentCopyResult ? currentCopyResult.success ? "추천 " + plan.teams.length + "팀을 복사했습니다." : "자동 복사를 사용할 수 없습니다. 아래 텍스트를 선택해 직접 복사해 주세요." : ""}</p>
          {currentCopyResult && !currentCopyResult.success && <textarea className="arena-copy-fallback" aria-label="직접 복사할 추천 편성" readOnly rows={9} value={copyText} onFocus={(event) => event.currentTarget.select()} />}
        </>
      )}
      <footer className="arena-planner__footer"><span>공략에서 확인한 조합 안에서 추천합니다.</span><time dateTime={catalog.checkedAt}>확인일 {catalog.checkedAt.replaceAll("-", ".")}</time></footer>
    </section>
  );
}
