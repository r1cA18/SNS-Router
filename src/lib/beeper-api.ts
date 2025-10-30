const DEFAULT_BASE_URL = "http://localhost:23373/v0";

export class BeeperApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly details?: unknown,
  ) {
    super(statusText ? `HTTP ${status} ${statusText}` : `HTTP ${status}`);
    this.name = "BeeperApiError";
  }
}

export interface BeeperApiClientOptions {
  baseUrl?: string;
  authToken?: string;
  fetchImpl?: typeof fetch;
}

export interface ParticipantsSummary<TUser> {
  hasMore: boolean;
  items: TUser[];
  total: number;
}

export interface UserSummary {
  id: string;
  cannotMessage?: boolean;
  email?: string;
  fullName?: string;
  imgURL?: string;
  isSelf?: boolean;
  phoneNumber?: string;
  username?: string;
}

export interface MessageAttachment {
  type: "unknown" | "img" | "video" | "audio";
  duration?: number;
  fileName?: string;
  fileSize?: number;
  isGif?: boolean;
  isSticker?: boolean;
  isVoiceNote?: boolean;
  mimeType?: string;
  posterImg?: string;
  size?: {
    height?: number;
    width?: number;
  };
  srcURL?: string;
}

export interface MessageReaction {
  id: string;
  participantID: string;
  reactionKey: string;
  emoji?: boolean;
  imgURL?: string;
}

export interface Message {
  id: string;
  accountID: string;
  chatID: string;
  senderID: string;
  sortKey: string;
  timestamp: string;
  attachments?: MessageAttachment[];
  isSender?: boolean;
  isUnread?: boolean;
  reactions?: MessageReaction[];
  senderName?: string;
  text?: string;
}

export interface Chat {
  id: string;
  accountID: string;
  network?: string;
  participants: ParticipantsSummary<UserSummary>;
  type: "single" | "group";
  unreadCount: number;
  description?: string;
  isArchived?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  lastActivity?: string;
  lastReadMessageSortKey?: string;
  localChatID?: string;
  title?: string;
  preview?: Message;
}

export interface SearchChatsResponse {
  hasMore: boolean;
  items: Chat[];
  newestCursor?: string;
  oldestCursor?: string;
}

export interface ChatSearchParams {
  accountIDs?: string[];
  cursor?: string;
  direction?: "after" | "before";
  inbox?: "primary" | "low-priority" | "archive";
  includeMuted?: boolean;
  lastActivityAfter?: string;
  lastActivityBefore?: string;
  limit?: number;
  query?: string;
  scope?: "titles" | "participants";
  type?: "single" | "group" | "any";
  unreadOnly?: boolean;
}

export interface ListChatsResponse {
  hasMore: boolean;
  items: Chat[];
  newestCursor?: string;
  oldestCursor?: string;
}

export interface ChatMember {
  id?: string;
  chatID: string;
  participantID: string;
  lastReadMessageSortKey?: string;
  role?: string;
  permissions?: string[];
  isHidden?: boolean;
}

export interface ListMessagesParams {
  cursor?: string;
  direction?: "backward" | "forward";
  limit?: number;
  includePending?: boolean;
  query?: string;
  dateAfter?: string;
  dateBefore?: string;
  sender?: "me" | "others";
}

export interface SearchMessagesResponse {
  hasMore: boolean;
  items: Message[];
  newestCursor?: string;
  oldestCursor?: string;
  users?: Record<string, UserSummary>;
  chatMembers?: ChatMember[];
}

export interface ListMessagesResponse {
  hasMore: boolean;
  messages: Message[];
  cursor?: string;
  newestCursor?: string;
  oldestCursor?: string;
  users?: Record<string, UserSummary>;
  chatMembers?: ChatMember[];
}

export interface SendableMessage {
  text?: string;
  attachments?: MessageAttachment[];
  intent?: "auto" | "incoming" | "outgoing";
  quoteMessageID?: string;
  replyToMessageID?: string;
  silent?: boolean;
}

export interface SendMessageResponse {
  chatID: string;
  pendingMessageID: string;
  message?: Message;
}

type QueryValue = string | number | boolean | null;
type QueryParams = Record<string, QueryValue | QueryValue[] | undefined>;

type RequestOptions = {
  method?: string;
  body?: string;
  signal?: AbortSignal;
  query?: QueryParams;
};

export class BeeperApiClient {
  private readonly baseUrl: string;
  private readonly authToken?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BeeperApiClientOptions = {}) {
    const base = options.baseUrl ?? DEFAULT_BASE_URL;
    this.baseUrl = base.endsWith("/") ? base : `${base}/`;
    this.authToken = options.authToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async searchChats(params: ChatSearchParams = {}): Promise<SearchChatsResponse> {
    return this.get<SearchChatsResponse>("/search-chats", { query: params as QueryParams });
  }

  async listChats(params: { cursor?: string; direction?: "after" | "before" } = {}): Promise<ListChatsResponse> {
    return this.get<ListChatsResponse>("/search-chats", { query: params as QueryParams });
  }

  async retrieveChat(chatID: string): Promise<Chat> {
    return this.get<Chat>("/get-chat", {
      query: { chatID, maxParticipantCount: -1 },
    });
  }

  async listMessages(chatID: string, params: ListMessagesParams = {}): Promise<ListMessagesResponse> {
    const response = await this.get<SearchMessagesResponse>("/search-messages", {
      query: { chatIDs: [chatID], ...params } as QueryParams,
    });

    // SearchMessagesResponse を ListMessagesResponse 形式に変換
    return {
      hasMore: response.hasMore,
      messages: response.items,
      newestCursor: response.newestCursor,
      oldestCursor: response.oldestCursor,
      users: response.users,
      chatMembers: response.chatMembers,
    };
  }

  async sendMessage(chatID: string, message: SendableMessage): Promise<SendMessageResponse> {
    const payload: Record<string, unknown> = {
      chatID,
    };

    if (message.text !== undefined) {
      payload.text = message.text;
    }

    if (message.replyToMessageID !== undefined) {
      payload.replyToMessageID = message.replyToMessageID;
    } else {
      payload.replyToMessageID = null;
    }

    if (message.intent) {
      payload.intent = message.intent;
    }

    return this.post<SendMessageResponse>("/send-message", {
      body: JSON.stringify(payload),
    });
  }

  private async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  private async post<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST" });
  }

  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const { query, ...fetchOptions } = options;
    const url = this.buildUrl(path, query);
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const hasBody = fetchOptions.body !== undefined && fetchOptions.body !== null;
    if (hasBody) {
      headers["Content-Type"] = "application/json";
    }

    const response = await this.fetchImpl(url.toString(), {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const details = await this.parseErrorBody(response);
      throw new BeeperApiError(response.status, response.statusText, details);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return (await response.text()) as unknown as T;
    }

    return (await response.json()) as T;
  }

  private buildUrl(path: string, query?: QueryParams) {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    const url = new URL(normalizedPath, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) {
          continue;
        }

        if (Array.isArray(value)) {
          for (const item of value) {
            if (item === undefined || item === null) {
              continue;
            }
            const arrayKey = key.endsWith("[]") ? key : `${key}[]`;
            url.searchParams.append(arrayKey, String(item));
          }
          continue;
        }

        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }

  private async parseErrorBody(response: Response) {
    const text = await response.text();
    if (!text) {
      return undefined;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
