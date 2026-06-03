export async function seedRun(request: { post(url: string): Promise<unknown> }, runId = 'demo-local-paper-arena') {
  await request.post(`/v1/demo/run?runId=${encodeURIComponent(runId)}`);
  return runId;
}
