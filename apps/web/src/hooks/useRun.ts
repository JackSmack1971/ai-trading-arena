import { useQuery } from '@tanstack/react-query';
import { TelemetryHttpEnvelopeSchema } from '../types.js';

export function useRun(runId: string, apiBase: string) {
  return useQuery({
    queryKey: ['run-telemetry', runId, apiBase],
    queryFn: async () => {
      const response = await fetch(`${apiBase}/v1/runs/${encodeURIComponent(runId)}/telemetry`);
      return TelemetryHttpEnvelopeSchema.parse(await response.json()).data;
    },
  });
}
