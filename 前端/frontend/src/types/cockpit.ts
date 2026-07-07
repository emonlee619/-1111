import type { ReactNode } from "react";
import type { MetricCardModel, NavigationGroup, NavigationItem } from "./navigation";
import type { RiskLevel, StatusTone } from "./risk";

export type CockpitMetric = MetricCardModel;

export type CockpitMetricView = MetricCardModel & {
  unit?: string;
  status?: string;
  icon?: ReactNode;
  tone?: "cyan" | "blue" | "green" | "amber" | "red";
  risk?: RiskLevel;
};

export type ModuleTabItem = NavigationItem;

export type ModuleTabsSource = {
  group?: NavigationGroup;
  items?: ModuleTabItem[];
  activeItem?: ModuleTabItem;
};

export type CockpitAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  description?: string;
  tone?: StatusTone | "primary";
  disabled?: boolean;
  ariaLabel?: string;
};

export type HeroLegendItem = {
  label: string;
  value?: string;
  tone?: StatusTone | "primary";
};

export type InsightPanel = {
  title: string;
  description?: string;
  badge?: string;
  tone?: StatusTone;
  children: ReactNode;
};

export type QuickActionItem = CockpitAction & {
  status?: string;
};

export type DockStatusItem = {
  label: string;
  value: string;
  tone?: StatusTone | "primary";
};

export type DetailDrawerItem = {
  label: string;
  value: ReactNode;
};

export type DetailDrawerSection = {
  title: string;
  description?: string;
  items?: DetailDrawerItem[];
  children?: ReactNode;
};
