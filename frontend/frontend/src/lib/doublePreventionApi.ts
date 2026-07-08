import type {
  DoublePreventionConfig,
  DoublePreventionCultureBoard,
  HazardLedgerItem,
  MeasureLibraryItem,
  OverdueEscalationItem,
  ReviewCase,
  RiskCard,
  RiskControlItem,
  RiskMapCell,
  WorkflowStep,
} from "@/types/business";

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  message?: string;
  meta?: {
    source: "mock";
    apiMode: "mock";
    writeEnabled: false;
    contractVersion: string;
    productionReady: false;
    boundary: string;
  };
};

export type DoublePreventionOverview = {
  riskControlCount: number;
  riskMapCount: number;
  riskCardCount: number;
  measureCount: number;
  hazardCount: number;
  overdueCount: number;
  reviewCount: number;
  sourceTypes: string[];
  boundary: string;
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`/api/double-prevention/${path}`, { cache: "no-store" });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? `double-prevention ${response.status}`);
  }
  return payload.data as T;
}

export function fetchDoublePreventionOverview() {
  return request<DoublePreventionOverview>("overview");
}

export function fetchRiskControls() {
  return request<RiskControlItem[]>("risk-controls");
}

export function fetchRiskMap() {
  return request<RiskMapCell[]>("risk-map");
}

export function fetchRiskCards() {
  return request<RiskCard[]>("risk-cards");
}

export function fetchRiskCard(id: string) {
  return request<RiskCard>(`risk-cards/${encodeURIComponent(id)}`);
}

export function fetchMeasures() {
  return request<MeasureLibraryItem[]>("measures");
}

export function fetchHazards() {
  return request<HazardLedgerItem[]>("hazards");
}

export function fetchHazard(id: string) {
  return request<HazardLedgerItem>(`hazard-ledger/${encodeURIComponent(id)}`);
}

export function fetchWorkflow() {
  return request<WorkflowStep[]>("workflow");
}

export function fetchEscalations() {
  return request<OverdueEscalationItem[]>("escalations");
}

export function fetchReviews() {
  return request<ReviewCase[]>("reviews");
}

export function fetchConfig() {
  return request<DoublePreventionConfig>("config");
}

export function fetchCultureBoard() {
  return request<DoublePreventionCultureBoard>("culture-board");
}
