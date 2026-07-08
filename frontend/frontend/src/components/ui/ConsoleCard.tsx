import { cn } from "@/lib/cn";
import { cleanDisplayCopy } from "@/utils/displayText";

type ConsoleCardProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function ConsoleCard({ title, description, children, className }: ConsoleCardProps) {
  return (
    <section className={cn("min-w-0 rounded-card border border-line bg-surface p-4 shadow-soft transition hover:border-orange-200/80 hover:shadow-card sm:p-5", className)}>
      {title ? (
        <div className="mb-4 min-w-0">
          <h2 className="break-words text-base font-semibold text-ink">{cleanDisplayCopy(title)}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-muted">{cleanDisplayCopy(description)}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
