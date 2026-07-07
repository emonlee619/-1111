import { cn } from "@/lib/cn";

type ModuleOverviewLayoutProps = {
  header?: React.ReactNode;
  tabs?: React.ReactNode;
  metrics?: React.ReactNode;
  cockpit?: React.ReactNode;
  quickActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export function ModuleOverviewLayout({
  header,
  tabs,
  metrics,
  cockpit,
  quickActions,
  children,
  className,
}: ModuleOverviewLayoutProps) {
  return (
    <div className={cn("grid min-w-0 gap-5", className)}>
      {header}
      {tabs}
      {metrics}
      {cockpit}
      {children}
      {quickActions}
    </div>
  );
}
