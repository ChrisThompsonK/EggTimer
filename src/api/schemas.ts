import { z } from 'zod';

// Duration can be string (like "10m"), number (ms), or object with ms property
const DurationSchema = z.union([
  z.string().min(1),
  z.number().positive(),
  z.object({ ms: z.number().positive() })
]);

export const CreateTimerSchema = z.object({
  name: z.string().max(64).optional(),
  duration: DurationSchema
});

export const TimerParamsSchema = z.object({
  id: z.string().min(1)
});

export type CreateTimerRequest = z.infer<typeof CreateTimerSchema>;
export type TimerParams = z.infer<typeof TimerParamsSchema>;
