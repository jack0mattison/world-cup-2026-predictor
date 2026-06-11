import { formatLiveMinute, isEffectivelyLive } from "../shared/fixtures/live.js";
import type { AppData, Fixture, LockedPrediction } from "../shared/types.js";
import { escapeHtml, formatKickoff, isLocked, timeUntilKickoff } from "./utils.js";

type View = "upcoming" | "results" | "accuracy";

const LIVE_POLL_MS = 60_000;

export class App {
  private data: AppData | null = null;
  private view: View = "upcoming";
  private expanded = new Set<number>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async init(): Promise<void> {
    this.renderLoading();
    await this.refreshData(false);
  }

  private hasLiveMatches(): boolean {
    return this.data?.fixtures.some((f) => isEffectivelyLive(f)) ?? false;
  }

  private clearPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private schedulePolling(): void {
    this.clearPolling();
    if (this.view === "upcoming" && this.hasLiveMatches()) {
      this.pollTimer = setInterval(() => {
        void this.refreshData(true);
      }, LIVE_POLL_MS);
    }
  }

  private async refreshData(live: boolean): Promise<void> {
    const { fetchAppData } = await import("./api.js");
    this.data = await fetchAppData(live);
    this.render();
    this.schedulePolling();
  }

  private renderLoading(): void {
    this.root.innerHTML = `
      <div class="loading">
        <div class="loading__pulse"></div>
        <p>Loading predictions…</p>
      </div>
    `;
  }

  private setView(view: View): void {
    this.view = view;
    this.render();
    this.schedulePolling();
  }

  private toggleExpand(id: number): void {
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
    this.render();
  }

  private getUpcoming(): Array<{ fixture: Fixture; prediction?: LockedPrediction }> {
    if (!this.data) return [];
    return this.data.fixtures
      .filter((f) => f.status === "SCHEDULED" || f.status === "LIVE" || isEffectivelyLive(f))
      .map((f) => ({
        fixture: f,
        prediction: this.data!.predictions[String(f.id)],
      }))
      .sort((a, b) => {
        const aLive = isEffectivelyLive(a.fixture);
        const bLive = isEffectivelyLive(b.fixture);
        if (aLive && !bLive) return -1;
        if (bLive && !aLive) return 1;
        return a.fixture.utcDate.localeCompare(b.fixture.utcDate);
      });
  }

  private getResults(): Array<{
    fixture: Fixture;
    prediction?: LockedPrediction;
    grading?: { outcomeCorrect: boolean; exactScore: boolean; brierScore: number };
  }> {
    if (!this.data) return [];
    const gradingMap = new Map(
      this.data.stats?.gradings.map((g) => [g.matchId, g]) ?? []
    );
    return this.data.fixtures
      .filter((f) => f.status === "FINISHED")
      .map((f) => {
        const g = gradingMap.get(f.id);
        return {
          fixture: f,
          prediction: this.data!.predictions[String(f.id)],
          grading: g
            ? {
                outcomeCorrect: g.outcomeCorrect,
                exactScore: g.exactScore,
                brierScore: g.brierScore,
              }
            : undefined,
        };
      })
      .sort((a, b) => b.fixture.utcDate.localeCompare(a.fixture.utcDate));
  }

  private renderProbBar(pred: LockedPrediction, homeTla: string, awayTla: string): string {
    const { home, draw, away } = pred.final.probabilities;
    return `
      <div class="prob-bar" role="img" aria-label="${homeTla} ${home}%, Draw ${draw}%, ${awayTla} ${away}%">
        <div class="prob-bar__home" style="width:${home}%"></div>
        <div class="prob-bar__draw" style="width:${draw}%"></div>
        <div class="prob-bar__away" style="width:${away}%"></div>
      </div>
      <div class="prob-labels">
        <span>${homeTla} <strong>${home}%</strong></span>
        <span>Draw <strong>${draw}%</strong></span>
        <span>${awayTla} <strong>${away}%</strong></span>
      </div>
    `;
  }

