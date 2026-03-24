export interface AhrefsResult {
  available: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export async function queryAhrefs(_query: string): Promise<AhrefsResult> {
  return { available: false, error: "Ahrefs MCP source requires agent runtime context. Skipped in server mode." };
}
