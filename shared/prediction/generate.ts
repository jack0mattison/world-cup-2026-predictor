import { isLlmLayerEnabled } from "../config.js";
import { gatherMatchContext } from "../context/gather.js";
import type { Fixture, LockedPrediction } from "../types.js";
import { applyAdjustment } from "./adjust.js";
import { generateBaselinePrediction } from "./baseline.js";
import { fetchLlmAdjustment } from "./llm.js";

export async function generatePrediction(fixture: Fixture): Promise<LockedPrediction> {
  const baselinePred = generateBaselinePrediction(fixture);

  if (!isLlmLayerEnabled()) {
    return baselinePred;
  }

  const braveKey = process.env.BRAVE_SEARCH_API_KEY!.trim();

  try {
    const context = await gatherMatchContext(fixture, braveKey);

    if (context.snippets.length === 0) {
      console.warn(`No Brave context for ${fixture.homeTeam.tla} vs ${fixture.awayTeam.tla}`);
      return baselinePred;
    }

    const adjustment = await fetchLlmAdjustment(fixture, baselinePred.baseline, context);
    if (!adjustment) {
      console.warn(`LLM adjustment parse failed for match ${fixture.id}`);
      return baselinePred;
    }

    const adjusted = applyAdjustment(fixture, baselinePred, adjustment);
    console.log(
      `LLM-adjusted ${fixture.homeTeam.tla} vs ${fixture.awayTeam.tla}:`,
      adjusted.final.probabilities,
      `(${adjustment.contextQuality})`
    );
    return adjusted;
  } catch (err) {
    console.error(
      `LLM layer failed for ${fixture.homeTeam.tla} vs ${fixture.awayTeam.tla}, using baseline:`,
      err
    );
    return baselinePred;
  }
}
