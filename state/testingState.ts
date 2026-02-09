import {AgentStateSlice} from "@tokenring-ai/agent/types";
import {z} from "zod";
import {TestingServiceConfigSchema, type TestResult} from "../schema.ts";

const serializationSchema = z.object({
  testResults: z.record(z.string(), z.any()),
  repairCount: z.number(),
  maxAutoRepairs: z.number()
});

export class TestingState implements AgentStateSlice<typeof serializationSchema> {
  readonly name = "TestingState";
  serializationSchema = serializationSchema;
  testResults: Record<string, TestResult> = {};
  repairCount = 0;
  maxAutoRepairs: number;


  constructor(readonly initialConfig: z.output<typeof TestingServiceConfigSchema>["agentDefaults"]) {
    this.maxAutoRepairs = initialConfig.maxAutoRepairs;
  }

  serialize(): z.output<typeof serializationSchema> {
    return {
      testResults: this.testResults,
      repairCount: this.repairCount,
      maxAutoRepairs: this.maxAutoRepairs
    };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    this.testResults = data.testResults as Record<string, TestResult>;
    this.repairCount = data.repairCount;
    this.maxAutoRepairs = data.maxAutoRepairs;
  }

  show(): string[] {
    return [
      "Test Results:",
      ...Object.entries(this.testResults).map(([name, result]) => {
        if (result.error) {
          return `[Test: ${name}]: FAILED\n${result.error}`;
        } else {
          return `[Test: ${name}]: PASSED`;
        }
      }),
      "",
      `Total Repairs: ${this.repairCount}`,
    ]
  }
}
