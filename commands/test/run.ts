import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import TestingService from "../../TestingService.ts";

const inputSchema = {
  args: {},
  positionals: [{
    name: "pattern",
    description: "Test name or pattern",
    required: false,
    defaultValue: '*'
  }],
} as const satisfies AgentCommandInputSchema;

export default {
  name: "test run",
  description: "Run tests",
  help: `Run a specific test or all tests. If tests fail, the agent may offer to automatically repair the issues.

## Example

/test run
/test run userAuth`,
  inputSchema,
  execute: async ({positionals: {pattern}, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    await agent.requireServiceByType(TestingService).runTests(pattern, agent);
    return "Tests executed";
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
