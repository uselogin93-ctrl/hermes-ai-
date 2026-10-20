export type WeekBucket = {
  /** First day of the window, YYYY-MM-DD. */
  start: string;
  /** Short label for the window, for example "12 Aug". */
  label: string;
  count: number;
};

/**
 * Posts per week for the last eight weeks.
 *
 * Plain divs on purpose: a bar list is easier to read here than a chart, and
 * it keeps the screen free of another charting library.
 */
export function PostingFrequency({ weeks }: { weeks: WeekBucket[] }) {
  const max = weeks.reduce((highest, week) => Math.max(highest, week.count), 0);

  return (
    <div className="flex items-end gap-1.5">
      {weeks.map((week) => {
        const height = week.count > 0 && max > 0 ? Math.max(10, Math.round((week.count / max) * 100)) : 2;
        return (
          <div key={week.start} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="numeric text-[11px] text-muted-foreground">{week.count}</span>
            <div className="flex h-16 w-full items-end rounded-sm bg-surface-muted">
              <div
                className="w-full rounded-sm bg-accent"
                style={{ height: `${height}%` }}
                title={`${week.label}: ${week.count} post(s)`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{week.label}</span>
          </div>
        );
      })}
    </div>
  );
}
