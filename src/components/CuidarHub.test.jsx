// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CuidarHub from "./CuidarHub.jsx";
import { MAINTENANCE_VIEWS } from "../lib/organization.js";
import { makeLexical, makePage } from "../test/factories.js";

const NOW = new Date("2026-08-18T12:00:00.000Z");
const daysAgo = (days) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

/** Old, complete, exemplified — visible only to the category a test breaks on purpose. */
const settled = (term, over = {}) => makeLexical({
  id: `user:${term}`,
  term,
  createdAt: daysAgo(30),
  updatedAt: daysAgo(30),
  myExamples: ["Un ejemplo mío."],
  ...over,
});

function propsFor(items, over = {}) {
  return {
    notebook: { items, events: [], itemState: new Map(), reload: vi.fn() },
    visitKey: "v:test",
    now: NOW,
    random: () => 0,
    onBack: vi.fn(),
    onSelect: vi.fn(),
    onSeeAll: vi.fn(),
    onReviewTags: vi.fn(),
    ...over,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Cuidar hub", () => {
  it("offers sampled invitations per category and opens a tapped item", async () => {
    const user = userEvent.setup();
    const alone = settled("solitaria");
    const hollow = settled("hueca", { meanings: [], linkedKeys: ["user:plena"] });
    const bare = makeLexical({
      id: "user:sencilla",
      term: "sencilla",
      createdAt: daysAgo(10),
      linkedKeys: ["user:plena"],
    });
    const full = settled("plena");
    const props = propsFor([alone, hollow, bare, full]);
    render(<CuidarHub {...props} />);

    const connect = screen.getByRole("region", { name: "Conectar" });
    within(connect).getByRole("button", { name: "solitaria" });
    within(screen.getByRole("region", { name: "Completar" })).getByRole("button", { name: "hueca" });
    within(screen.getByRole("region", { name: "Dar ejemplos" })).getByRole("button", { name: "sencilla" });

    await user.click(within(connect).getByRole("button", { name: "solitaria" }));
    expect(props.onSelect).toHaveBeenCalledWith("user:solitaria");
  });

  it("shows the see-all escape only past the sample size and hands over the maintenance view", async () => {
    const user = userEvent.setup();
    const items = ["una", "dos", "tres", "cuatro", "cinco"].map((term) => settled(term));
    const props = propsFor(items);
    render(<CuidarHub {...props} />);

    const connect = screen.getByRole("region", { name: "Conectar" });
    expect(within(connect).getAllByRole("button")).toHaveLength(4);

    await user.click(within(connect).getByRole("button", { name: "Ver las 5" }));
    expect(props.onSeeAll).toHaveBeenCalledWith(MAINTENANCE_VIEWS.unlinked);
  });

  it("lists tag twins exactly as Ajustes groups them and routes review there", async () => {
    const user = userEvent.setup();
    const tagged = settled("modismo", { tags: ["idiom"], linkedKeys: ["user:otra"] });
    const other = settled("otra", { tags: ["Idiom"] });
    other.linkedKeys = ["user:modismo"];
    const props = propsFor([tagged, other]);
    render(<CuidarHub {...props} />);

    const twins = screen.getByRole("region", { name: "Etiquetas gemelas" });
    within(twins).getByText("Idiom · idiom");
    await user.click(within(twins).getByRole("button", { name: "Revisar en Ajustes" }));
    expect(props.onReviewTags).toHaveBeenCalledTimes(1);
  });

  it("celebrates a tended notebook instead of showing empty categories", () => {
    const one = settled("una", { linkedKeys: ["user:dos"] });
    const two = settled("dos");
    render(<CuidarHub {...propsFor([one, two])} />);

    expect(screen.getByText("Todo está en orden.")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Conectar" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Etiquetas gemelas" })).toBeNull();
  });

  it("keeps one visit's sample stable and redraws on the next visit", () => {
    const items = ["una", "dos", "tres", "cuatro"].map((term) => settled(term));
    const random = vi.fn(() => 0);
    const props = propsFor(items, { random });

    const view = render(<CuidarHub {...props} visitKey="v:first" />);
    const drawsAfterMount = random.mock.calls.length;
    expect(drawsAfterMount).toBeGreaterThan(0);

    view.rerender(<CuidarHub {...props} visitKey="v:first" />);
    expect(random.mock.calls.length).toBe(drawsAfterMount);

    view.rerender(<CuidarHub {...props} visitKey="v:second" />);
    expect(random.mock.calls.length).toBeGreaterThan(drawsAfterMount);
  });

  it("excludes Journal entries from invitations", () => {
    const journal = makePage({
      id: "user:diario",
      title: "Hoy",
      pageDate: "2026-08-01",
      createdAt: daysAgo(20),
    });
    render(<CuidarHub {...propsFor([journal])} />);
    expect(screen.getByText("Todo está en orden.")).toBeTruthy();
  });
});
