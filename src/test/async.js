/** A test-owned gate: release it explicitly, including from failure-safe teardown. */
export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

/**
 * Await calls recorded by call-through spies, including calls started by their continuations.
 * Stop producers/release gates first. This is not a universal event-loop-idle detector: callers
 * with private save queues must also await their actual queue-tail/navigation promise.
 * In component tests, call inside act so returned values have reached the rendered UI.
 */
export async function settleAsyncCalls(...spies) {
  const seen = spies.map(() => 0);
  const errors = [];
  for (;;) {
    await Promise.resolve();
    const calls = spies.flatMap((spy, index) => {
      const results = spy.mock.results.slice(seen[index]);
      seen[index] += results.length;
      return results;
    });
    if (calls.length === 0) break;
    const settled = await Promise.allSettled(calls.map(({ type, value }) =>
      type === "throw" ? Promise.reject(value) : value
    ));
    errors.push(...settled.filter((result) => result.status === "rejected").map((result) => result.reason));
  }
  if (errors.length) throw new AggregateError(errors, "Tracked async work failed during settlement");
}
