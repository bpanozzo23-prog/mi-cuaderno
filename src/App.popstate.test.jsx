// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { clearAllPersonalData, db } from "./db/db.js";
import * as items from "./db/items.js";
import * as events from "./db/events.js";
import { removeDictionary } from "./db/ref/install.js";
import { createNavigation, historyStateWithNavigation } from "./lib/navigation.js";
import { localDate } from "./lib/dates.js";
import { deferred } from "./test/async.js";
let cuadernoProps;
vi.mock("./components/Cuaderno.jsx", async importOriginal => {
  const {
    default: Cuaderno
  } = await importOriginal();
  return {
    default: props => {
      cuadernoProps = props;
      return <Cuaderno {...props} />;
    }
  };
});
let reads, gate, writes;
beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
  await clearAllPersonalData();
  window.history.replaceState(null, "", "/");
  Object.defineProperty(window, "scrollTo", {
    value: vi.fn(),
    configurable: true
  });
  reads = [vi.spyOn(items, "allItems"), vi.spyOn(events, "allEvents")];
  writes = [vi.spyOn(events, "logView"), vi.spyOn(items, "createKeptPracticeEntry"), vi.spyOn(events, "logPracticeWrite"), vi.spyOn(items, "createItem"), vi.spyOn(items, "updateItem")];
  gate = deferred();
});
afterEach(async () => {
  cleanup();
  gate.resolve([]);
  await act(async () => {
    await Promise.allSettled([...reads, ...writes].flatMap(spy => spy.mock.results.map(({
      value
    }) => value)));
  });
  await removeDictionary();
  vi.restoreAllMocks();
});
async function beginPendingBack(user, fresh = false) {
  if (!fresh) await items.createItem(items.newPage({
    title: "Race note",
    body: "Antes.",
    pageDate: localDate()
  }));
  const view = render(<App />);
  await user.click(await screen.findByRole("button", {
    name: "Diario"
  }));
  if (fresh) await user.click(screen.getByRole("button", {
    name: "Write today"
  }));else {
    await user.click(screen.getByRole("button", {
      name: "Open Race note"
    }));
    await user.click(screen.getByRole("button", {
      name: "Edit journal entry"
    }));
  }
  fireEvent.change(screen.getByRole("textbox", {
    name: "Journal body"
  }), {
    target: {
      value: "Despu\xE9s del guardado."
    }
  });
  const readsBefore = reads[1].mock.calls.length;
  reads[1].mockImplementationOnce(() => gate.promise);
  act(() => window.history.back());
  await waitFor(() => expect(reads[1]).toHaveBeenCalledTimes(readsBefore + 1));
  expect((await db.items.toArray()).find(item => item.type === "page").body).toBe("Despu\xE9s del guardado.");
  return view;
}
function visibleScreen() {
  return [...document.querySelectorAll("section[aria-label$=\"surface\"]")].filter(el => !el.hidden).map(el => ({
    surface: el.getAttribute("aria-label"),
    editor: Boolean(el.querySelector("[aria-label=\"Journal body\"]")),
    reader: Boolean(el.querySelector("[aria-label=\"Edit journal entry\"]"))
  }));
}
it.each(["back", "forward", "tab"].flatMap(action => ["loaded", "failed"].map(outcome => [action, outcome])))("retains newer %s after older browser Back refresh is %s", async (action, outcome) => {
  const user = userEvent.setup();
  await beginPendingBack(user);
  if (action === "back") {
    act(() => window.history.back());
    await screen.findByRole("button", {
      name: "Open Race note"
    });
  } else if (action === "forward") {
    act(() => window.history.forward());
    await waitFor(() => expect(window.history.state.mcNavigation.stacks.diario.at(-1).screen).toBe("edit"));
  } else {
    await user.click(screen.getByRole("button", {
      name: "Repaso"
    }));
    await screen.findByRole("region", {
      name: "Repaso surface"
    });
  }
  const history = structuredClone(window.history.state.mcNavigation);
  const visible = visibleScreen();
  await act(async () => {
    if (outcome === "failed") gate.reject(new Error("controlled refresh failure"));else gate.resolve(await db.events.toArray());
  });
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(history);
  expect(visibleScreen()).toEqual(visible);
  expect((await db.items.toArray()).find(item => item.type === "page").body).toBe("Despu\xE9s del guardado.");
});
it("keeps browser history aligned after a new Journal materializes during Back", async () => {
  const user = userEvent.setup();
  await beginPendingBack(user, true);
  await act(async () => gate.resolve(await db.events.toArray()));
  await screen.findByRole("button", {
    name: "Continue"
  });
  expect(window.history.state.mcNavigation.stacks.diario.at(-1).screen).toBe("home");
  const saved = (await db.items.toArray())[0];
  act(() => window.history.forward());
  await screen.findByRole("textbox", {
    name: "Journal body"
  });
  expect(window.history.state.mcNavigation.stacks.diario.at(-1).id).toBe(saved.id);
  expect(screen.getByRole("textbox", {
    name: "Journal body"
  }).value).toBe(saved.body);
  expect(writes[3]).toHaveBeenCalledTimes(1);
});
it("restores the editor cursor when a newer Diario request refuses to leave", async () => {
  const user = userEvent.setup();
  await beginPendingBack(user);
  const sourceVisit = screen.getByRole("textbox", {
    name: "Journal body"
  });
  fireEvent.change(screen.getByLabelText("Journal date"), {
    target: {
      value: ""
    }
  });
  await user.click(screen.getByRole("button", {
    name: "Diario"
  }));
  await waitFor(() => expect(window.history.state.mcNavigation.stacks.diario.at(-1).screen).toBe("edit"));
  expect(screen.getByRole("textbox", {
    name: "Journal body"
  })).toBe(sourceVisit);
  const history = structuredClone(window.history.state.mcNavigation);
  await act(async () => gate.resolve(await db.events.toArray()));
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(history);
  expect(screen.getByLabelText("Journal date").value).toBe("");
});
it("lets the newer tab finish its second save before leaving the editor", async () => {
  const user = userEvent.setup();
  await beginPendingBack(user);
  fireEvent.change(screen.getByRole("textbox", {
    name: "Journal body"
  }), {
    target: {
      value: "Una segunda edici\xF3n."
    }
  });
  const second = deferred();
  try {
    reads[1].mockImplementationOnce(() => second.promise);
    await user.click(screen.getByRole("button", {
      name: "Repaso"
    }));
    const callsBefore = reads[1].mock.calls.length;
    await act(async () => gate.resolve(await db.events.toArray()));
    await waitFor(() => expect(reads[1]).toHaveBeenCalledTimes(callsBefore + 1));
    expect(screen.getByRole("textbox", {
      name: "Journal body"
    }).value).toBe("Una segunda edici\xF3n.");
    await act(async () => second.resolve(await db.events.toArray()));
    await screen.findByRole("region", {
      name: "Repaso surface"
    });
    expect(window.history.state.mcNavigation.activeTab).toBe("repaso");
    expect((await db.items.toArray())[0].body).toBe("Una segunda edici\xF3n.");
    expect(await db.items.count()).toBe(1);
    // The tab branches from the popped reader, so subsequent chronology uses that cursor.
    expect(window.history.state.mcNavigation.depth).toBe(3);
    act(() => window.history.back());
    await screen.findByRole("button", {
      name: "Edit journal entry"
    });
    expect(window.history.state.mcNavigation.depth).toBe(2);
  } finally {
    second.resolve([]);
  }
});
it("does not apply a pending Back after App unmounts", async () => {
  const user = userEvent.setup();
  const view = await beginPendingBack(user);
  const replace = vi.spyOn(window.history, "replaceState");
  const go = vi.spyOn(window.history, "go");
  await act(async () => view.unmount());
  await act(async () => gate.resolve(await db.events.toArray()));
  expect(replace).not.toHaveBeenCalled();
  expect(go).not.toHaveBeenCalled();
});
async function openExistingEditor(user, withForwardTab = false) {
  await items.createItem(items.newPage({
    title: "Race note",
    body: "Antes.",
    pageDate: localDate()
  }));
  render(<App />);
  await user.click(await screen.findByRole("button", {
    name: "Diario"
  }));
  await user.click(screen.getByRole("button", {
    name: "Open Race note"
  }));
  await user.click(screen.getByRole("button", {
    name: "Edit journal entry"
  }));
  if (withForwardTab) {
    await user.click(screen.getByRole("button", {
      name: "Repaso"
    }));
    act(() => window.history.back());
    await screen.findByRole("textbox", {
      name: "Journal body"
    });
  }
}
it("does not recover an obsolete failed Back after Forward returns to the editor", async () => {
  const user = userEvent.setup();
  await openExistingEditor(user, true);
  const writeGate = deferred();
  try {
    writes[4].mockImplementationOnce(() => writeGate.promise);
    fireEvent.change(screen.getByRole("textbox", {
      name: "Journal body"
    }), {
      target: {
        value: "Una edici\xF3n pendiente."
      }
    });
    act(() => window.history.back());
    await waitFor(() => expect(writes[4]).toHaveBeenCalledTimes(1));
    act(() => window.history.forward());
    await waitFor(() => expect(window.history.state.mcNavigation.stacks.diario.at(-1).screen).toBe("edit"));
    const history = structuredClone(window.history.state.mcNavigation);
    const go = vi.spyOn(window.history, "go");
    await act(async () => writeGate.reject(new Error("controlled write failure")));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Couldn\u2019t save \u2014 try again"));
    expect(go).not.toHaveBeenCalled();
    expect(window.history.state.mcNavigation).toEqual(history);
    expect(screen.getByRole("textbox", {
      name: "Journal body"
    }).value).toBe("Una edici\xF3n pendiente.");
  } finally {
    writeGate.reject(new Error("cleanup"));
  }
});
it.each([true, false])("recovers only the latest of two Back requests when the second write succeeds: %s", async succeeds => {
  const user = userEvent.setup();
  await openExistingEditor(user);
  const source = structuredClone(window.history.state.mcNavigation);
  const writeGate = deferred();
  try {
    writes[4].mockImplementationOnce(() => writeGate.promise);
    if (!succeeds) writes[4].mockRejectedValueOnce(new Error("second write failure"));
    fireEvent.change(screen.getByRole("textbox", {
      name: "Journal body"
    }), {
      target: {
        value: "Una edici\xF3n pendiente."
      }
    });
    act(() => window.history.back());
    await waitFor(() => expect(writes[4]).toHaveBeenCalledTimes(1));
    act(() => window.history.back());
    await waitFor(() => expect(window.history.state.mcNavigation.stacks.diario.at(-1).screen).toBe("home"));
    const go = vi.spyOn(window.history, "go");
    await act(async () => writeGate.reject(new Error("first write failure")));
    if (succeeds) {
      await waitFor(() => expect(cuadernoProps.notebook.items[0]?.body).toBe("Una edici\xF3n pendiente."));
      await screen.findByRole("button", {
        name: "Open Race note"
      });
      expect(go).not.toHaveBeenCalled();
      expect((await db.items.toArray())[0].body).toBe("Una edici\xF3n pendiente.");
    } else {
      await waitFor(() => expect(window.history.state.mcNavigation).toEqual(source));
      expect(go.mock.calls).toEqual([[2]]);
      expect(screen.getByRole("textbox", {
        name: "Journal body"
      }).value).toBe("Una edici\xF3n pendiente.");
      expect((await db.items.toArray())[0].body).toBe("Antes.");
    }
  } finally {
    writeGate.reject(new Error("cleanup"));
  }
});
it.each(["tab", "route"])("waits for cursor recovery before committing a newer %s choice", async (choice) => {
  const user = userEvent.setup();
  await beginPendingBack(user);
  const originalGo = window.history.go.bind(window.history);
  const go = vi.spyOn(window.history, "go").mockImplementation(() => {});
  fireEvent.change(screen.getByLabelText("Journal date"), {
    target: {
      value: ""
    }
  });
  await user.click(screen.getByRole("button", {
    name: "Diario"
  }));
  expect(go.mock.calls).toEqual([[1]]);
  if (choice === "tab") await user.click(screen.getByRole("button", { name: "Repaso" }));
  else act(() => cuadernoProps.onOpenPages());
  expect(screen.getByRole("textbox", {
    name: "Journal body"
  })).toBeTruthy();
  act(() => originalGo(1));
  await screen.findByRole("region", {
    name: choice === "tab" ? "Repaso surface" : "Cuaderno surface"
  });
  const history = structuredClone(window.history.state.mcNavigation);
  expect(history.depth).toBe(4);
  await act(async () => gate.resolve(await db.events.toArray()));
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(history);
});
it("preserves a newer study session and consumes its marker once", async () => {
  const user = userEvent.setup();
  const word = await items.createItem(items.newLexical({
    term: "madrugar"
  }));
  await events.logEvent(events.EVENT_TYPES.trickyOn, word.id);
  await beginPendingBack(user);
  await user.click(screen.getByRole("button", {
    name: "Repaso"
  }));
  await user.click(await screen.findByRole("button", {
    name: "Start"
  }));
  await screen.findByRole("region", {
    name: "Review session"
  });
  const history = structuredClone(window.history.state);
  await act(async () => gate.resolve(await db.events.toArray()));
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state).toEqual(history);
  expect(screen.getByRole("region", {
    name: "Review session"
  })).toBeTruthy();
  act(() => window.history.back());
  await screen.findByRole("navigation", {
    name: "Primary"
  });
  expect(window.history.state.mcStudySession).toBeUndefined();
  expect(window.history.state.mcNavigation.activeTab).toBe("repaso");
  act(() => window.history.forward());
  await waitFor(() => expect(window.history.state.mcStudySession).toBeUndefined());
  expect(screen.queryByRole("region", {
    name: "Review session"
  })).toBeNull();
});
it("keeps a different in-app visit after the old Back refresh finishes", async () => {
  const user = userEvent.setup();
  await beginPendingBack(user);
  act(() => cuadernoProps.onOpenPages());
  const history = structuredClone(window.history.state.mcNavigation);
  expect(history.activeTab).toBe("cuaderno");
  expect(history.stacks.cuaderno.at(-1).screen).toBe("pages");
  await act(async () => gate.resolve(await db.events.toArray()));
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(history);
});

it("recovers the exact cursor after navigation depth reaches its cap", async () => {
  window.history.replaceState(historyStateWithNavigation(null, createNavigation({depth: 999999})), "", "/");
  const user = userEvent.setup();
  await openExistingEditor(user);
  const source = structuredClone(window.history.state);
  expect(source.mcNavigation.depth).toBe(1000000);
  fireEvent.change(screen.getByLabelText("Journal date"), {target: {value: ""}});
  const go = vi.spyOn(window.history, "go");
  act(() => window.history.back());
  await waitFor(() => expect(go).toHaveBeenCalledWith(1));
  await waitFor(() => expect(window.history.state).toEqual(source));
  fireEvent.change(screen.getByLabelText("Journal date"), {target: {value: localDate()}});
  act(() => window.history.back());
  await screen.findByRole("button", {name: "Edit journal entry"});
  expect(window.history.state.mcHistoryPosition).toBe(source.mcHistoryPosition - 1);
  act(() => window.history.forward());
  await screen.findByRole("textbox", {name: "Journal body"});
  expect(window.history.state).toEqual(source);
});
