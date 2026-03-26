import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import TestingService from "../../TestingService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

export default {
  name: "test list",
  description: "List available tests",
  help: `Show all available tests.

## Example

/test list`,
  inputSchema,
  execute: async ({agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    const available = Array.from(agent.requireServiceByType(TestingService).getAvailableResources());
    return available.length === 0 ? "No tests available." : "Available tests:\n" + available.map(n => ` - ${n}`).join('\n');
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
