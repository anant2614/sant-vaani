export const PATH_DAYS = 7;

export type PathDayState = { day: number; clipLive: boolean | null };

/** What stops a path from being published; empty when every day has a live clip. */
export function pathProblems(days: PathDayState[]): string[] {
  const problems: string[] = [];
  for (let day = 1; day <= PATH_DAYS; day++) {
    const state = days.find((d) => d.day === day);
    if (!state || state.clipLive === null) problems.push(`Day ${day} needs a clip.`);
    else if (!state.clipLive) problems.push(`Day ${day} has a clip that is not live.`);
  }
  return problems;
}
