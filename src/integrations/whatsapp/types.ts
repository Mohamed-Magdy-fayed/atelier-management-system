/**
 * Instance status information.
 */
export interface InstanceStatusResponse {
  success: boolean;
  status: string;
  me_id?: string;
  me_push_name?: string;
  status_message: string;
}

/**
 * Message sending parameters.
 */
export interface SendMessageParams {
  chat_id: string;
  text: string;
}

/**
 * Send acknowledgement. Wapilot returns more than this, but nothing else is
 * relied on — the id is kept so a delivery can be traced in their dashboard.
 */
export interface SendMessageResponse {
  success?: boolean;
  message_id?: string;
  message?: string;
}

type InstanceStatus = `instances/${string}/status`;
type SendMessage = `${string}/send-message`;
type GetPNId = `lookup/lid/pn/${string}`;

export type EndpointsMap =
  | {
      endpoint: SendMessage;
      body: SendMessageParams;
    }
  | {
      endpoint: InstanceStatus | GetPNId;
      body?: undefined;
    };
