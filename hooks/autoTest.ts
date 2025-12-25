import {Agent} from "@tokenring-ai/agent";
import {HookConfig} from "@tokenring-ai/agent/types";
import {FileSystemService} from "@tokenring-ai/filesystem";
import TestingService from "../TestingService.js";

const name = "autoTest";
const description = "Runs tests automatically after chat is complete";

async function afterChatCompletion(agent: Agent): Promise<void> {
  const filesystem = agent.requireServiceByType(FileSystemService);
  const testingService = agent.requireServiceByType(TestingService);

  if (filesystem.isDirty(agent)) {
    agent.infoLine("Working Directory was updated, running test suite...");

    await testingService.runTests("*",agent);
  }
}

export default {name, description, afterChatCompletion} satisfies HookConfig
