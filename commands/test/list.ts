import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import TestingService from "../../TestingService.js";

export default {
  name: "test list",
  description: "List available tests",
  help: `# /test list

Show all available tests.

## Example

/test list`,
  execute: async (_remainder: string, agent: Agent): Promise<string> => {
    const available = Array.from(agent.requireServiceByType(TestingService).getAvailableResources());
    return available.length === 0 ? "No tests available." : "Available tests:\n" + available.map(n => ` - ${n}`).join('\n');
  },
} satisfies TokenRingAgentCommand;
