import { cn } from "@/lib/cn";

export function ResponsiveTableWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("console-scrollbar min-w-0 max-w-full overflow-x-auto", className)}>
      <div className="min-w-full">{children}</div>
    </div>
  );
}
