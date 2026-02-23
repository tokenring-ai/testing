import Agent from "@tokenring-ai/agent/Agent";
import TestingService from "../../TestingService.js";

export default async function list(_remainder: string, agent: Agent): Promise<string> {
  const testingService = agent.requireServiceByType(TestingService);
  const available = Array.from(testingService.getAvailableResources());
  
  if (available.length === 0) {
    return "No tests available.";
  } else {
    return "Available tests:\n" + available.map(name => ` - ${name}`).join('\n');
  }
}
