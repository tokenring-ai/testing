import {z} from "zod";

export const testResultSchema = z.object({
  startedAt: z.number(),
  finishedAt: z.number(),
  passed: z.boolean(),
  output: z.string().optional(),
  error: z.unknown().optional(),
});

export type TestResult = z.infer<typeof testResultSchema>;

export const testingConfigSchema = z
  .object({
    resources: z.record(z.string(), z.any()).optional(),
    maxAutoRepairs: z.number().default(5),
  });

export const shellCommandTestingConfigSchema = z.object({
  type: z.literal("shell"),
  name: z.string(),
  description: z.string().optional(),
  workingDirectory: z.string().optional(),
  command: z.string(),
  timeoutSeconds: z.number().optional(),
})