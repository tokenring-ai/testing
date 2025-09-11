export {default as TestingService} from "./TestingService.ts";
export {default as ShellCommandTestingResource} from "./ShellCommandTestingResource.ts";

import {TokenRingPackage} from "@tokenring-ai/agent";
import * as chatCommands from "./chatCommands.ts";
import * as hooks from "./hooks.ts";
import * as agents from "./agents.ts";
import packageJSON from './package.json' with {type: 'json'};

export const packageInfo: TokenRingPackage = {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  chatCommands,
  hooks,
  agents
};
