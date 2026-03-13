import { describe, expect, it } from "vitest";
import { formatBoundThreadSummary, formatThreadButtonLabel } from "./format.js";

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

describe("formatBoundThreadSummary", () => {
  it("includes project, thread metadata, and replay context", () => {
    expect(
      formatBoundThreadSummary({
        binding: {
          conversation: {
            channel: "telegram",
            accountId: "default",
            conversationId: "chat-1",
          },
          sessionKey: "openclaw-app-server:thread:abc",
          threadId: "019cc00d-6cf4-7c11-afcd-2673db349a21",
          workspaceDir: "/Users/huntharo/.codex/worktrees/41fb/openclaw",
          threadTitle: "Fix Telegram approval flow",
          updatedAt: 1,
        },
        state: {
          threadId: "019cc00d-6cf4-7c11-afcd-2673db349a21",
          threadName: "Fix Telegram approval flow",
          cwd: "/Users/huntharo/.codex/worktrees/41fb/openclaw",
        },
      }),
    ).toBe(
      [
        "Codex thread bound.",
        "Project: openclaw",
        "Thread Name: Fix Telegram approval flow",
        "Thread ID: 019cc00d-6cf4-7c11-afcd-2673db349a21",
        "Worktree Path: /Users/huntharo/.codex/worktrees/41fb/openclaw",
      ].join("\n"),
    );
  });
});
