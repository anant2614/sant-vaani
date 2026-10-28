import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Clock = () => Date;

const ClockContext = createContext<Clock>(() => new Date());

/** Lets tests and screenshots fix the time; the app uses the real clock. */
export function ClockProvider({ clock, children }: { clock?: Clock; children: ReactNode }) {
  return <ClockContext.Provider value={clock ?? (() => new Date())}>{children}</ClockContext.Provider>;
}

export function useClock(): Clock {
  return useContext(ClockContext);
}

/** The current time, updated at the start of each minute. */
export function useNow(): Date {
  const clock = useClock();
  const [now, setNow] = useState(clock);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = clock();
      setNow(current);
      timer = setTimeout(tick, 60_000 - (current.getTime() % 60_000) + 50);
    };
    timer = setTimeout(tick, 60_000 - (clock().getTime() % 60_000) + 50);
    return () => clearTimeout(timer);
  }, [clock]);
  return now;
}
