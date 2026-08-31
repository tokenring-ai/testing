import { AgentStateSlice } from "@tokenring-ai/agent/types";
import markdownList from "@tokenring-ai/utility/string/markdownList";
import { z } from "zod";
import type { TestingServiceConfigSchema, TestResult } from "../schema.ts";

const serializationSchema = z.object({
  testResults: z.record(z.string(), z.any()),
  repairCount: z.number(),
  maxAutoRepairs: z.number(),
});

export class TestingState extends AgentStateSlice<typeof serializationSchema> {
  testResults: Record<string, TestResult> = {};
  repairCount = 0;
  maxAutoRepairs: number;

  constructor(readonly initialConfig: z.output<typeof TestingServiceConfigSchema>["agentDefaults"]) {
    super("TestingState", serializationSchema);
    this.maxAutoRepairs = initialConfig.maxAutoRepairs;
  }

  serialize(): z.output<typeof serializationSchema> {
    return {
      testResults: this.testResults,
      repairCount: this.repairCount,
      maxAutoRepairs: this.maxAutoRepairs,
    };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    this.testResults = data.testResults as Record<string, TestResult>;
    this.repairCount = data.repairCount;
    this.maxAutoRepairs = data.maxAutoRepairs;
  }

  show(): string {
    return `Test Results:
${markdownList(
  Object.entries(this.testResults).map(([name, result]) => {
    const header = `[Test: ${name}]: ${result.status.toUpperCase()}`;
    if (result.status === "passed") {
      return header;
    }
    const detail = result.status === "error" ? result.error : result.output;
    return `${header}\n${detail}`.replaceAll("\n", "\n   ");
  }),
)}

Total Repairs: ${this.repairCount}`;
  }
}
