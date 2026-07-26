import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import markdownList from "@tokenring-ai/utility/string/markdownList";
import TestingService from "../../TestingService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

export default {
  name: "test list",
  description: "List available tests",
  help: `Show all available tests.

## Example

/test list`,
  inputSchema,
  execute: async ({ agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    const available = agent.requireServiceByType(TestingService).getAvailableResources();
    return available.length === 0 ? "No tests available." : "Available tests:\n" + markdownList(available);
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
