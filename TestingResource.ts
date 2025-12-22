import type Agent from "@tokenring-ai/agent/Agent";
import type {TestResult} from "./schema.ts";

export interface TestingResource {
  description: string;
  runTest: (agent: Agent) => Promise<TestResult>;
}
