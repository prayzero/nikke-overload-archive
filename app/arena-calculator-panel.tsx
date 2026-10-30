"use client";

import { useMemo, useState } from "react";
import { buildCalculatedArenaPlan, CALCULATION_SCALE, CALCULATION_WEIGHTS, type ArenaCalculationModel, type CalculatedTeam, type CalculationGoal } from "./arena-calculator.mjs";
import type { ArenaNikke } from "./arena-engine.mjs";
import "./arena-calculator.css";

type ArenaCalculatorProps = {
  roster: ArenaNikke[];
  ownedIds: Set<string>;
  favoriteIds: Set<string>;
  model: ArenaCalculationModel;
  onViewNikke: (id: string, opener: HTMLButtonElement) => void;
};

const goalLabels: Record<CalculationGoal, string> = { balanced: "균형", burst: "버스트 수급", survival: "생존" };
const goalWeights = (goal: CalculationGoal) => {
  const { generation, offense, survival } = CALCULATION_WEIGHTS[goal];
  return `${generation} : ${offense} : ${survival}`;
};
const formatScore = (value: number) => value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });

function CalculatedMember({ nikke, position, favoriteRequired, onViewNikke }: {
  nikke: ArenaNikke;
  position: number;
  favoriteRequired: boolean;
  onViewNikke: ArenaCalculatorProps["onViewNikke"];
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <li className="arena-member">
      <button type="button" className="arena-member__button"
        aria-label={`P${position} ${nikke.nameKo}, 자체 계산 편성, 오버로드와 큐브 세팅 보기`}
        onClick={(event) => onViewNikke(nikke.id, event.currentTarget)}>
        <span className="arena-member__portrait">
          <span className="arena-member__fallback" aria-hidden="true">{nikke.nameKo.slice(0, 2)}</span>
          {nikke.image && failedImage !== nikke.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nikke.image} alt="" width={160} height={160} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedImage(nikke.image)} />
          )}
          <span className="arena-member__position" aria-hidden="true">P{position}</span>
          <span className="arena-member__weapon" aria-hidden="true">{nikke.weapon}</span>
        </span>
        <span className="arena-member__name">{nikke.nameKo}</span>
        <span className="arena-member__state">{favoriteRequired ? "애장품 전제" : "보유"}</span>
      </button>
    </li>
  );
}

