import type {
  EndpointsMap,
  InstanceStatusResponse,
  SendMessageParams,
} from "./types";

const baseUrl = "https://api.wapilot.net/api/v2/";

export async function wapilotRequest<T>({
  endpoint,
  body,
  method,
  token,
}: EndpointsMap & {
  method: "GET" | "POST";
  token: string;
}): Promise<T> {
  const url = `${baseUrl}${endpoint}`;
  const fetchOptions: RequestInit = {
    method,
    headers: {
      token: token,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export function checkStatus({
  instanceId,
  token,
}: {
  instanceId: string;
  token: string;
}): Promise<InstanceStatusResponse> {
  return wapilotRequest<InstanceStatusResponse>({
    endpoint: `instances/${instanceId}/status`,
    method: "GET",
    token,
  });
}

export function sendText({
  instanceId,
  params,
  token,
}: {
  instanceId: string;
  params: SendMessageParams;
  token: string;
}): Promise<any> {
  const payload = {
    ...params,
    chat_id: params.chat_id,
  };
  return wapilotRequest({
    endpoint: `${instanceId}/send-message`,
    method: "POST",
    body: payload,
    token,
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
