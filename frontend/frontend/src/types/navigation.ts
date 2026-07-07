import type { RiskLevel, StatusTone } from "./risk";

export type NavigationItem = {
  title: string;
  href: string;
  demoHref?: string;
  visibleInTopNav?: boolean;
  visibleInSidebar?: boolean;
  isHidden?: boolean;
  description?: string;
  icon?: string;
};

export type NavigationGroup = {
  title: string;
  href?: string;
  icon: string;
  description?: string;
  status?: string;
  visibleInTopNav?: boolean;
  visibleInSidebar?: boolean;
  items: NavigationItem[];
  hiddenItems?: NavigationItem[];
};

export type MetricCardModel = {
  label: string;
  value: string;
  hint: string;
  trend?: string;
  risk?: RiskLevel;
};

export type FeatureCardModel = {
  title: string;
  description: string;
  status?: string;
  tone?: StatusTone;
};

export type RouteMeta = {
  path: string;
  title: string;
  module: string;
  description: string;
  status: string;
  metrics: MetricCardModel[];
  cards: FeatureCardModel[];
  notes?: string[];
  workflowSteps?: string[];
};
