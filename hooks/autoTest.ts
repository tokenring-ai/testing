import {FileSystemService} from "@tokenring-ai/filesystem";
import type {HookSubscription} from "@tokenring-ai/lifecycle/types";
import {AfterAgentInputSuccess, HookCallback} from "@tokenring-ai/lifecycle/util/hooks";
import TestingService from "../TestingService.ts";

const name = "autoTest";
const displayName = "Testing/Auto Test";
const description = "Runs tests automatically after chat is complete";

const callbacks = [
  new HookCallback(AfterAgentInputSuccess, async (_data, agent) => {
    const filesystem = agent.requireServiceByType(FileSystemService);
    const testingService = agent.requireServiceByType(TestingService);

    if (filesystem.isDirty(agent)) {
      agent.infoMessage("Working Directory was updated, running test suite...");

      await testingService.runTests("*", agent);
    }
  }),
];

export default {
  name,
  displayName,
  description,
  callbacks,
} satisfies HookSubscription;
