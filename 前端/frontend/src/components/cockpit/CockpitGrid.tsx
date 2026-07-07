import { cn } from "@/lib/cn";

type CockpitGridProps = {
  left?: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
};

export function CockpitGrid({ left, center, right, className }: CockpitGridProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-4 xl:grid-cols-[minmax(220px,0.82fr)_minmax(0,1.7fr)_minmax(220px,0.82fr)]",
        className,
      )}
    >
      {left ? <aside className="order-2 min-w-0 xl:order-1">{left}</aside> : null}
      <div className="order-1 min-w-0 xl:order-2">{center}</div>
      {right ? <aside className="order-3 min-w-0">{right}</aside> : null}
    </div>
  );
}
