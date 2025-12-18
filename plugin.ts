import {AgentCommandService, AgentManager, AgentLifecycleService} from "@tokenring-ai/agent";
import TokenRingApp, {TokenRingPlugin} from "@tokenring-ai/app";
import agents from "./agents.ts";
import chatCommands from "./chatCommands.ts";
import hooks from "./hooks.ts";
import {TestingConfigSchema} from "./index.ts";
import packageJSON from "./package.json" with {type: "json"};
import ShellCommandTestingResource from "./ShellCommandTestingResource.ts";
import TestingService from "./TestingService.ts";


export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    const config = app.getConfigSlice("testing", TestingConfigSchema);
    if (config) {
      app.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );
      app.waitForService(AgentLifecycleService, lifecycleService =>
        lifecycleService.addHooks(packageJSON.name, hooks)
      );
      app.waitForService(AgentManager, agentManager =>
        agentManager.addAgentConfigs(agents)
      );
      const testingService = new TestingService();
      app.addServices(testingService);

      if (config.resources) {
        for (const name in config.resources) {
          const testingConfig = config.resources[name];
          switch (testingConfig.type) {
            case "shell-testing":
              testingService.registerResource(
                name,
                new ShellCommandTestingResource(testingConfig),
              );
              break;
          }
        }
      }
      if (config.default?.resources) {
        testingService.enableResources(config.default.resources);
      }
    }
  },
} as TokenRingPlugin;