  private renderMatchCard(
    fixture: Fixture,
    prediction?: LockedPrediction,
    mode: "upcoming" | "result" = "upcoming",
    grading?: { outcomeCorrect: boolean; exactScore: boolean; brierScore: number }
  ): string {
    const { local } = formatKickoff(fixture.utcDate);
    const locked = isLocked(fixture, prediction);
    const expanded = this.expanded.has(fixture.id);
    const hasPred = !!prediction;

    const isLive = isEffectivelyLive(fixture);
    const liveScore = fixture.score
      ? `${fixture.score.home}–${fixture.score.away}`
      : null;
    const liveScorePending = isLive && !liveScore;
    const predScore = hasPred
      ? `${prediction!.final.scoreline.home}–${prediction!.final.scoreline.away}`
      : null;

    const scoreDisplay = isLive
      ? liveScore ?? "–"
      : predScore ?? "—";

    const predHint =
      isLive && liveScore && predScore
        ? `<span class="match-card__pred-hint">Pred ${predScore}</span>`
        : "";

    const liveMinute = isLive ? formatLiveMinute(fixture) ?? "LIVE" : "";

    const confidence = hasPred ? prediction!.final.confidence : "";
    const lockStatus = !hasPred
      ? `<span class="badge badge--pending">Awaiting prediction</span>`
      : locked
        ? `<span class="badge badge--locked">Locked ${new Date(prediction!.lockedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>`
        : `<span class="badge badge--open">Locks at kick-off · ${timeUntilKickoff(fixture.utcDate)}</span>`;

    const resultBadge =
      mode === "result" && grading
        ? `<span class="badge ${grading.outcomeCorrect ? "badge--hit" : "badge--miss"}">${grading.outcomeCorrect ? "✓ Outcome" : "✗ Outcome"}${grading.exactScore ? " · Exact score!" : ""}</span>`
        : "";

    const actualScore =
      mode === "result" && fixture.score
        ? `<div class="actual-score">Final: <strong>${fixture.score.home}–${fixture.score.away}</strong></div>`
        : "";

    const sources =
      hasPred && prediction!.adjustment?.sources?.length
        ? `<ul class="rationale__sources">${prediction!.adjustment.sources
            .map((u) => `<li><a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(new URL(u).hostname)}</a></li>`)
            .join("")}</ul>`
        : "";

    const rationale = hasPred && expanded
      ? `<div class="rationale">
          <p>${escapeHtml(prediction!.final.rationale)}</p>
          ${prediction!.source === "baseline" ? '<span class="rationale__tag">Elo baseline</span>' : '<span class="rationale__tag">LLM-adjusted</span>'}
          ${sources}
          ${fixture.venue ? `<span class="rationale__venue">${escapeHtml(fixture.venue)}</span>` : ""}
        </div>`
      : "";

