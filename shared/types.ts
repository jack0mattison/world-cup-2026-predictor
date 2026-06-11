export type MatchStage =
  | "GROUP_STAGE"
  | "LAST_32"
  | "LAST_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "THIRD_PLACE"
  | "FINAL";

export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED";

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest?: string;
}

export interface Fixture {
  id: number;
  utcDate: string;
  status: MatchStatus;
  stage: MatchStage;
  group?: string;
  homeTeam: Team;
  awayTeam: Team;
  venue?: string;
  matchday?: number;
  knockout: boolean;
  score?: {
    home: number | null;
    away: number | null;
    winner?: "HOME" | "AWAY" | "DRAW";
  };
}

export type Confidence = "low" | "medium" | "high";

export interface PredictionProbabilities {
  home: number;
  draw: number;
  away: number;
}

export interface PredictedScoreline {
  home: number;
  away: number;
}

export interface BaselinePrediction {
  probabilities: PredictionProbabilities;
  scoreline: PredictedScoreline;
  homeElo: number;
  awayElo: number;
  extraTimeLikely?: boolean;
}

export interface LlmAdjustment {
  probabilityShift: PredictionProbabilities;
  scorelineShift: { home: number; away: number };
  confidence: Confidence;
  rationale: string;
  sources: string[];
  contextQuality: "thin" | "moderate" | "rich";
  note?: string;
}

export interface LockedPrediction {
  matchId: number;
  generatedAt: string;
  lockedAt: string;
  kickoff: string;
  baseline: BaselinePrediction;
  adjustment?: LlmAdjustment;
  final: {
    probabilities: PredictionProbabilities;
    scoreline: PredictedScoreline;
    confidence: Confidence;
    rationale: string;
  };
  source: "baseline" | "llm-adjusted";
}

export interface MatchResult {
  matchId: number;
  homeScore: number;
  awayScore: number;
  winner: "HOME" | "AWAY" | "DRAW";
  settledAt: string;
}

export interface MatchGrading {
  matchId: number;
  outcomeCorrect: boolean;
  baselineOutcomeCorrect: boolean;
  exactScore: boolean;
  brierScore: number;
  baselineBrierScore: number;
  predictedOutcome: "HOME" | "DRAW" | "AWAY";
  baselinePredictedOutcome: "HOME" | "DRAW" | "AWAY";
  actualOutcome: "HOME" | "AWAY" | "DRAW";
}

export interface AccuracyStats {
  updatedAt: string;
  totalMatches: number;
  outcomeAccuracy: number;
  exactScoreRate: number;
  avgBrierScore: number;
  baselineOutcomeAccuracy: number;
  baselineAvgBrierScore: number;
  gradings: MatchGrading[];
}

export interface AppData {
  fixtures: Fixture[];
  predictions: Record<string, LockedPrediction>;
  results: Record<string, MatchResult>;
  stats: AccuracyStats | null;
  lastRefreshed: string;
}
