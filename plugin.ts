import {AgentCommandService, AgentLifecycleService} from "@tokenring-ai/agent";
import TokenRingApp, {TokenRingPlugin} from "@tokenring-ai/app";
import chatCommands from "./chatCommands.ts";
import hooks from "./hooks.ts";
import packageJSON from "./package.json" with {type: "json"};
import {shellCommandTestingConfigSchema, testingConfigSchema} from "./schema.ts";
import ShellCommandTestingResource from "./ShellCommandTestingResource.ts";
import TestingService from "./TestingService.ts";


export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    const config = app.getConfigSlice("testing", testingConfigSchema);
    if (config) {
      app.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );
      app.waitForService(AgentLifecycleService, lifecycleService =>
        lifecycleService.addHooks(packageJSON.name, hooks)
      );
      const testingService = new TestingService(config);
      app.addServices(testingService);

      if (config.resources) {
        for (const name in config.resources) {
          const testingConfig = config.resources[name];
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
} satisfies TokenRingPlugin;
