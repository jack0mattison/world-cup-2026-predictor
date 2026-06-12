export function renderHowItWorks(): string {
  return `
    <div class="how-page">
      <p class="how-page__intro">
        Every prediction is locked before kick-off and graded after the final whistle.
        Here's how they're built.
      </p>

      <section class="how-card">
        <h2 class="how-card__title">Two passes</h2>
        <ol class="how-timeline">
          <li>
            <span class="how-timeline__when">4–12h before</span>
            <strong>Early estimate</strong> — Elo + Poisson only. Fast, no news APIs.
          </li>
          <li>
            <span class="how-timeline__when">2–4h before</span>
            <strong>Final prediction</strong> — same baseline, refined with live team news via Brave Search + LLM.
          </li>
        </ol>
        <p class="how-card__note">Only the final prediction counts toward accuracy.</p>
      </section>

      <section class="how-card">
        <h2 class="how-card__title">Layer 1 · Elo + Poisson</h2>
        <p>The statistical foundation — always runs first.</p>
        <ul class="how-list">
          <li><strong>Elo ratings</strong> estimate each team's strength and produce win / draw / loss probabilities.</li>
          <li><strong>Poisson model</strong> turns that strength gap into expected goals and a most likely scoreline (e.g. 2–0).</li>
          <li>Home advantage (+65 Elo) and group-stage draw rates (~24%) are baked in.</li>
        </ul>
      </section>

      <section class="how-card">
        <h2 class="how-card__title">Layer 2 · Brave Search</h2>
        <p>Before the final prediction, five targeted searches gather context:</p>
        <ul class="how-list">
          <li>Lineups and team news</li>
          <li>Injuries and suspensions (each side)</li>
          <li>Form and match preview</li>
          <li>Venue weather or group-stakes context</li>
        </ul>
      </section>

      <section class="how-card">
        <h2 class="how-card__title">Layer 3 · LLM adjustment</h2>
        <p>An LLM reads the Elo baseline plus search snippets and returns a <em>small</em> bounded shift:</p>
        <ul class="how-list">
          <li>Probabilities move at most ±10 percentage points per outcome</li>
          <li>Scoreline shifts by at most ±2 goals per side</li>
          <li>A short rationale and source links are attached</li>
        </ul>
        <p class="how-card__note">If news is thin or APIs fail, the Elo baseline is used as-is.</p>
      </section>

      <section class="how-card">
        <h2 class="how-card__title">After the match</h2>
        <ul class="how-list">
          <li><strong>Outcome</strong> — did we pick the right winner (or draw)?</li>
          <li><strong>Exact score</strong> — did we nail the scoreline?</li>
          <li><strong>Within 1 goal</strong> — predicted score off by at most one goal in total (e.g. 2–0 vs 2–1).</li>
          <li><strong>Brier score</strong> — how well-calibrated were the probabilities? (A 55% favourite losing scores better than a 90% upset.)</li>
        </ul>
      </section>

      <p class="how-page__contact">
        Questions or feedback?
        <a href="mailto:jack0mattison@gmail.com">Email the creator</a>
      </p>
    </div>
  `;
}
