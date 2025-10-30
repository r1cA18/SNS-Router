import {
  Action,
  ActionPanel,
  AI,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BeeperApiClient, BeeperApiError, Chat, Message, UserSummary } from "./lib/beeper-api";

type ConnectionState = "loading" | "ready" | "error";

type Preferences = {
  beeperAuthToken?: string;
};

interface ChatMessagesState {
  items: Message[];
  hasMore: boolean;
  loading: boolean;
  oldestCursor?: string;
  users?: Record<string, UserSummary>;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const authToken = preferences.beeperAuthToken?.trim();

  const client = useMemo(
    () =>
      new BeeperApiClient({
        authToken: authToken || undefined,
      }),
    [authToken],
  );

  const [connectionState, setConnectionState] = useState<ConnectionState>("loading");
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsError, setChatsError] = useState<string | undefined>();
  const [selectedChatID, setSelectedChatID] = useState<string | undefined>();
  const [messagesState, setMessagesState] = useState<Record<string, ChatMessagesState>>({});

  const messagesStateRef = useRef(messagesState);
  useEffect(() => {
    messagesStateRef.current = messagesState;
  }, [messagesState]);

  const handleApiError = useCallback((error: unknown) => {
    if (error instanceof BeeperApiError) {
      const detail =
        typeof error.details === "string"
          ? error.details
          : error.details && typeof error.details === "object"
            ? JSON.stringify(error.details)
            : undefined;
      if (detail) {
        console.error("Beeper API error details:", detail);
      }
      if (error.status === 401) {
        return "HTTP 401 Unauthorized: Beeper Desktop APIトークンをRaycast設定に入力してください。";
      }
      return detail ?? error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "不明なエラーが発生しました。";
  }, []);

  const loadChats = useCallback(async () => {
    setConnectionState("loading");
    setChatsError(undefined);

    try {
      const response = await client.searchChats({
        limit: 50,
      });
      const singles = response.items.filter((chat) => chat.type === "single");
      const sorted = sortChatsByLastActivity(singles);
      setChats(sorted);
      setConnectionState("ready");
      setSelectedChatID((current) => {
        if (current && sorted.some((chat) => chat.id === current)) {
          return current;
        }
        return sorted[0]?.id;
      });

      if (sorted.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "最近の会話が見つかりません",
        });
      }
    } catch (error) {
      const message = handleApiError(error);
      console.error("Failed to load chats", error);
      setChats([]);
      setChatsError(message);
      setConnectionState("error");
      await showToast({
        style: Toast.Style.Failure,
        title: "チャット一覧の取得に失敗しました",
        message,
      });
    }
  }, [client, handleApiError]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const loadMessages = useCallback(
    async (chatID: string, options: { force?: boolean } = {}) => {
      const existing = messagesStateRef.current[chatID];
      if (!options.force && existing && existing.items.length > 0 && !existing.loading) {
        return;
      }

      setMessagesState((prev) => ({
        ...prev,
        [chatID]: {
          items: existing?.items ?? [],
          hasMore: existing?.hasMore ?? true,
          oldestCursor: existing?.oldestCursor,
          users: existing?.users,
          loading: true,
        },
      }));

      try {
        const response = await client.listMessages(chatID, {
          limit: 20,
        });
        const sorted = sortMessagesAscending(response.messages);
        setMessagesState((prev) => ({
          ...prev,
          [chatID]: {
            items: sorted,
            hasMore: response.hasMore,
            oldestCursor: response.oldestCursor ?? response.cursor ?? existing?.oldestCursor,
            users: mergeUsersRecords(existing?.users, response.users),
            loading: false,
          },
        }));
      } catch (error) {
        const message = handleApiError(error);
        console.error("Failed to load messages", error);
        setMessagesState((prev) => ({
          ...prev,
          [chatID]: {
            items: existing?.items ?? [],
            hasMore: existing?.hasMore ?? false,
            oldestCursor: existing?.oldestCursor,
            users: existing?.users,
            loading: false,
          },
        }));
        await showToast({
          style: Toast.Style.Failure,
          title: "メッセージの取得に失敗しました",
          message,
        });
      }
    },
    [client, handleApiError],
  );

  useEffect(() => {
    if (!selectedChatID) {
      return;
    }
    void loadMessages(selectedChatID);
  }, [loadMessages, selectedChatID]);

  const loadOlderMessages = useCallback(
    async (chatID: string) => {
      const state = messagesStateRef.current[chatID];
      if (!state || state.loading) {
        return;
      }

      if (!state.hasMore) {
        await showToast({
          style: Toast.Style.Success,
          title: "さらに過去のメッセージはありません",
        });
        return;
      }

      const cursor = state.oldestCursor;
      if (!cursor) {
        return;
      }

      setMessagesState((prev) => ({
        ...prev,
        [chatID]: {
          ...state,
          loading: true,
        },
      }));

      try {
      const response = await client.listMessages(chatID, {
        cursor,
        direction: "backward",
        limit: 20,
      });
        const incoming = sortMessagesAscending(response.messages);
        setMessagesState((prev) => {
          const current = prev[chatID] ?? state;
          const merged = mergeMessagesAscending(current.items, incoming);
          return {
            ...prev,
            [chatID]: {
              items: merged,
              hasMore: response.hasMore,
              loading: false,
              oldestCursor: response.oldestCursor ?? response.cursor ?? current.oldestCursor,
              users: mergeUsersRecords(current.users, response.users),
            },
          };
        });
      } catch (error) {
        const message = handleApiError(error);
        console.error("Failed to load older messages", error);
        setMessagesState((prev) => ({
          ...prev,
          [chatID]: state,
        }));
        await showToast({
          style: Toast.Style.Failure,
          title: "過去メッセージの取得に失敗しました",
          message,
        });
      }
    },
    [client, handleApiError],
  );

  const handleSendMessage = useCallback(
    async (chatID: string, input: { text: string; replyToMessageID?: string }) => {
      const trimmed = input.text.trim();
      if (!trimmed) {
        await showToast({
          style: Toast.Style.Failure,
          title: "メッセージを入力してください",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "メッセージ送信中…",
      });

      try {
        await client.sendMessage(chatID, {
          text: trimmed,
          intent: "outgoing",
          replyToMessageID: input.replyToMessageID,
        });
        toast.style = Toast.Style.Success;
        toast.title = "メッセージを送信しました";

        await Promise.all([loadMessages(chatID, { force: true }), loadChats()]);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "メッセージの送信に失敗しました";
        toast.message = handleApiError(error);
        console.error("Failed to send message", error);
      }
    },
    [client, handleApiError, loadChats, loadMessages],
  );

  const handleSummarizeWithAI = useCallback(
    async (chatID: string) => {
      const state = messagesStateRef.current[chatID];
      if (!state || state.loading) {
        await showToast({
          style: Toast.Style.Failure,
          title: "メッセージを取得してから要約してください",
        });
        return;
      }

      if (state.items.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "要約できるメッセージがありません",
        });
        return;
      }

      const chat = chats.find((item) => item.id === chatID);
      if (!chat) {
        await showToast({
          style: Toast.Style.Failure,
          title: "チャット情報を取得できませんでした",
        });
        return;
      }

      const transcript = buildTranscript(chat, state.items, state.users);
      const prompt = [
        "以下はBeeper Desktop APIから取得したDMの会話ログです。",
        "最大5点の箇条書きで重要な要点を抽出し、必要ならアクション項目をまとめてください。",
        "最後に、返信が必要かどうかを短くコメントしてください。",
        "---",
        transcript,
      ].join("\n");

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Raycast AIに要約を依頼中…",
      });

      try {
        const summary = await AI.ask(prompt, { creativity: 0.2 });
        await Clipboard.copy(summary);
        toast.style = Toast.Style.Success;
        toast.title = "要約をクリップボードにコピーしました";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Raycast AI 要約に失敗しました";
        toast.message = error instanceof Error ? error.message : "不明なエラーが発生しました。";
      }
    },
    [chats],
  );

  const currentMessagesState = selectedChatID ? messagesState[selectedChatID] : undefined;
  const isMessagesLoading =
    currentMessagesState !== undefined && currentMessagesState.loading && currentMessagesState.items.length === 0;
  const isLoading = connectionState === "loading" || isMessagesLoading;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="会話を検索"
      selectedItemId={selectedChatID}
      onSelectionChange={(chatID) => {
        if (!chatID) {
          setSelectedChatID(undefined);
          return;
        }
        setSelectedChatID(chatID);
      }}
    >
      {renderList({
        chats,
        chatsError,
        connectionState,
        messagesState,
        loadChats,
        loadOlderMessages,
        handleSendMessage,
        handleSummarizeWithAI,
      })}
    </List>
  );
}

