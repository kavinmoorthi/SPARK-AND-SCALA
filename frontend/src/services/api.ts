import {
  AnalyticsOverview,
  FusedTelemetry,
  MissionEvent,
  MissionSummary,
  ScenarioRequest,
  TelemetryRaw,
} from '../types/telemetry';

const API_BASE = '';

export async function fetchMissions(): Promise<MissionSummary[]> {
  const res = await fetch(`${API_BASE}/missions`);
  if (!res.ok) throw new Error('Failed to fetch missions');
  return res.json();
}

export async function fetchMissionTelemetry(missionId: string, limit = 1500): Promise<FusedTelemetry[]> {
  const res = await fetch(`${API_BASE}/missions/${missionId}/telemetry?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch telemetry');
  return res.json();
}

export async function fetchMissionEvents(missionId: string): Promise<MissionEvent[]> {
  const res = await fetch(`${API_BASE}/missions/${missionId}/events`);
  if (!res.ok) throw new Error('Failed to fetch mission events');
  return res.json();
}

export async function fetchMissionReport(missionId: string): Promise<MissionSummary> {
  const res = await fetch(`${API_BASE}/missions/${missionId}/report`);
  if (!res.ok) throw new Error('Failed to fetch mission report');
  return res.json();
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsOverview> {
  const res = await fetch(`${API_BASE}/analytics/summary`);
  if (!res.ok) throw new Error('Failed to fetch analytics summary');
  return res.json();
}

export async function triggerHoming(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/command/home`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger homing');
  return res.json();
}

export async function injectScenario(req: ScenarioRequest): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/simulator/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Failed to inject scenario');
  return res.json();
}

export async function sendTelemetry(raw: TelemetryRaw): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(raw),
  });
  if (!res.ok) throw new Error('Failed to post telemetry');
  return res.json();
}

export class LiveTelemetrySocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private isExplicitlyClosed = false;
  private onMessageCb: ((data: FusedTelemetry) => void) | null = null;
  private onStatusCb: ((connected: boolean) => void) | null = null;

  connect(
    onMessage: (data: FusedTelemetry) => void,
    onStatusChange?: (connected: boolean) => void
  ) {
    this.onMessageCb = onMessage;
    this.onStatusCb = onStatusChange || null;
    this.isExplicitlyClosed = false;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // When running under vite proxy, proxy handles /live to ws://localhost:8080/live
    const wsUrl = `${protocol}//${host}/live`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.onStatusCb) this.onStatusCb(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ping') return;
          if (this.onMessageCb) {
            this.onMessageCb(msg as FusedTelemetry);
          }
        } catch {
          // ignore keepalive or parse error
        }
      };

      this.ws.onclose = () => {
        if (this.onStatusCb) this.onStatusCb(false);
        if (!this.isExplicitlyClosed) {
          this.reconnectTimer = window.setTimeout(() => this.connect(this.onMessageCb!, this.onStatusCb || undefined), 2000);
        }
      };

      this.ws.onerror = () => {
        if (this.ws) this.ws.close();
      };
    } catch {
      if (!this.isExplicitlyClosed) {
        this.reconnectTimer = window.setTimeout(() => this.connect(this.onMessageCb!, this.onStatusCb || undefined), 2000);
      }
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
