import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PluginStateStore, buildPluginSessionKey } from "./state.js";

async function makeStoreDir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "oc-codex-plugin-"));
}

async function makeStore(dir?: string): Promise<PluginStateStore> {
  const resolvedDir = dir ?? (await makeStoreDir());
  const store = new PluginStateStore(resolvedDir);
  await store.load();
  return store;
}

describe("state store", () => {
  it("persists bindings and callbacks", async () => {
    const dir = await makeStoreDir();
    const store = await makeStore(dir);
    await store.upsertPendingBind({
      conversation: {
        channel: "telegram",
        accountId: "default",
        conversationId: "124",
      },
      threadId: "thread-pending",
      workspaceDir: "/tmp/pending",
      threadTitle: "Pending thread",
      updatedAt: Date.now(),
    });
    await store.upsertBinding({
      conversation: {
        channel: "telegram",
        accountId: "default",
        conversationId: "123",
      },
      sessionKey: buildPluginSessionKey("thread-1"),
      threadId: "thread-1",
      workspaceDir: "/tmp/work",
      contextUsage: {
        totalTokens: 9_800,
        contextWindow: 258_000,
        remainingPercent: 96,
      },
      updatedAt: Date.now(),
    });
    const callback = await store.putCallback({
      kind: "resume-thread",
      conversation: {
        channel: "telegram",
        accountId: "default",
        conversationId: "123",
      },
      threadId: "thread-1",
      workspaceDir: "/tmp/work",
      syncTopic: true,
    });
    const startThreadCallback = await store.putCallback({
      kind: "start-new-thread",
      conversation: {
        channel: "telegram",
        accountId: "default",
        conversationId: "123",
      },
      workspaceDir: "/tmp/new-work",
      syncTopic: true,
    });
    const promptCallback = await store.putCallback({
      kind: "run-prompt",
      conversation: {
        channel: "telegram",
        accountId: "default",
        conversationId: "123",
      },
      prompt: "Implement the plan.",
      workspaceDir: "/tmp/work",
      collaborationMode: {
        mode: "default",
        settings: {
          model: "openai/gpt-5.4",
          developerInstructions: null,
        },
      },
    });
    const modelCallback = await store.putCallback({
      kind: "set-model",
      conversation: {
        channel: "telegram",
        accountId: "default",
        conversationId: "123",
      },
      model: "gpt-5.2-codex",
    });
    const replyCallback = await store.putCallback({
      kind: "reply-text",
      conversation: {
        channel: "telegram",
        accountId: "default",
        conversationId: "123",
      },
      text: "Okay. Staying in plan mode.",
    });
    const reloaded = await makeStore(dir);

    expect(reloaded.listBindings()).toHaveLength(1);
    expect(reloaded.listBindings()[0]?.contextUsage?.totalTokens).toBe(9_800);
    expect(reloaded.getPendingBind({
      channel: "telegram",
      accountId: "default",
      conversationId: "124",
    })?.threadId).toBe("thread-pending");
    expect(reloaded.getCallback(callback.token)?.kind).toBe("resume-thread");
    expect(reloaded.getCallback(startThreadCallback.token)?.kind).toBe("start-new-thread");
    const resumeCallback = reloaded.getCallback(callback.token);
    expect(resumeCallback?.kind).toBe("resume-thread");
    expect(resumeCallback && resumeCallback.kind === "resume-thread" ? resumeCallback.syncTopic : undefined).toBe(true);
    const newThreadCallback = reloaded.getCallback(startThreadCallback.token);
    expect(newThreadCallback?.kind).toBe("start-new-thread");
    expect(
      newThreadCallback && newThreadCallback.kind === "start-new-thread"
        ? newThreadCallback.workspaceDir
        : undefined,
    ).toBe("/tmp/new-work");
    expect(reloaded.getCallback(promptCallback.token)?.kind).toBe("run-prompt");
    const runPrompt = reloaded.getCallback(promptCallback.token);
    expect(runPrompt && runPrompt.kind === "run-prompt" ? runPrompt.collaborationMode : undefined).toEqual({
      mode: "default",
      settings: {
        model: "openai/gpt-5.4",
        developerInstructions: null,
      },
    });
    expect(reloaded.getCallback(modelCallback.token)?.kind).toBe("set-model");
    expect(reloaded.getCallback(replyCallback.token)?.kind).toBe("reply-text");
  });

  it("removes pending requests and related callbacks", async () => {
    const store = await makeStore();
    await store.upsertPendingRequest({
      requestId: "req-1",
      conversation: {
        channel: "discord",
        accountId: "default",
        conversationId: "chan-1",
      },
      threadId: "thread-1",
      workspaceDir: "/tmp/work",
      state: {
        requestId: "req-1",
        options: ["yes"],
        expiresAt: Date.now() + 10_000,
      },
      updatedAt: Date.now(),
    });
    const callback = await store.putCallback({
      kind: "pending-input",
      conversation: {
        channel: "discord",
        accountId: "default",
        conversationId: "chan-1",
      },
      requestId: "req-1",
      actionIndex: 0,
    });
    const questionnaireCallback = await store.putCallback({
      kind: "pending-questionnaire",
      conversation: {
        channel: "discord",
        accountId: "default",
        conversationId: "chan-1",
      },
      requestId: "req-1",
      questionIndex: 0,
      action: "select",
      optionIndex: 0,
    });
    await store.removePendingRequest("req-1");
    expect(store.getPendingRequestById("req-1")).toBeNull();
    expect(store.getCallback(callback.token)).toBeNull();
    expect(store.getCallback(questionnaireCallback.token)).toBeNull();
  });

  it("clears a pending bind when the binding is finalized", async () => {
    const store = await makeStore();
    await store.upsertPendingBind({
      conversation: {
        channel: "discord",
        accountId: "default",
        conversationId: "user:1",
      },
      threadId: "thread-1",
      workspaceDir: "/tmp/work",
      updatedAt: Date.now(),
    });

    await store.upsertBinding({
      conversation: {
        channel: "discord",
        accountId: "default",
        conversationId: "user:1",
      },
      sessionKey: buildPluginSessionKey("thread-1"),
      threadId: "thread-1",
      workspaceDir: "/tmp/work",
      updatedAt: Date.now(),
    });

    expect(
      store.getPendingBind({
        channel: "discord",
        accountId: "default",
        conversationId: "user:1",
      }),
    ).toBeNull();
  });

  it("clears a pending bind when the conversation is explicitly removed", async () => {
    const store = await makeStore();
    await store.upsertPendingBind({
      conversation: {
        channel: "telegram",
        accountId: "default",
        conversationId: "123",
      },
      threadId: "thread-1",
      workspaceDir: "/tmp/work",
      updatedAt: Date.now(),
    });

    await store.removeBinding({
      channel: "telegram",
      accountId: "default",
      conversationId: "123",
    });

    expect(
      store.getPendingBind({
        channel: "telegram",
        accountId: "default",
        conversationId: "123",
      }),
    ).toBeNull();
  });

  it("distinguishes feishu threads in the same conversation", async () => {
    const store = await makeStore();
    await store.upsertBinding({
      conversation: {
        channel: "feishu",
        accountId: "default",
        conversationId: "chat-1",
        threadId: "topic-a",
      },
      sessionKey: buildPluginSessionKey("thread-a"),
      threadId: "thread-a",
      workspaceDir: "/tmp/work-a",
      updatedAt: Date.now(),
    });
    await store.upsertBinding({
      conversation: {
        channel: "feishu",
        accountId: "default",
        conversationId: "chat-1",
        threadId: "topic-b",
      },
      sessionKey: buildPluginSessionKey("thread-b"),
      threadId: "thread-b",
      workspaceDir: "/tmp/work-b",
      updatedAt: Date.now(),
    });

    expect(
      store.getBinding({
        channel: "feishu",
        accountId: "default",
        conversationId: "chat-1",
        threadId: "topic-a",
      })?.threadId,
    ).toBe("thread-a");
    expect(
      store.getBinding({
        channel: "feishu",
        accountId: "default",
        conversationId: "chat-1",
        threadId: "topic-b",
      })?.threadId,
    ).toBe("thread-b");
    expect(store.listBindings()).toHaveLength(2);
  });

  it("persists conversation preferences in bindings across reload", async () => {
    const dir = await makeStoreDir();
    const store = await makeStore(dir);
    const updatedAt = Date.now();
    await store.upsertBinding({
      conversation: {
        channel: "discord",
        accountId: "default",
        conversationId: "channel:chan-1",
      },
      sessionKey: buildPluginSessionKey("thread-1"),
      threadId: "thread-1",
      workspaceDir: "/tmp/work",
      permissionsMode: "full-access",
      preferences: {
        preferredModel: "openai/gpt-5.3",
        preferredServiceTier: "fast",
        updatedAt,
      },
      updatedAt,
    });

    const reloaded = await makeStore(dir);
    const binding = reloaded.getBinding({
      channel: "discord",
      accountId: "default",
      conversationId: "channel:chan-1",
    });

    expect(binding?.preferences).toEqual({
      preferredModel: "openai/gpt-5.3",
      preferredServiceTier: "fast",
      updatedAt,
    });
    expect(binding?.permissionsMode).toBe("full-access");
  });

  it("persists detached Feishu conversations across reload and prunes expired entries", async () => {
    const dir = await makeStoreDir();
    const store = await makeStore(dir);
    await store.markConversationDetached(
      {
        channel: "feishu",
        accountId: "default",
        conversationId: "ou_user_1",
      },
      5_000,
    );

    const reloaded = await makeStore(dir);
    expect(
      reloaded.hasRecentlyDetachedConversation({
        channel: "feishu",
        accountId: "default",
        conversationId: "ou_user_1",
      }),
    ).toBe(true);

    reloaded.pruneExpired(Date.now() + 6_000);
    expect(
      reloaded.hasRecentlyDetachedConversation(
        {
          channel: "feishu",
          accountId: "default",
          conversationId: "ou_user_1",
        },
        Date.now() + 6_000,
      ),
    ).toBe(false);
  });

  it("migrates legacy profile and permission fields into permissions mode", async () => {
    const dir = await makeStoreDir();
    const stateDir = path.join(dir, "openclaw-codex-app-server");
    const bindingUpdatedAt = Date.now();
    const pendingBindUpdatedAt = bindingUpdatedAt + 1;
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(
      path.join(stateDir, "state.json"),
      `${JSON.stringify({
        version: 1,
        bindings: [
          {
            conversation: {
              channel: "discord",
              accountId: "default",
              conversationId: "channel:chan-1",
            },
            sessionKey: buildPluginSessionKey("thread-1"),
            threadId: "thread-1",
            workspaceDir: "/tmp/work",
            appServerProfile: "default",
            pendingAppServerProfile: "full-access",
            preferences: {
              preferredModel: "openai/gpt-5.3",
              preferredReasoningEffort: "high",
              preferredServiceTier: "fast",
              preferredApprovalPolicy: "never",
              preferredSandbox: "danger-full-access",
              updatedAt: bindingUpdatedAt,
            },
            updatedAt: bindingUpdatedAt,
          },
        ],
        pendingBinds: [
          {
            conversation: {
              channel: "telegram",
              accountId: "default",
              conversationId: "123",
            },
            threadId: "thread-2",
            workspaceDir: "/tmp/pending",
            appServerProfile: "full-access",
            preferences: {
              preferredModel: "openai/gpt-5.4",
              preferredServiceTier: "default",
              preferredApprovalPolicy: "never",
              preferredSandbox: "danger-full-access",
              updatedAt: pendingBindUpdatedAt,
            },
            updatedAt: pendingBindUpdatedAt,
          },
        ],
        pendingRequests: [],
        callbacks: [],
      }, null, 2)}\n`,
      "utf8",
    );

    const reloaded = await makeStore(dir);
    const binding = reloaded.getBinding({
      channel: "discord",
      accountId: "default",
      conversationId: "channel:chan-1",
    });
    const pendingBind = reloaded.getPendingBind({
      channel: "telegram",
      accountId: "default",
      conversationId: "123",
    });

    expect(binding?.permissionsMode).toBe("default");
    expect(binding?.pendingPermissionsMode).toBe("full-access");
    expect(binding?.preferences).toEqual({
      preferredModel: "openai/gpt-5.3",
      preferredReasoningEffort: "high",
      preferredServiceTier: "fast",
      updatedAt: bindingUpdatedAt,
    });
    expect(pendingBind?.permissionsMode).toBe("full-access");
    expect(pendingBind?.preferences).toEqual({
      preferredModel: "openai/gpt-5.4",
      preferredServiceTier: "default",
      updatedAt: pendingBindUpdatedAt,
    });
  });

  it("normalizes legacy Feishu conversation ids and deduplicates migrated records", async () => {
    const dir = await makeStoreDir();
    const stateDir = path.join(dir, "openclaw-codex-app-server");
    const updatedAt = Date.now();
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(
      path.join(stateDir, "state.json"),
      `${JSON.stringify({
        version: 2,
        bindings: [
          {
            conversation: {
              channel: "feishu",
              accountId: "default",
              conversationId: "user:ou_user_1",
            },
            sessionKey: buildPluginSessionKey("thread-old"),
            threadId: "thread-old",
            workspaceDir: "/tmp/old",
            updatedAt,
          },
          {
            conversation: {
              channel: "feishu",
              accountId: "default",
              conversationId: "ou_user_1",
            },
            sessionKey: buildPluginSessionKey("thread-new"),
            threadId: "thread-new",
            workspaceDir: "/tmp/new",
            updatedAt: updatedAt + 1,
          },
        ],
        pendingBinds: [
          {
            conversation: {
              channel: "feishu",
              accountId: "default",
              conversationId: "feishu:user:ou_user_1",
            },
            threadId: "thread-pending",
            workspaceDir: "/tmp/pending",
            updatedAt,
          },
        ],
        pendingRequests: [
          {
            requestId: "req-1",
            conversation: {
              channel: "feishu",
              accountId: "default",
              conversationId: "user:ou_user_1",
            },
            threadId: "thread-pending",
            workspaceDir: "/tmp/pending",
            state: {
              requestId: "req-1",
              options: ["yes"],
              expiresAt: updatedAt + 60_000,
            },
            updatedAt,
          },
        ],
        callbacks: [
          {
            token: "tok-1",
            kind: "resume-thread",
            conversation: {
              channel: "feishu",
              accountId: "default",
              conversationId: "feishu:user:ou_user_1",
            },
            threadId: "thread-new",
            workspaceDir: "/tmp/new",
            createdAt: updatedAt,
            expiresAt: updatedAt + 60_000,
          },
        ],
      }, null, 2)}\n`,
      "utf8",
    );

    const reloaded = await makeStore(dir);

    expect(reloaded.listBindings()).toHaveLength(1);
    expect(
      reloaded.getBinding({
        channel: "feishu",
        accountId: "default",
        conversationId: "ou_user_1",
      })?.threadId,
    ).toBe("thread-new");
    expect(
      reloaded.getPendingBind({
        channel: "feishu",
        accountId: "default",
        conversationId: "ou_user_1",
      })?.threadId,
    ).toBe("thread-pending");
    expect(
      reloaded.getPendingRequestByConversation({
        channel: "feishu",
        accountId: "default",
        conversationId: "ou_user_1",
      })?.requestId,
    ).toBe("req-1");
    expect(reloaded.getCallback("tok-1")?.conversation.conversationId).toBe("ou_user_1");
  });
});
