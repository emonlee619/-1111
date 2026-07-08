const OUTBURST_INTEGRATION_PREFIXES = [
  "/monitoring",
  "/warning",
  "/source-tracing",
  "/data",
  "/model",
  "/twin/sensors",
  "/twin/risk-heatmap",
];

export function isOutburstIntegrationPath(path: string) {
  return OUTBURST_INTEGRATION_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
