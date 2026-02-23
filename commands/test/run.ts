import Agent from "@tokenring-ai/agent/Agent";
import TestingService from "../../TestingService.js";

export default async function run(remainder: string, agent: Agent): Promise<string> {
  const testingService = agent.requireServiceByType(TestingService);
  const trimmed = remainder?.trim() || "*";

  await testingService.runTests(trimmed, agent);
  return "Tests executed";
}
