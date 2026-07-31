// Gives Node an in-memory IndexedDB so the Dexie code under test is the real thing.
import "fake-indexeddb/auto";

/**
 * The reference layer keeps its active-slot pointer in localStorage, which the node test
 * environment does not provide. It is deliberately synchronous — every dictionary read
 * calls activeDb(), and making that async would infect every call site — so it is
 * polyfilled here rather than the app being reshaped around the test runner.
 */
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
}
