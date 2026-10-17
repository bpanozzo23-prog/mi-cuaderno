import { useEffect, useState } from "react";
import { localDate } from "./lib/dates.js";

const currentDate = () => new Date();

/** A calendar day can change without any notebook data changing. Dependencies are
 * injectable so rollover and waking from browser sleep need no fake timers in tests. */
export function useLocalDay({ now = currentDate, schedule = setTimeout, cancel = clearTimeout } = {}) {
  const [day, setDay] = useState(() => localDate(now()));

  useEffect(() => {
    let alive = true;
    let timer;
    function refresh() {
      if (!alive) return;
      cancel(timer);
      const date = now();
      setDay(localDate(date));
      // Local calendar components account for 23/25-hour days and timezone changes.
      const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      timer = schedule(refresh, Math.max(1, midnight.getTime() - date.getTime()));
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      cancel(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [now, schedule, cancel]);

  return day;
}
