import { mockDoublePrevention } from "@/data/mockDoublePrevention";

const UPDATED_AT = "2026-07-05";
const BOUNDARY = "演示数据，不接真实生产系统；模型输出仅为辅助字段";

type DoublePreventionEndpoint =
  | "overview"
  | "risk-controls"
  | "risk-map"
  | "risk-cards"
  | "measures"
  | "measure-library"
  | "hazards"
  | "hazard-ledger"
  | "workflow"
  | "escalations"
  | "reviews"
  | "config"
  | "culture-board";

type ApiOkResponse = {
  ok: true;
  module: "double-prevention";
  endpoint: string;
  data: unknown;
  meta: {
    source: "mock";
    apiMode: "mock";
    writeEnabled: false;
    contractVersion: "double-prevention-readonly-v1";
    productionReady: false;
    updatedAt: string;
    boundary: string;
  };
};

type ApiNotFoundResponse = {
  ok: false;
  message: "Double prevention resource not found";
};

export type DoublePreventionApiResult =
  | { status: 200; body: ApiOkResponse }
  | { status: 404; body: ApiNotFoundResponse };

function normalizeCardId(id: string) {
  const normalized = id.trim().toUpperCase();
  if (/^RC\d+$/.test(normalized)) {
    return `CARD-${normalized.slice(2).padStart(3, "0")}`;
  }
  if (/^RC-\d+$/.test(normalized)) {
    return `CARD-${normalized.split("-")[1].padStart(3, "0")}`;
  }
  return normalized;
}

function normalizeHazardId(id: string) {
  const normalized = id.trim().toUpperCase();
  if (/^H\d+$/.test(normalized)) {
    return `HZ-${normalized.slice(1).padStart(3, "0")}`;
  }
  return normalized;
}

function ok(endpoint: string, data: unknown): DoublePreventionApiResult {
  return {
    status: 200,
    body: {
      ok: true,
      module: "double-prevention",
      endpoint,
      data,
      meta: {
        source: "mock",
        apiMode: "mock",
        writeEnabled: false,
        contractVersion: "double-prevention-readonly-v1",
        productionReady: false,
        updatedAt: UPDATED_AT,
        boundary: BOUNDARY,
      },
    },
  };
}

function notFound(): DoublePreventionApiResult {
  return {
    status: 404,
    body: {
      ok: false,
      message: "Double prevention resource not found",
    },
  };
}

function overview() {
  return {
    riskControlCount: mockDoublePrevention.riskControls.length,
    riskMapCount: mockDoublePrevention.riskMap.length,
    riskCardCount: mockDoublePrevention.riskCards.length,
    measureCount: mockDoublePrevention.measures.length,
    hazardCount: mockDoublePrevention.hazards.length,
    overdueCount: mockDoublePrevention.overdueItems.length,
    reviewCount: mockDoublePrevention.reviews.length,
    sourceTypes: ["real_sensor", "physics_constrained", "static_prior", "manual_check"],
    boundary: BOUNDARY,
  };
}

function endpointData(endpoint: DoublePreventionEndpoint) {
  switch (endpoint) {
    case "overview":
      return overview();
    case "risk-controls":
      return mockDoublePrevention.riskControls;
    case "risk-map":
      return mockDoublePrevention.riskMap;
    case "risk-cards":
      return mockDoublePrevention.riskCards;
    case "measures":
    case "measure-library":
      return mockDoublePrevention.measures;
    case "hazards":
    case "hazard-ledger":
      return mockDoublePrevention.hazards;
    case "workflow":
      return mockDoublePrevention.workflowSteps;
    case "escalations":
      return mockDoublePrevention.overdueItems;
    case "reviews":
      return mockDoublePrevention.reviews;
    case "config":
      return mockDoublePrevention.config;
    case "culture-board":
      return mockDoublePrevention.cultureBoard;
    default:
      return undefined;
  }
}

export function resolveDoublePreventionApi(pathSegments: string[]): DoublePreventionApiResult {
  const [endpoint, id] = pathSegments;

  if (!endpoint) {
    return notFound();
  }

  if (endpoint === "risk-cards" && id) {
    const cardId = normalizeCardId(id);
    const card = mockDoublePrevention.riskCards.find((item) => item.id === cardId);
    return card ? ok("risk-cards", card) : notFound();
  }

  if ((endpoint === "hazards" || endpoint === "hazard-ledger") && id) {
    const hazardId = normalizeHazardId(id);
    const hazard = mockDoublePrevention.hazards.find((item) => item.id === hazardId);
    return hazard ? ok(endpoint, hazard) : notFound();
  }

  if (id) {
    return notFound();
  }

  const data = endpointData(endpoint as DoublePreventionEndpoint);
  return data === undefined ? notFound() : ok(endpoint, data);
}
