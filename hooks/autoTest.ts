import {Agent} from "@tokenring-ai/agent";
import {FileSystemService} from "@tokenring-ai/filesystem";
import TestingService from "../TestingService.js";

export const description = "Runs tests automatically after chat is complete";

export async function afterChatComplete(agent: Agent): Promise<void> {

  const filesystem = agent.requireFirstServiceByType(FileSystemService);
  if (filesystem.dirty) {
    const testingServices = agent.team.services.getItemsByType(TestingService);
    for (const testingService of testingServices) {
      // Run all tests for this testing service
      const testResults = await testingService.runTests({}, agent);

      // Output results
      for (const [name, result] of Object.entries(testResults)) {
        if (result.passed) {
          agent.infoLine(`Test ${name} passed.`);
        } else {
          agent.errorLine(
            `Test ${name} failed, result: \n${result.output}`,
          );
        }
      }
    }
  }
}