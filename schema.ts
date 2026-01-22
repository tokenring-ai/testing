import {z} from "zod";

export const testResultSchema = z.object({
  startedAt: z.number(),
  finishedAt: z.number(),
  passed: z.boolean(),
  output: z.string().optional(),
  error: z.unknown().optional(),
});

export type TestResult = z.infer<typeof testResultSchema>;

export const TestingAgentConfigSchema = z.object({
  maxAutoRepairs: z.number().optional(),
}).default({});

export const TestingServiceConfigSchema = z
  .object({
    agentDefaults: z.object({
      maxAutoRepairs: z.number().default(5),
    }).prefault({}),
    resources: z.record(z.string(), z.any()).optional(),
  }).strict().prefault({});

export const shellCommandTestingConfigSchema = z.object({
  type: z.literal("shell"),
  name: z.string(),
  description: z.string().optional(),
  workingDirectory: z.string().optional(),
  command: z.string(),
  timeoutSeconds: z.number().optional(),
})