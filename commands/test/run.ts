import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import TestingService from "../../TestingService.js";

export default {
  name: "test run",
  description: "/test run - Run tests",
  help: `# /test run [test_name]

Run a specific test or all tests. If tests fail, the agent may offer to automatically repair the issues.

## Example

/test run
/test run userAuth`,
  execute: async (remainder: string, agent: Agent): Promise<string> => {
    await agent.requireServiceByType(TestingService).runTests(remainder?.trim() || "*", agent);
    return "Tests executed";
  },
} satisfies TokenRingAgentCommand;
