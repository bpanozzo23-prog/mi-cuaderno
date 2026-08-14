// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeLexical, makePage } from "../test/factories.js";
import SharedSourceDisclosure from "./SharedSourceDisclosure.jsx";

afterEach(cleanup);

describe("Also from this source", () => {
  it("stays inline and collapsed, then navigates to an exact peer", async () => {
    const user = userEvent.setup();
    const url = "https://example.com/lesson";
    const current = makeLexical({ mediaLinks: [{ url }] });
    const peer = makePage({ title: "Lesson notes", source: { enabled: true, url }, pageFocus: "source" });
    const onOpen = vi.fn();
    render(
      <SharedSourceDisclosure
        items={[current, peer]}
        currentItemId={current.id}
        url={url}
        onOpen={onOpen}
      />
    );

    const disclosure = screen.getByRole("button", { name: "Also from this source · 1" });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /Lesson notes/ })).toBeNull();
    await user.click(disclosure);
    await user.click(screen.getByRole("button", { name: /Lesson notes/ }));
    expect(onOpen).toHaveBeenCalledWith(peer.id);
  });

  it("hides when only near variants or the current item use the URL", () => {
    const current = makeLexical({ mediaLinks: [{ url: "https://example.com/Path" }] });
    const near = makePage({ mediaLinks: [{ url: "https://example.com/path" }] });
    const { container } = render(
      <SharedSourceDisclosure
        items={[current, near]}
        currentItemId={current.id}
        url={current.mediaLinks[0].url}
        onOpen={vi.fn()}
      />
    );
    expect(container.textContent).toBe("");
  });
});