function CalculatedCard({ team, index, model, onViewNikke }: {
  team: CalculatedTeam;
  index: number;
  model: ArenaCalculationModel;
  onViewNikke: ArenaCalculatorProps["onViewNikke"];
}) {
  const names = new Map(team.members.map(({ name, nameKo }) => [name, nameKo]));
  const namesById = new Map(team.members.map(({ id, nameKo }) => [id, nameKo]));
  const sources = model.sources.filter(({ id }) => team.sourceIds.includes(id));
  const titleId = `arena-calculated-title-${index}`;
  return (
    <article className="arena-team arena-calculated-team" aria-labelledby={titleId}>
      <header className="arena-team__header">
        <div><p className="arena-team__label">계산 {String(index + 1).padStart(2, "0")}팀</p><h3 id={titleId}>{team.title}</h3></div>
        <span className="arena-calculated-team__badge">실전 미검증</span>
      </header>
      <div className="arena-calculated-team__score"><span>자체 상대 점수</span><strong>{formatScore(team.score)}<small> / 100</small></strong></div>
      <ol className="arena-lineup" aria-label="자체 계산 편성 화면 기준 P1부터 P5까지">
        {team.members.map((nikke, position) => <CalculatedMember key={nikke.id} nikke={nikke} position={position + 1} favoriteRequired={(team.requiresFavorite ?? []).includes(nikke.name)} onViewNikke={onViewNikke} />)}
      </ol>
      <div className="arena-burst">
        <span className="arena-detail-label">예상 첫 버스트</span>
        <ol aria-label="자체 계산 예상 첫 버스트 발동 순서">
          {team.burst.map((name, burstIndex) => <li key={`${name}-${burstIndex}`}>{burstIndex > 0 && <span className="arena-burst__arrow" aria-hidden="true">→</span>}<span>{names.get(name) ?? name}</span></li>)}
        </ol>
        <p className="arena-calculated-team__burst-help">전원 생존·스킬 사용 가능 기준입니다. 전투 중 사망·부활·쿨다운 변화는 예측하지 않습니다.</p>
      </div>
      <dl className="arena-calculated-team__breakdown" aria-label="자체 계산 세부 지수">
        <div><dt>수급</dt><dd>{formatScore(team.breakdown.generation)}</dd></div>
        <div><dt>공격</dt><dd>{formatScore(team.breakdown.offense)}</dd></div>
        <div><dt>생존</dt><dd>{formatScore(team.breakdown.survival)}</dd></div>
      </dl>
      {team.unprofiledNames.length > 0 && <p className="arena-calculated-team__unknown"><strong>기본값 적용</strong>{team.unprofiledNames.map((name) => names.get(name) ?? name).join(" · ")}<span>개별 분석이 없어 무기·직군의 기본값으로 계산했습니다.</span></p>}
      <details className="arena-calculated-team__reason">
        <summary>편성 조건과 약점</summary>
        <div className="arena-team__explanation">
        <ul className="arena-team__notes">{team.notes.map((note, noteIndex) => <li key={noteIndex}>{note}</li>)}</ul>
        {(team.requiresFavorite ?? []).length > 0 && <p className="arena-calculated-team__favorite">애장품 최종 단계 전제: {team.requiresFavorite?.map((name) => names.get(name) ?? name).join(" · ")}</p>}
        <div className="arena-team__weakness"><h4 className="arena-detail-label">계산에서 주의할 점</h4><p>{team.weakness}</p></div>
        </div>
      </details>
      <details className="arena-calculated-team__reason">
        <summary>점수 근거와 니케별 기여</summary>
        <div>
          <p>아래 값은 수급·공격·생존의 원시 점수입니다. 실측 대미지·시간·생존 확률이 아닙니다.</p>
          <ul className="arena-contributions">
            {team.contributions.map((contribution) => <li key={contribution.id}>
              <div><strong>{namesById.get(contribution.id) ?? contribution.label}</strong></div>
              <dl><div><dt>수급</dt><dd>{formatScore(contribution.generation)}</dd></div><div><dt>공격</dt><dd>{formatScore(contribution.offense)}</dd></div><div><dt>생존</dt><dd>{formatScore(contribution.survival)}</dd></div></dl>
              <p>{contribution.basis}</p>
            </li>)}
          </ul>
        </div>
      </details>
      <footer className="arena-team__sources">
        <span>스킬·개별 평가 참고자료 · 이 5인 조합의 검증 출처는 아닙니다.</span>
        {sources.length > 0 ? <details><summary>스킬 참고자료 {sources.length}개</summary><div className="arena-calculated-team__source-links">{sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}<span aria-hidden="true"> ↗</span><span className="sr-only"> (새 탭)</span></a>)}</div></details> : <span>이 팀에 연결된 개별 참고자료가 없습니다.</span>}
      </footer>
    </article>
  );
}

