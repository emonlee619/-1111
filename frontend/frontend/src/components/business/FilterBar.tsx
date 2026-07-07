"use client";

type FilterOption = {
  label: string;
  value: string;
};

export type FilterConfig = {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
};

export function FilterBar({
  filters,
  onChange,
}: {
  filters: FilterConfig[];
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-3 rounded-card border border-line bg-surface p-4 shadow-soft sm:grid-cols-2 xl:grid-cols-3">
      {filters.map((filter) => (
        <label key={filter.key} className="min-w-0 text-sm font-medium text-ink">
          {filter.label}
          <select
            className="mt-2 min-h-10 w-full min-w-0 rounded-control border border-line bg-card px-3 py-2 text-sm text-ink outline-none transition hover:border-orange-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            value={filter.value}
            onChange={(event) => onChange(filter.key, event.target.value)}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
