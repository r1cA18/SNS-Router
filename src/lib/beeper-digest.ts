import { BeeperApiClient, Chat, ListMessagesResponse, Message } from "./beeper-api";
import {
  ConversationMessage,
  WeeklyDigestPeriod,
} from "../types";

export interface FetchConversationOptions {
  days?: number;
  startDate?: Date;
  endDate?: Date;
  includeMuted?: boolean;
  chatLimit?: number;
  messageLimitPerChat?: number;
}

export interface ConversationFetchResult {
  chats: Chat[];
  period: WeeklyDigestPeriod;
  messages: ConversationMessage[];
  errors: { chatId: string; message: string }[];
}

const DEFAULT_CHAT_LIMIT = 50;
const DEFAULT_MESSAGE_LIMIT = 200;
const DEFAULT_DAYS = 14;

export async function fetchConversationMessages(
  client: BeeperApiClient,
  options: FetchConversationOptions = {},
): Promise<ConversationFetchResult> {
  const end = options.endDate ?? new Date();
  const start = options.startDate ?? subtractDays(end, options.days ?? DEFAULT_DAYS);
  const chatLimit = options.chatLimit ?? DEFAULT_CHAT_LIMIT;
  const messageLimit = options.messageLimitPerChat ?? DEFAULT_MESSAGE_LIMIT;

  const chatsResponse = await client.searchChats({
    includeMuted: options.includeMuted ?? true,
    limit: chatLimit,
    direction: "before",
  });

  const result: ConversationFetchResult = {
    chats: chatsResponse.items,
    period: { start, end },
    messages: [],
    errors: [],
  };

  const sinceISO = start.toISOString();

  for (const chat of chatsResponse.items) {
    try {
      const messagesResponse = await client.listMessages(chat.id, {
        direction: "before",
        limit: messageLimit,
        dateAfter: sinceISO,
      });

      const normalized = normalizeMessages(chat, messagesResponse, start, end);
      result.messages.push(...normalized);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push({ chatId: chat.id, message });
    }
  }

  return result;
}

function normalizeMessages(
  chat: Chat,
  response: ListMessagesResponse,
  start: Date,
  end: Date,
): ConversationMessage[] {
  return response.messages
    .filter((message) => isWithinPeriod(message, start, end))
    .map((message) => toConversationMessage(chat, message, response));
}

function toConversationMessage(chat: Chat, message: Message, data: ListMessagesResponse): ConversationMessage {
  const sender = resolveParticipantName(message, chat, data);
  return {
    id: message.id,
    chatId: chat.id,
    chatName: chat.title ?? "名称未設定",
    platform: chat.network,
    senderId: message.senderID,
    senderName: sender,
    text: message.text ?? "",
    attachments: normalizeAttachments(message),
    timestamp: new Date(message.timestamp),
    isFromSelf: Boolean(message.isSender),
    isUnread: Boolean(message.isUnread),
  };
}

function isWithinPeriod(message: Message, start: Date, end: Date) {
  try {
    const timestamp = new Date(message.timestamp);
    return timestamp >= start && timestamp <= end;
  } catch {
    return false;
  }
}

function resolveParticipantName(message: Message, chat: Chat, data: ListMessagesResponse) {
  if (message.senderName) {
    return message.senderName;
  }

  if (data.users && data.users[message.senderID]) {
    const user = data.users[message.senderID];
    return (
      user.fullName ??
      user.username ??
      user.phoneNumber ??
      user.email ??
      user.id ??
      message.senderID
    );
  }

  const participant = chat.participants.items.find((item) => item.id === message.senderID);
  if (participant) {
    return (
      participant.fullName ??
      participant.username ??
      participant.phoneNumber ??
      participant.email ??
      participant.id ??
      message.senderID
    );
  }

  return message.senderID;
}

function normalizeAttachments(message: Message) {
  if (!message.attachments || message.attachments.length === 0) {
    return undefined;
  }
  return message.attachments.map((attachment) => ({
    type: attachment.type ?? "unknown",
    name: attachment.fileName ?? attachment.mimeType,
    url: attachment.srcURL,
  }));
}

function subtractDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}
