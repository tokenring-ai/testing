import {AgentCommandService} from "@tokenring-ai/agent";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {AgentLifecycleService} from "@tokenring-ai/lifecycle";
import {z} from "zod";
import agentCommands from "./commands.ts";
import hooks from "./hooks.ts";
import packageJSON from "./package.json" with {type: "json"};
import {shellCommandTestingConfigSchema, TestingServiceConfigSchema} from "./schema.ts";
import ShellCommandTestingResource from "./ShellCommandTestingResource.ts";
import TestingService from "./TestingService.ts";

const packageConfigSchema = z.object({
  testing: TestingServiceConfigSchema.optional()
});

export default {
  name: packageJSON.name,
  displayName: "Testing Framework",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    if (config.testing) {
      app.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(agentCommands)
      );
      app.waitForService(AgentLifecycleService, lifecycleService =>
        lifecycleService.addHooks(hooks)
      );
      const testingService = new TestingService(config.testing);
      app.addServices(testingService);

      if (config.testing.resources) {
        for (const name in config.testing.resources) {
          const testingConfig = config.testing.resources[name];
          switch (testingConfig.type) {
            case "shell":
              testingService.registerResource(
                name,
                new ShellCommandTestingResource(shellCommandTestingConfigSchema.parse(testingConfig)),
              );
              break;
          }
        }
      }
    }
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
