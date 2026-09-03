import { expect, it, vi } from "vitest";
import { deferred, settleAsyncCalls } from "./async.js";

it("keeps a controlled operation pending until its gate is released", async () => {
  const gate = deferred();
  const operation = vi.fn(() => gate.promise);
  operation();
  let finished = false;
  const settling = settleAsyncCalls(operation).then(() => { finished = true; });
  await Promise.resolve();
  expect(finished).toBe(false);
  gate.resolve("done");
  await settling;
  expect(finished).toBe(true);
  expect(operation).toHaveBeenCalledTimes(1);
});

it("discovers a separately queued follow-up instead of only awaiting the initial snapshot", async () => {
  const firstGate = deferred();
  const secondGate = deferred();
  const secondStarted = deferred();
  const second = vi.fn(() => { secondStarted.resolve(); return secondGate.promise; });
  const first = vi.fn(() => firstGate.promise);
  // Deliberately do not return second(): first must not implicitly adopt the follow-up.
  first().then(() => { second(); });
  const failure = new Error("follow-up failed");
  const settling = expect(settleAsyncCalls(first, second)).rejects.toMatchObject({ errors: [failure] });
  firstGate.resolve();
  await secondStarted.promise;
  const secondFailure = expect(secondGate.promise).rejects.toBe(failure);
  secondGate.reject(failure);
  await secondFailure;
  await settling;
  expect(second).toHaveBeenCalledTimes(1);
});

it("finishes other tracked work before reporting a rejection", async () => {
  const gate = deferred();
  const failed = vi.fn(() => Promise.reject(new Error("write failed")));
  const pending = vi.fn(() => gate.promise);
  failed();
  pending();
  let finished = false;
  const settling = settleAsyncCalls(failed, pending).catch((error) => { finished = true; return error; });
  await Promise.resolve();
  expect(finished).toBe(false);
  gate.resolve();
  const error = await settling;
  expect(error).toBeInstanceOf(AggregateError);
  expect(error.errors.map((entry) => entry.message)).toEqual(["write failed"]);
});
