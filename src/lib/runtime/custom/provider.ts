import type {
  EventFrame,
  GatewayConnectOptions,
  GatewayGapInfo,
  GatewayStatus,
} from "@/lib/gateway/GatewayClient";
import type { GatewayClient } from "@/lib/gateway/GatewayClient";
import type { RuntimeCapability, RuntimeEvent, RuntimeProvider } from "@/lib/runtime/types";

const CUSTOM_RUNTIME_CAPABILITIES: ReadonlySet<RuntimeCapability> = new Set([]);

type CustomRuntimeStateResponse = {
  profileName?: string | null;
  registry_profile?: string | null;
  active?: Record<string, unknown> | null;
  [key: string]: unknown;
};

const normalizeCustomBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "ws:") {
      parsed.protocol = "http:";
    } else if (parsed.protocol === "wss:") {
      parsed.protocol = "https:";
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return trimmed.replace(/\/$/, "");
  }
};

export class CustomRuntimeProvider implements RuntimeProvider {
  readonly id = "custom" as const;
  readonly label = "Custom";
  readonly capabilities = CUSTOM_RUNTIME_CAPABILITIES;
  readonly metadata;
  private readonly baseUrl: string;

  constructor(
    readonly client: GatewayClient,
    runtimeUrl: string
  ) {
    this.baseUrl = normalizeCustomBaseUrl(runtimeUrl);
    this.metadata = {
      id: this.id,
      label: this.label,
      runtimeName: "Custom Runtime",
      routeProfile: null,
    };
  }

  connect(options: GatewayConnectOptions): Promise<void> {
    return this.client.connect(options);
  }

  disconnect(): void {
    this.client.disconnect();
  }

  call<T = unknown>(method: string, params: unknown): Promise<T> {
    return this.client.call<T>(method, params);
  }

  onStatus(handler: (status: GatewayStatus) => void): () => void {
    return this.client.onStatus(handler);
  }

  onGap(handler: (info: GatewayGapInfo) => void): () => void {
    return this.client.onGap(handler);
  }

  onEvent(handler: (event: EventFrame) => void): () => void {
    return this.client.onEvent(handler);
  }

  onRuntimeEvent(handler: (event: RuntimeEvent) => void): () => void {
    return this.client.onEvent((event) => {
      handler({
        type: "unknown",
        at: Date.now(),
        frame: event,
      });
    });
  }

  async fetchHealth(): Promise<unknown> {
    return this.fetchJson("/health");
  }

  async fetchState(): Promise<CustomRuntimeStateResponse> {
    return this.fetchJson<CustomRuntimeStateResponse>("/state");
  }

  async fetchRegistry(): Promise<unknown> {
    return this.fetchJson("/registry");
  }

  async describeRuntime() {
    const [health, state, registry] = await Promise.all([
      this.fetchHealth().catch(() => null),
      this.fetchState().catch(() => null),
      this.fetchRegistry().catch(() => null),
    ]);

    const routeProfile =
      typeof state?.profileName === "string"
        ? state.profileName
        : typeof state?.registry_profile === "string"
          ? state.registry_profile
          : null;

    return {
      metadata: {
        ...this.metadata,
        routeProfile,
      },
      health,
      state,
      registry,
    };
  }

  private async fetchJson<T = unknown>(pathname: string): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("Custom runtime URL is not configured.");
    }
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Custom runtime request failed (${response.status}) for ${pathname}.`);
    }
    return (await response.json()) as T;
  }
}
