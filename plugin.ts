import { AgentCommandService } from "@tokenring-ai/agent";
import type { TokenRingPlugin } from "@tokenring-ai/app";
import { AgentLifecycleService } from "@tokenring-ai/lifecycle";
import { z } from "zod";
import agentCommands from "./commands.ts";
import autoTest from "./hooks/autoTest.ts";
import packageJSON from "./package.json" with { type: "json" };
import { TestingServiceConfigSchema } from "./schema.ts";
import TestingService from "./TestingService.ts";

const packageConfigSchema = z.object({
  testing: TestingServiceConfigSchema,
});

export default {
  name: packageJSON.name,
  displayName: "Testing Framework",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app) {
    app.addServices(new TestingService());
    app.waitForService(AgentCommandService, agentCommandService => agentCommandService.addAgentCommands(agentCommands));
    app.waitForService(AgentLifecycleService, lifecycleService => lifecycleService.addHooks(autoTest));
  },
  reconfigure(app, config) {
    app.requireService(TestingService).reconfigure(config.testing);
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
