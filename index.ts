import type { AgentTeam, TokenRingPackage } from "@tokenring-ai/agent";
import { z } from "zod";
import * as agents from "./agents.ts";
import * as chatCommands from "./chatCommands.ts";
import * as hooks from "./hooks.ts";
import packageJSON from "./package.json" with { type: "json" };
import ShellCommandTestingResource from "./ShellCommandTestingResource.ts";
import TestingService from "./TestingService.ts";

export const TestingConfigSchema = z
	.object({
		resources: z.record(z.string(), z.any()).optional(),
		default: z
			.object({
				resources: z.array(z.string()),
			})
			.optional(),
	})
	.optional();

export const packageInfo: TokenRingPackage = {
	name: packageJSON.name,
	version: packageJSON.version,
	description: packageJSON.description,
	install(agentTeam: AgentTeam) {
		const config = agentTeam.getConfigSlice("testing", TestingConfigSchema);
		if (config) {
			agentTeam.addChatCommands(chatCommands);
			agentTeam.addHooks(packageInfo, hooks);
			agentTeam.addAgentConfigs(agents);
			const testingService = new TestingService();
			agentTeam.addServices(testingService);

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
};

export { default as TestingService } from "./TestingService.ts";
export { default as ShellCommandTestingResource } from "./ShellCommandTestingResource.ts";
