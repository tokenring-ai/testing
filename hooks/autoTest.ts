import { FileSystemService } from "@tokenring-ai/filesystem";
import type { HookSubscription } from "@tokenring-ai/lifecycle/types";
import { AfterAgentInputSuccess, HookCallback } from "@tokenring-ai/lifecycle/util/hooks";
import { TestingState } from "../state/testingState.ts";
import TestingService from "../TestingService.ts";

const name = "autoTest";
const displayName = "Testing/Auto Test";
const description = "Runs tests automatically after chat is complete";

const callbacks = [
  new HookCallback(AfterAgentInputSuccess, async (_data, agent) => {
    const filesystem = agent.requireService(FileSystemService);
    const testingService = agent.requireService(TestingService);

    // Only when files changed since the tests last ran here. (The dirty flag means "not committed
    // yet" and stays set until a commit, so it would rerun the suite after every turn.)
    const writeCount = filesystem.getWriteCount(agent);
    if (writeCount === agent.getState(TestingState).testedWriteCount) return;
    agent.mutateState(TestingState, state => {
      state.testedWriteCount = writeCount;
    });

    agent.infoMessage("Filesystem was updated, running test suite...");
    await testingService.runTests("*", agent);
  }),
];

export default {
  name,
  displayName,
  description,
  callbacks,
} satisfies HookSubscription;
