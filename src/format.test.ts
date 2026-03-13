import { describe, expect, it } from "vitest";
import { formatThreadButtonLabel } from "./format.js";

describe("formatThreadButtonLabel", () => {
  it("uses the project name instead of a worktree path prefix", () => {
    expect(
      formatThreadButtonLabel({
        threadId: "019cdaf5-54be-7ba2-b610-dd71b0efb42b",
        title: "App Server Redux - Plugin Surface Build",
        projectKey: "/Users/huntharo/.codex/worktrees/cb00/openclaw",
      }),
    ).toBe("App Server Redux - Plugin Surface Build (openclaw)");
  });

  it("falls back to the final workspace segment for non-worktree paths", () => {
    expect(
      formatThreadButtonLabel({
        threadId: "019cbef1-376b-7312-98aa-24488c7499d4",
        projectKey: "/Users/huntharo/.openclaw/workspace",
      }),
    ).toBe("019cbef1-376b-7312-98aa-24488c7499d4 (workspace)");
  });
});
