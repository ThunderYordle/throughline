import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { resolveNavContext } from "./nav";
import { Panel, PanelBody, PanelHeader } from "./Panel";
import { StatTile } from "./StatTile";
import { COLOR_GROUPS, cx, TOKENS } from "./tokens";

describe("design system tokens and helpers", () => {
  it("exposes fixed obsidian surface, border, text, and team tokens", () => {
    expect(TOKENS.surface.canvas).toBe("#06080d");
    expect(TOKENS.surface.surface).toBe("#0b0f17");
    expect(TOKENS.side.blue).toBe("#38bdf8");
    expect(TOKENS.side.red).toBe("#fb7185");
    expect(COLOR_GROUPS.length).toBeGreaterThanOrEqual(4);
  });

  it("joins conditional class names cleanly", () => {
    const disabled = false;
    expect(cx("a", disabled && "b", undefined, null, "c")).toBe("a c");
  });
});

describe("navigation context resolver", () => {
  it("maps every app route to active nav tab, breadcrumb, and workflow stage", () => {
    expect(resolveNavContext("/")).toMatchObject({
      activeNav: "matches",
      stage: null,
      crumbs: [{ label: "Matches" }],
    });
    expect(resolveNavContext("/plan/new")).toMatchObject({
      activeNav: "draft",
      stage: "draft",
    });
    expect(resolveNavContext("/plan/abc123")).toMatchObject({
      activeNav: "matches",
      stage: "plan",
    });
    expect(resolveNavContext("/review/rev99")).toMatchObject({
      activeNav: "matches",
      stage: "review",
    });
    expect(resolveNavContext("/replay/game-1")).toMatchObject({
      activeNav: "matches",
      stage: "replay",
    });
    expect(resolveNavContext("/validation")).toMatchObject({
      activeNav: "validation",
      stage: null,
    });
    expect(resolveNavContext("/design-system")).toMatchObject({
      activeNav: "design-system",
      stage: null,
    });
  });
});

describe("design system primitives", () => {
  it("renders Button, Badge, Panel, and StatTile with consistent semantic classes", () => {
    const btnHtml = renderToStaticMarkup(
      createElement(Button, { variant: "primary", size: "md", children: "Build plan" }),
    );
    expect(btnHtml).toContain("Build plan");
    expect(btnHtml).toContain("bg-status-good");

    const badgeHtml = renderToStaticMarkup(
      createElement(Badge, { tone: "cyan", dot: true, children: "Patch 16.17" }),
    );
    expect(badgeHtml).toContain("Patch 16.17");
    expect(badgeHtml).toContain("rounded-full");

    const panelHtml = renderToStaticMarkup(
      createElement(Panel, {
        accent: "blue",
        children: [
          createElement(PanelHeader, { key: "h", title: "Draft Roster", meta: "10 picks" }),
          createElement(PanelBody, { key: "b", children: "Content" }),
        ],
      }),
    );
    expect(panelHtml).toContain("Draft Roster");
    expect(panelHtml).toContain("10 picks");
    expect(panelHtml).toContain("border-l-side-blue");

    const statHtml = renderToStaticMarkup(
      createElement(StatTile, { label: "Win Rate", value: "55.0%", meta: "149 sides", tone: "good" }),
    );
    expect(statHtml).toContain("Win Rate");
    expect(statHtml).toContain("55.0%");
    expect(statHtml).toContain("tabular-nums");
  });
});
