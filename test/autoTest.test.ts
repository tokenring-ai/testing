import { describe, expect, it } from "bun:test";
import { AgentEventState } from "@tokenring-ai/agent/state/agentEventState";
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent.test";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp.test";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import { FileSystemConfigSchema } from "@tokenring-ai/filesystem/schema";
import AgentLifecycleService from "@tokenring-ai/lifecycle/AgentLifecycleService";
import { HookCallback } from "@tokenring-ai/lifecycle/util/hooks";
import autoTest from "../hooks/autoTest.ts";
import { AfterTestsPassed } from "../hooks.ts";
import TestingService from "../TestingService.ts";

describe("autoTest", () => {
  function setup() {
    const app = createTestingApp();
    const fileSystem = new FileSystemService(app, FileSystemConfigSchema.parse({ allowedPaths: [] }));
    app.addService(FileSystemService, fileSystem);
    const lifecycle = new AgentLifecycleService();
    app.addService(AgentLifecycleService, lifecycle);
    const testing = new TestingService();
    app.addService(TestingService, testing);

    let runs = 0;
    testing.registerResource("suite", {
      description: "suite",
      runTest: async () => {
        runs++;
        return { status: "passed" } as never;
      },
    });
    let passedHooks = 0;
    lifecycle.addHooks(autoTest, {
      name: "recorder",
      displayName: "recorder",
      description: "recorder",
      callbacks: [new HookCallback(AfterTestsPassed, async () => void passedHooks++)],
    });

    const agent = createTestingAgent(app);
    lifecycle.enableHooks(["autoTest", "recorder"], agent);
    // Running tests reports activity, which needs an input in progress, as in a real turn.
    agent.mutateState(AgentEventState, state => {
      state.inputQueue.push({
        request: { type: "input.received", requestId: "r", timestamp: 0, input: { from: "t", message: "" } },
        executionState: { status: "running", currentActivity: "", availableInteractions: [] },
        interactionCallbacks: new Map(),
        abortController: new AbortController(),
      });
      state.currentlyExecutingInputItem = state.inputQueue[0]!;
    });
    const afterTurn = () => autoTest.callbacks[0]!.callback(undefined as never, agent);
    return { agent, fileSystem, afterTurn, runs: () => runs, passedHooks: () => passedHooks };
  }

  it("runs the suite after a turn that wrote files, and tells other plugins when it passes", async () => {
    const { agent, fileSystem, afterTurn, runs, passedHooks } = setup();
    await afterTurn();
    expect(runs()).toBe(0);

    fileSystem.setDirty(true, agent);
    await afterTurn();
    expect(runs()).toBe(1);
    // git's autoCommit listens for this.
    expect(passedHooks()).toBe(1);
  });

  it("does not rerun the suite after later turns that wrote nothing, though the changes are still uncommitted", async () => {
    const { agent, fileSystem, afterTurn, runs } = setup();
    fileSystem.setDirty(true, agent);
    await afterTurn();
    await afterTurn();
    await afterTurn();
    expect(fileSystem.isDirty(agent)).toBe(true);
    expect(runs()).toBe(1);

    fileSystem.setDirty(true, agent);
    await afterTurn();
    expect(runs()).toBe(2);
  });
});
