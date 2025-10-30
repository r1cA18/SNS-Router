const DEFAULT_BASE_URL = "http://localhost:23373/v0/mcp";

export type ConnectionCheckResult = { ok: true } | { ok: false; error: string };

export class BeeperMCPClient {
  constructor(
    private readonly options: {
      baseUrl?: string;
      authToken?: string;
    } = {},
  ) {}

  async checkConnection(): Promise<ConnectionCheckResult> {
    try {
      const response = await fetch(this.options.baseUrl ?? DEFAULT_BASE_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(this.options.authToken ? { Authorization: `Bearer ${this.options.authToken}` } : {}),
        },
      });

      if (!response.ok) {
        return {
          ok: false,
          error:
            response.status === 401
              ? "HTTP 401 Unauthorized: Beeper Desktop APIで発行したトークンを設定してください。"
              : `HTTP ${response.status} ${response.statusText}`,
        };
      }

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { ok: false, error: message };
    }
  }
}
