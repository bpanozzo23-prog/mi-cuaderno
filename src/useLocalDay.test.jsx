// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useLocalDay } from "./useLocalDay.js";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("refreshes at midnight, on focus and on becoming visible, and cleans up", () => {
  let date = new Date(2026, 9, 17, 23, 59, 59);
  const now = () => date;
  const scheduled = [];
  const schedule = vi.fn((callback, delay) => { const timer = { callback, delay }; scheduled.push(timer); return timer; });
  const cancel = vi.fn();
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const { result, unmount } = renderHook(() => useLocalDay({ now, schedule, cancel }));
  expect(result.current).toBe("2026-10-17");
  expect(scheduled.at(-1).delay).toBe(1000);
  const first = scheduled.at(-1);
  date = new Date(2026, 9, 18, 0, 0, 0);
  act(() => first.callback());
  expect(result.current).toBe("2026-10-18");
  expect(cancel).toHaveBeenCalledWith(first);

  date = new Date(2026, 9, 20, 12);
  act(() => window.dispatchEvent(new Event("focus")));
  expect(result.current).toBe("2026-10-20");
  date = new Date(2026, 9, 21, 12);
  visibility.mockReturnValue("hidden");
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(result.current).toBe("2026-10-20");
  visibility.mockReturnValue("visible");
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(result.current).toBe("2026-10-21");
  const last = scheduled.at(-1);
  unmount();
  expect(cancel).toHaveBeenLastCalledWith(last);
  schedule.mockClear();
  act(() => { last.callback(); window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
  expect(schedule).not.toHaveBeenCalled();
});

it("does not rerender for an unchanged day and schedules the next local midnight", () => {
  const now = () => new Date(2026, 10, 1, 0, 30);
  const schedule = vi.fn();
  const cancel = vi.fn();
  const rendered = vi.fn();
  renderHook(() => { rendered(); return useLocalDay({ now, schedule, cancel }); });
  rendered.mockClear();
  act(() => window.dispatchEvent(new Event("focus")));
  expect(rendered).not.toHaveBeenCalled();
  expect(schedule.mock.calls.at(-1)[1]).toBe(new Date(2026, 10, 2).getTime() - now().getTime());
});
