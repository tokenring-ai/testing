import {AgentCommandService, AgentLifecycleService} from "@tokenring-ai/agent";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {z} from "zod";
import chatCommands from "./chatCommands.ts";
import hooks from "./hooks.ts";
import packageJSON from "./package.json" with {type: "json"};
import {shellCommandTestingConfigSchema, testingConfigSchema} from "./schema.ts";
import ShellCommandTestingResource from "./ShellCommandTestingResource.ts";
import TestingService from "./TestingService.ts";

const packageConfigSchema = z.object({
  testing: testingConfigSchema.optional()
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    // const config = app.getConfigSlice("testing", testingConfigSchema);
    if (config.testing) {
      app.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );
      app.waitForService(AgentLifecycleService, lifecycleService =>
        lifecycleService.addHooks(packageJSON.name, hooks)
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