function renderList(props: {
  chats: Chat[];
  chatsError?: string;
  connectionState: ConnectionState;
  messagesState: Record<string, ChatMessagesState>;
  loadChats: () => Promise<void>;
  loadOlderMessages: (chatID: string) => Promise<void>;
  handleSendMessage: (chatID: string, input: { text: string; replyToMessageID?: string }) => Promise<void>;
  handleSummarizeWithAI: (chatID: string) => Promise<void>;
}) {
  const {
    chats,
    chatsError,
    connectionState,
    messagesState,
    loadChats,
    loadOlderMessages,
    handleSendMessage,
    handleSummarizeWithAI,
  } = props;

  if (connectionState === "error" && chats.length === 0) {
    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Beeper Desktop APIに接続できませんでした"
        description={chatsError ?? "接続情報を確認してください。"}
      />
    );
  }

  if (connectionState !== "ready" && chats.length === 0) {
    return <List.EmptyView icon={Icon.Person} title="読み込み中…" />;
  }

  if (chats.length === 0) {
    return <List.EmptyView icon={Icon.Tray} title="最近の会話が見つかりません" />;
  }

  return (
    <List.Section title="最近の会話">
      {chats.map((chat) => {
        const state = messagesState[chat.id];
        const detailMarkdown = buildChatDetailMarkdown(chat, state);
        const accessories = buildAccessories(chat);
        const preview = formatChatPreview(chat, state);
        const metadata = buildChatMetadata(chat, state);
        return (
          <List.Item
            key={chat.id}
            id={chat.id}
            icon={getChatIcon(chat)}
            title={chat.title ?? "名称未設定"}
            subtitle={preview}
            accessories={accessories}
            detail={<List.Item.Detail markdown={detailMarkdown} metadata={metadata} />}
            actions={
              <ActionPanel>
                <Action
                  title="チャット一覧を再取得"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    void loadChats();
                  }}
                />
                <Action.Push
                  title="DMを返信"
                  icon={Icon.Message}
                  target={
                    <ReplyForm
                      chatTitle={chat.title ?? "名称未設定"}
                      messages={state?.items}
                      onSubmit={async (values) => {
                        await handleSendMessage(chat.id, {
                          text: values.text ?? "",
                          replyToMessageID: values.replyToMessageID || undefined,
                        });
                      }}
                    />
                  }
                />
                <Action
                  title="さらに過去を読み込む"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={() => {
                    void loadOlderMessages(chat.id);
                  }}
                />
                <Action
                  title="Raycast AIで要約"
                  icon={Icon.Stars}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                  onAction={() => {
                    void handleSummarizeWithAI(chat.id);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

function sortMessagesAscending(messages: Message[]) {
  return [...messages].sort((a, b) => getMessageSortKey(a).localeCompare(getMessageSortKey(b)));
}

function mergeMessagesAscending(current: Message[], incoming: Message[]) {
  const merged = new Map<string, Message>();
  for (const message of current) {
    merged.set(buildMessageMapKey(message), message);
  }
  for (const message of incoming) {
    merged.set(buildMessageMapKey(message), message);
  }
  return sortMessagesAscending(Array.from(merged.values()));
}

function buildMessageMapKey(message: Message) {
  return message.id ?? `sortKey:${getMessageSortKey(message)}`;
}

function getMessageSortKey(message: Message) {
  if (typeof message.sortKey === "string" && message.sortKey.length > 0) {
    return message.sortKey;
  }
  if (message.sortKey !== undefined && message.sortKey !== null) {
    return String(message.sortKey);
  }
  if (message.timestamp) {
    const ms = Date.parse(message.timestamp);
    if (!Number.isNaN(ms)) {
      return String(ms);
    }
    return message.timestamp;
  }
  if (message.id) {
    return message.id;
  }
  return "";
}

function mergeUsersRecords(
  current?: Record<string, UserSummary>,
  incoming?: Record<string, UserSummary>,
): Record<string, UserSummary> | undefined {
  if (!current && !incoming) {
    return undefined;
  }
  if (!current) {
    return incoming ? { ...incoming } : undefined;
  }
  if (!incoming) {
    return { ...current };
  }
  return { ...current, ...incoming };
}

function sortChatsByLastActivity(chats: Chat[]) {
  return [...chats].sort((a, b) => getLastActivityTime(b.lastActivity) - getLastActivityTime(a.lastActivity));
}

function getLastActivityTime(value?: string) {
  if (!value) {
    return 0;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function buildAccessories(chat: Chat) {
  const accessories: List.Item.Accessory[] = [];
  if (chat.unreadCount > 0) {
    accessories.push({
      tag: {
        value: chat.unreadCount.toString(),
        color: Color.Red,
      },
    });
  }
  if (chat.lastActivity) {
    accessories.push({
      text: formatRelativeTime(chat.lastActivity),
      tooltip: formatTimestamp(chat.lastActivity),
    });
  }
  return accessories;
}

function getChatIcon(chat: Chat) {
  const network = chat.network?.toLowerCase();
  switch (network) {
    case "slack":
      return Icon.Hashtag;
    case "telegram":
      return Icon.Paperplane;
    case "whatsapp":
      return Icon.Phone;
    case "instagram":
      return Icon.Camera;
    case "facebook":
    case "messenger":
      return Icon.Message;
    case "sms":
    case "imessage":
      return Icon.Message;
    case "x":
    case "twitter":
      return Icon.Globe;
    default:
      return Icon.Message;
  }
}

function formatChatPreview(chat: Chat, state?: ChatMessagesState) {
  if (state && state.items.length > 0) {
    const participants = createParticipantNameMap(chat, state.users);
    const last = state.items[state.items.length - 1];
    const sender = participants[last.senderID] ?? (last.senderName ?? "不明な参加者");
    const body = formatMessageBody(last);
    const preview = body === "(本文なし)" && last.attachments && last.attachments.length > 0 ? "添付ファイル" : body;
    return truncate(`${sender}: ${preview}`, 60);
  }

  const previewText = chat.preview?.text?.trim();
  if (previewText) {
    return truncate(previewText, 60);
  }

  if (chat.unreadCount > 0) {
    return `${chat.unreadCount}件の未読メッセージ`;
  }

  return "メッセージを読み込み中…";
}

const RECENT_MESSAGES_LIMIT = 15;

function buildChatDetailMarkdown(chat: Chat, state?: ChatMessagesState) {
  const lines: string[] = [];
  lines.push(`# ${chat.title ?? "名称未設定"}`);
  lines.push("");
  if (chat.network) {
    lines.push(`**プラットフォーム**: ${chat.network}`);
    lines.push("");
  }
  if (chat.lastActivity) {
    lines.push(`_最終更新: ${formatTimestamp(chat.lastActivity)}_`);
    lines.push("");
  }
  const preview = formatChatPreview(chat, state);
  if (preview) {
    lines.push(`> ${preview}`);
    lines.push("");
  }

  if (!state || (state.loading && state.items.length === 0)) {
    lines.push("メッセージを読み込み中です…");
    return lines.join("\n");
  }

  if (state.items.length === 0) {
    lines.push("表示できるメッセージがありません。");
    return lines.join("\n");
  }

  lines.push("## 最近のメッセージ");
  lines.push("");
  lines.push(formatMessagesMarkdown(chat, state));
  return lines.join("\n");
}

function buildChatMetadata(chat: Chat, state?: ChatMessagesState) {
  const lastMessage = state?.items?.[state.items.length - 1];
  const lastTimestamp = lastMessage?.timestamp ?? chat.lastActivity;
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="プラットフォーム" text={chat.network ?? "不明"} />
      <Detail.Metadata.Label title="未読" text={(chat.unreadCount ?? 0).toString()} />
      <Detail.Metadata.Label title="最終メッセージ" text={formatTimestamp(lastTimestamp)} />
      {chat.description ? <Detail.Metadata.Label title="説明" text={chat.description} /> : null}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Chat ID" text={chat.id} />
    </Detail.Metadata>
  );
}

function formatMessagesMarkdown(chat: Chat, state?: ChatMessagesState) {
  if (!state) {
    return "メッセージを読み込み中です…";
  }

  if (state.loading && state.items.length === 0) {
    return "メッセージを読み込み中です…";
  }

  if (state.items.length === 0) {
    return "表示できるメッセージがありません。";
  }

  const participants = createParticipantNameMap(chat, state.users);
  const recent = state.items.slice(-RECENT_MESSAGES_LIMIT);
  return recent
    .map((message) => formatSingleMessageMarkdown(message, participants[message.senderID] ?? message.senderID))
    .join("\n\n");
}

function formatSingleMessageMarkdown(message: Message, sender: string) {
  const badges: string[] = [];
  if (message.isSender) {
    badges.push("あなた");
  }
  if (message.isUnread) {
    badges.push("未読");
  }

  const timestamp = formatTimestamp(message.timestamp);
  const headerLine = badges.length > 0 ? `${timestamp} • ${badges.join(" / ")}` : timestamp;

  const body = formatMessageBody(message);
  const quote = body
    .split("\n")
    .map((line) => `> ${line.length === 0 ? " " : line}`)
    .join("\n");

  return [`### ${sender}`, `_${headerLine}_`, "", quote].join("\n");
}

function createParticipantNameMap(chat: Chat, users?: Record<string, UserSummary>) {
  const map: Record<string, string> = {};
  for (const participant of chat.participants.items) {
    const display =
      participant.fullName ?? participant.username ?? participant.phoneNumber ?? participant.email ?? participant.id;
    map[participant.id] = participant.isSelf ? `${display}（自分）` : display;
  }
  if (users) {
    for (const [id, user] of Object.entries(users)) {
      if (map[id]) {
        continue;
      }
      const display = user.fullName ?? user.username ?? user.phoneNumber ?? user.email ?? id;
      map[id] = user.isSelf ? `${display}（自分）` : display;
    }
  }
  return map;
}

function formatTimestamp(timestamp: string | undefined) {
  if (!timestamp) {
    return "日時不明";
  }
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }
    return new Intl.DateTimeFormat("ja-JP", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return timestamp;
  }
}

function formatMessageBody(message: Message) {
  const text = message.text?.trim();
  if (text) {
    return text;
  }
  if (!message.attachments || message.attachments.length === 0) {
    return "(本文なし)";
  }
  return message.attachments
    .map((attachment) => {
      const type = attachment.type ?? "ファイル";
      const name = attachment.fileName ?? attachment.mimeType ?? "不明な添付";
      return `(${type}) ${name}`;
    })
    .join("\n");
}

function formatRelativeTime(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return "たった今";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}時間前`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}日前`;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
  }).format(date);
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

type ReplyFormValues = {
  text: string;
  replyToMessageID?: string;
};

function ReplyForm(props: {
  chatTitle: string;
  messages?: Message[];
  onSubmit: (values: ReplyFormValues) => Promise<void>;
}) {
  const { chatTitle, messages, onSubmit } = props;
  const defaultReplyTo = useMemo(() => {
    if (!messages || messages.length === 0) {
      return undefined;
    }
    const incoming = [...messages].reverse().find((message) => message.isSender === false || message.isSender === undefined);
    return incoming?.id;
  }, [messages]);

  return (
    <Form
      navigationTitle={`返信: ${chatTitle}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="送信"
            icon={Icon.Message}
            onSubmit={async (values: ReplyFormValues) => {
              await onSubmit({
                text: values.text ?? "",
                replyToMessageID: values.replyToMessageID && values.replyToMessageID.length > 0 ? values.replyToMessageID : undefined,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`宛先: ${chatTitle}`} />
      <Form.TextArea id="text" title="メッセージ" placeholder="返信内容を入力" autoFocus />
      {messages && messages.length > 0 ? (
        <Form.Dropdown
          id="replyToMessageID"
          title="返信対象（任意）"
          defaultValue={defaultReplyTo ?? ""}
          storeValue={false}
        >
          <Form.Dropdown.Item value="" title="返信対象なし" />
          {messages
            .slice(-10)
            .reverse()
            .map((message, index) => (
              <Form.Dropdown.Item
                key={message.id ?? message.timestamp ?? `message-${index}`}
                value={message.id ?? ""}
                title={formatDropdownTitle(message)}
              />
            ))}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}

function formatDropdownTitle(message: Message) {
  const base = message.text?.trim();
  if (base && base.length > 0) {
    return base.length > 40 ? `${base.slice(0, 40)}…` : base;
  }
  if (message.timestamp) {
    return `メッセージ (${formatTimestamp(message.timestamp)})`;
  }
  return message.id ?? "メッセージ";
}

function buildTranscript(chat: Chat, messages: Message[], users?: Record<string, UserSummary>) {
  const participants = createParticipantNameMap(chat, users);
  return messages
    .map((message) => {
      const sender = participants[message.senderID] ?? message.senderID;
      const timestamp = formatTimestamp(message.timestamp);
      const body = formatMessageBody(message);
      return `[${timestamp}] ${sender}: ${body}`;
    })
    .join("\n");
}