    return `
      <article class="match-card ${mode === "result" ? "match-card--result" : ""} ${isLive ? "match-card--live" : ""}" data-id="${fixture.id}">
        <div class="match-card__meta">
          ${fixture.group ? `<span class="group">Group ${fixture.group}</span>` : `<span class="group">${fixture.stage.replace(/_/g, " ")}</span>`}
          ${isLive ? `<span class="badge badge--live"><span class="live-dot"></span>${liveMinute}</span>${liveScorePending ? '<span class="badge badge--live-delay">Score updating</span>' : ""}` : `<time datetime="${fixture.utcDate}">${local}</time>`}
        </div>
        <div class="match-card__teams">
          <div class="team team--home">
            <span class="team__tla">${fixture.homeTeam.tla}</span>
            <span class="team__name">${escapeHtml(fixture.homeTeam.shortName)}</span>
          </div>
          <div class="match-card__scoreline ${isLive ? "match-card__scoreline--live" : ""}">${scoreDisplay}${predHint}</div>
          <div class="team team--away">
            <span class="team__tla">${fixture.awayTeam.tla}</span>
            <span class="team__name">${escapeHtml(fixture.awayTeam.shortName)}</span>
          </div>
        </div>
        ${hasPred ? this.renderProbBar(prediction!, fixture.homeTeam.tla, fixture.awayTeam.tla) : '<div class="no-pred">Prediction generates 2–4h before kick-off</div>'}
        <div class="match-card__footer">
          <div class="match-card__badges">
            ${lockStatus}
            ${resultBadge}
            ${hasPred ? `<span class="badge badge--conf badge--conf-${confidence}">${confidence} confidence</span>` : ""}
          </div>
          ${actualScore}
          ${hasPred ? `<button class="expand-btn" aria-expanded="${expanded}" aria-label="Show rationale">${expanded ? "Hide why" : "Why?"}</button>` : ""}
        </div>
        ${rationale}
      </article>
    `;
  }

  private renderUpcoming(): string {
    const matches = this.getUpcoming();
    if (!matches.length) {
      return `<div class="empty"><p>No upcoming fixtures right now.</p></div>`;
    }
    return matches.map((m) => this.renderMatchCard(m.fixture, m.prediction)).join("");
  }

  private renderResults(): string {
    const matches = this.getResults();
    if (!matches.length) {
      return `<div class="empty"><p>No results yet — tournament starts today.</p></div>`;
    }
    return matches
      .map((m) => this.renderMatchCard(m.fixture, m.prediction, "result", m.grading))
      .join("");
  }

  private renderAccuracy(): string {
    const stats = this.data?.stats;
    if (!stats || stats.totalMatches === 0) {
      return `<div class="empty"><p>Accuracy stats appear after the first settled match.</p></div>`;
    }

    const brierDelta = stats.avgBrierScore - stats.baselineAvgBrierScore;
    const brierBetter = brierDelta < 0;

    return `
      <div class="accuracy-dashboard">
        <div class="stat-hero">
          <div class="stat-hero__value">${stats.outcomeAccuracy}%</div>
          <div class="stat-hero__label">Outcome accuracy</div>
          <div class="stat-hero__sub">${stats.totalMatches} matches graded</div>
        </div>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-card__value">${stats.exactScoreRate}%</div>
            <div class="stat-card__label">Exact score</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${stats.avgBrierScore}</div>
            <div class="stat-card__label">Avg Brier</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${stats.baselineOutcomeAccuracy}%</div>
            <div class="stat-card__label">Elo-only accuracy</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${stats.baselineAvgBrierScore}</div>
            <div class="stat-card__label">Elo-only Brier</div>
          </div>
        </div>
        <div class="comparison ${brierBetter ? "comparison--better" : "comparison--worse"}">
          Model Brier vs Elo baseline: <strong>${brierBetter ? "beating" : "trailing"}</strong> by ${Math.abs(brierDelta).toFixed(3)}
        </div>
        <p class="accuracy-note">Predictions lock before kick-off. Brier score measures calibration — a 55% favourite losing isn't the same as a 90% upset.</p>
      </div>
    `;
  }

  render(): void {
    if (!this.data) return;

    const content =
      this.view === "upcoming"
        ? this.renderUpcoming()
        : this.view === "results"
          ? this.renderResults()
          : this.renderAccuracy();

    this.root.innerHTML = `
      <header class="header">
        <div class="header__brand">
          <span class="header__wc">WC</span>
          <div>
            <h1>26 Predictor</h1>
            <p class="header__tagline">Locked before kick-off · Tracked for accuracy</p>
          </div>
        </div>
      </header>
      <main class="main" id="main">${content}</main>
      <nav class="bottom-nav" aria-label="Main navigation">
        <button class="bottom-nav__btn ${this.view === "upcoming" ? "bottom-nav__btn--active" : ""}" data-view="upcoming" aria-current="${this.view === "upcoming"}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Upcoming</span>
        </button>
        <button class="bottom-nav__btn ${this.view === "results" ? "bottom-nav__btn--active" : ""}" data-view="results" aria-current="${this.view === "results"}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>Results</span>
        </button>
        <button class="bottom-nav__btn ${this.view === "accuracy" ? "bottom-nav__btn--active" : ""}" data-view="accuracy" aria-current="${this.view === "accuracy"}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span>Accuracy</span>
        </button>
      </nav>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.root.querySelectorAll(".bottom-nav__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = (btn as HTMLElement).dataset.view as View;
        this.setView(view);
      });
    });

    this.root.querySelectorAll(".expand-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = (e.target as HTMLElement).closest(".match-card");
        const id = Number((card as HTMLElement)?.dataset.id);
        if (id) this.toggleExpand(id);
      });
    });
  }
}