export default function ArenaCalculator({ roster, ownedIds, favoriteIds, model, onViewNikke }: ArenaCalculatorProps) {
  const [teamCount, setTeamCount] = useState<1 | 3>(3);
  const [goal, setGoal] = useState<CalculationGoal>("balanced");
  const [copyResult, setCopyResult] = useState<{ text: string; success: boolean } | null>(null);
  const [copying, setCopying] = useState(false);
  const [visibleExcluded, setVisibleExcluded] = useState(8);
  const plan = useMemo(() => buildCalculatedArenaPlan({ roster, ownedIds, favoriteIds, model, teamCount, goal }), [roster, ownedIds, favoriteIds, model, teamCount, goal]);
  const unprofiledOwned = useMemo(() => {
    const profiled = new Set(model.profiles.map(({ name }) => name));
    const excluded = new Set(plan.excluded.map(({ nikke }) => nikke.id));
    return roster.filter(({ id, name }) => ownedIds.has(id) && !profiled.has(name) && !excluded.has(id));
  }, [roster, ownedIds, model, plan.excluded]);
  const copyText = useMemo(() => {
    const heading = `${teamCount === 1 ? "루키" : "스페셜"} 아레나 · 자체 계산 ${plan.teams.length}/${teamCount}팀 · ${goalLabels[goal]} 우선\n실전 미검증 조합 / 점수는 자체 상대 지수이며 승률·버스트 시간이 아닙니다.\n편성 화면 P1 → P5 · 전원 생존 기준 예상 첫 버스트\n자료 확인 ${model.checkedAt}`;
    const teams = plan.teams.map((team, index) => {
      const names = new Map(team.members.map(({ name, nameKo }) => [name, nameKo]));
      const favorite = team.requiresFavorite?.length ? `\n애장품 최종 단계: ${team.requiresFavorite.map((name) => names.get(name) ?? name).join(", ")}` : "";
      const unknown = team.unprofiledNames.length ? `\n무기·직군 기본값 적용: ${team.unprofiledNames.map((name) => names.get(name) ?? name).join(", ")}` : "";
      return `${index + 1}팀 · 자체 상대 점수 ${formatScore(team.score)}/100\n${team.members.map(({ nameKo }, position) => `P${position + 1} ${nameKo}`).join(" / ")}\n예상 첫 버스트: ${team.burst.map((name) => names.get(name) ?? name).join(" → ")}${favorite}${unknown}`;
    });
    return [heading, ...teams, "배치는 첫 버스트 순서와 P1 생존을 고려한 가정입니다. 상대에 맞춘 최적 배치나 승리를 보장하지 않습니다."].join("\n\n");
  }, [teamCount, goal, plan.teams, model.checkedAt]);
  const currentCopyResult = copyResult?.text === copyText ? copyResult : null;

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
    <section className="arena-calculator" aria-labelledby="arena-calculator-title">
      <div className="arena-calculator__notice">
        <span className="arena-calculator__tag">EXPERIMENTAL</span>
        <h3 id="arena-calculator-title">보유 니케로 자체 계산</h3>
        <p>아직 실전에서 검증하지 않은 조합입니다. 점수는 이 계산 모델 안의 상대 지수이며, <strong>승률이나 버스트까지 걸리는 초가 아닙니다.</strong> 상대 편성·육성 차이·피격 상황은 반영하지 않습니다.</p>
      </div>
      <div className="arena-calculator__settings">
        <fieldset><legend>편성할 팀 수</legend><div className="arena-calculator__choices">
          {([1, 3] as const).map((count) => <label key={count} className={teamCount === count ? "arena-calculator__choice arena-calculator__choice--selected" : "arena-calculator__choice"}><input type="radio" name="arena-calculation-team-count" aria-label={count === 1 ? "루키 1팀" : "스페셜 3팀"} checked={teamCount === count} onChange={() => setTeamCount(count)} /><span>{count === 1 ? "루키 1팀" : "스페셜 3팀"}</span></label>)}
        </div></fieldset>
        <fieldset><legend>우선할 성향</legend><div className="arena-calculator__choices">
          {(["balanced", "burst", "survival"] as const).map((value) => <label key={value} className={goal === value ? "arena-calculator__choice arena-calculator__choice--selected" : "arena-calculator__choice"}><input type="radio" name="arena-calculation-goal" aria-label={`${goalLabels[value]} 우선`} checked={goal === value} onChange={() => setGoal(value)} /><span>{goalLabels[value]}</span></label>)}
        </div></fieldset>
      </div>
      <div className="arena-calculator__summary" role="status" aria-live="polite" aria-atomic="true">
        <p><strong>{plan.teams.length}<span> / {teamCount}팀</span></strong><span>중복 없이 구성</span></p>
        <div><p>보유 {plan.ownedCount}명 · 계산 대상 {plan.eligibleCount}명 · 제외 {plan.excluded.length}명</p><p>개별 분석 없이 기본값 적용 {plan.unknownCount}명 · {goalLabels[goal]} 우선</p></div>
      </div>
      <details className="arena-calculator__method">
        <summary>계산 방식과 한계</summary>
        <div>
          <p>{plan.searchLabel} 탐색한 후보: {plan.examinedCount.toLocaleString("ko-KR")}개.</p>
          <p>수급·공격·생존을 각각 0~100 지수로 바꾼 뒤 선택한 가중치로 평균합니다. 수치와 가중치는 자체 설계했으며 실제 전투를 시뮬레이션한 결과가 아닙니다.</p>
          <dl className="arena-calculator__formula"><div><dt>수급 지수</dt><dd>수급 합계 ÷ {CALCULATION_SCALE.generation} × 100</dd></div><div><dt>공격 지수</dt><dd>공격 합계 ÷ {CALCULATION_SCALE.offense} × 100</dd></div><div><dt>생존 지수</dt><dd>생존 합계 ÷ {CALCULATION_SCALE.survival} × 100</dd></div><div><dt>각 지수 상한</dt><dd>100</dd></div><div><dt>현재 수급 : 공격 : 생존</dt><dd>{goalWeights(goal)}</dd></div></dl>
          <p>가중치 — 균형 {goalWeights("balanced")} / 버스트 수급 {goalWeights("burst")} / 생존 {goalWeights("survival")}</p>
          <p>배치는 첫 버스트 순서와 P1 생존을 고려한 가정입니다. 상대에 따른 최적 배치가 아니며, 근사 탐색이므로 가능한 모든 조합의 최고점을 보장하지 않습니다.</p>
          <p>기본값을 쓰는 니케는 고유 스킬과 조합 효과를 충분히 반영하지 못합니다. 제외된 니케는 아래 사유를 확인해 주세요. 계산에 포함되지 않았다는 이유만으로 아레나에서 사용할 수 없다는 뜻은 아닙니다.</p>
          <time dateTime={model.checkedAt}>모델 자료 확인 {model.checkedAt.replaceAll("-", ".")}</time>
        </div>
      </details>
      {plan.teams.length > 0 ? (
        <div className={"arena-calculator__teams" + (teamCount === 1 ? " arena-calculator__teams--single" : "")} aria-label="중복 없이 함께 편성할 자체 계산팀">
          {plan.teams.map((team, index) => <CalculatedCard key={team.id} team={team} index={index} model={model} onViewNikke={onViewNikke} />)}
          {plan.teams.length < teamCount && <div className="arena-open-slot"><span aria-hidden="true">+ {teamCount - plan.teams.length}</span><p>현재 보유·애장품·버스트 조건에서 추가 팀을 찾지 못했습니다. 아래 계산 대상과 제외 사유를 확인해 주세요.</p></div>}
        </div>
      ) : <div className="arena-empty arena-empty--compact"><span className="arena-empty__code" aria-hidden="true">NO CALCULATED TEAM</span><h3>계산 조건을 만족하는 5인 팀을 찾지 못했습니다.</h3><p>보유 니케 수, 버스트 단계와 애장품 조건을 확인해 주세요. 부족한 인원을 임의로 채우지 않습니다.</p><a className="arena-link" href="#roster">보유 목록 확인 ↓</a></div>}
      <details className="arena-calculator__eligibility">
        <summary>기본값 적용과 제외 사유 <span>기본값 {plan.unknownCount}명 · 제외 {plan.excluded.length}명</span></summary>
        <div>
          <h4>개별 분석이 없는 계산 대상</h4>
          <p>{unprofiledOwned.length ? unprofiledOwned.map(({ nameKo }) => nameKo).join(" · ") : "개별 분석 없이 기본값만 적용한 계산 대상은 없습니다."}</p>
          {unprofiledOwned.length > 0 && <p>무기·직군 기본값을 사용합니다. 계산팀에 포함되어도 개별 성능이나 조합이 검증됐다는 의미는 아닙니다.</p>}
          <h4>계산에서 제외한 보유 니케</h4>
          {plan.excluded.length ? <><ul className="arena-calculator__excluded">{plan.excluded.slice(0, visibleExcluded).map(({ nikke, reason }) => <li key={nikke.id}><button type="button" onClick={(event) => onViewNikke(nikke.id, event.currentTarget)} aria-label={`${nikke.nameKo} 계산 제외 사유에서 장비 정보 보기`}>{nikke.nameKo} ↗</button><span>{reason}</span></li>)}</ul>{plan.excluded.length > visibleExcluded && <button type="button" className="arena-button arena-button--more" onClick={() => setVisibleExcluded((count) => count + 8)}>제외 사유 더 보기 <span>남은 {plan.excluded.length - visibleExcluded}명</span></button>}</> : <p>제외된 보유 니케가 없습니다.</p>}
        </div>
      </details>
      <div className="arena-export">
        <div><span className="arena-detail-label">자체 계산 편성 메모</span><p>계산 조건과 미검증 표시를 함께 복사합니다.</p></div>
        <button type="button" className="arena-button arena-button--primary" disabled={plan.teams.length === 0 || copying} onClick={copyPlan}>{copying ? "복사 중…" : `계산 ${plan.teams.length}팀 복사`}<span aria-hidden="true">↗</span></button>
      </div>
      <p className="arena-copy-status" role="status" aria-live="polite">{currentCopyResult ? currentCopyResult.success ? `자체 계산 ${plan.teams.length}팀을 복사했습니다.` : "자동 복사를 사용할 수 없습니다. 아래 텍스트를 선택해 직접 복사해 주세요." : ""}</p>
      {currentCopyResult && !currentCopyResult.success && <textarea className="arena-copy-fallback" aria-label="직접 복사할 자체 계산 편성" readOnly rows={11} value={copyText} onFocus={(event) => event.currentTarget.select()} />}
    </section>
  );
}
