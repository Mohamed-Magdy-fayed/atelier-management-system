import type {
  EndpointsMap,
  InstanceStatusResponse,
  SendMessageParams,
  SendMessageResponse,
} from "./types";

const baseUrl = "https://api.wapilot.net/api/v2/";

/** Raised for a non-2xx response, so callers can tell auth apart from outage. */
export class WapilotHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "WapilotHttpError";
    this.status = status;
  }
}

export async function wapilotRequest<T>({
  endpoint,
  body,
  method,
  token,
  signal,
}: EndpointsMap & {
  method: "GET" | "POST";
  token: string;
  /** Callers that block a user-facing request pass a timeout signal. */
  signal?: AbortSignal;
}): Promise<T> {
  const url = `${baseUrl}${endpoint}`;
  const fetchOptions: RequestInit = {
    method,
    headers: {
      token: token,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  };

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => ({}));
    const message =
      typeof errorData === "object" &&
      errorData !== null &&
      "message" in errorData &&
      typeof errorData.message === "string"
        ? errorData.message
        : `API Request failed with status ${response.status}`;

    throw new WapilotHttpError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export function checkStatus({
  instanceId,
  token,
  signal,
}: {
  instanceId: string;
  token: string;
  signal?: AbortSignal;
}): Promise<InstanceStatusResponse> {
  return wapilotRequest<InstanceStatusResponse>({
    endpoint: `instances/${instanceId}/status`,
    method: "GET",
    token,
    signal,
  });
}

export function sendText({
  instanceId,
  params,
  token,
  signal,
}: {
  instanceId: string;
  params: SendMessageParams;
  token: string;
  signal?: AbortSignal;
}): Promise<SendMessageResponse> {
  return wapilotRequest<SendMessageResponse>({
    endpoint: `${instanceId}/send-message`,
    method: "POST",
    body: params,
    token,
    signal,
  });
}

/**
 * Get chat id by LID.
 */
export function getChatIdByLid({
  lid,
  token,
}: {
  lid: string;
  token: string;
}): Promise<{ chat_id: string }> {
  return wapilotRequest<{ chat_id: string }>({
    endpoint: `lookup/lid/pn/${lid}`,
    method: "GET",
    token,
  });
}
