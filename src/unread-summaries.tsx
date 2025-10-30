import {
  Action,
  ActionPanel,
  AI,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import {
  BeeperApiClient,
  BeeperApiError,
  Chat,
  Message,
  UserSummary,
} from "./lib/beeper-api";

type Preferences = {
  beeperAuthToken?: string;
};

type SummaryResult = {
  chat: Chat;
  summary?: string;
  highlights?: string[];
  nextActions?: string[];
  snippets?: MessageSnippet[];
  error?: string;
  messageCount: number;
  lastMessageAt?: string;
};

type MessageSnippet = {
  sender: string;
  text: string;
  timestamp?: string;
  url?: string;
};

type AiSummary = {
  summary: string;
  highlights?: string[];
  next_actions?: string[];
  snippets?: MessageSnippet[];
};

type FetchState =
  | { status: "loading"; progressText?: string }
  | { status: "ready"; items: SummaryResult[] }
  | { status: "error"; message: string };

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

  const [state, setState] = useState<FetchState>({ status: "loading", progressText: "未読チャネルを検索中…" });

  useEffect(() => {
    void loadSummaries();
  }, [client]);

  const loadSummaries = async () => {
    setState({ status: "loading", progressText: "未読チャネルを検索中…" });
    try {
      const chatsResponse = await client.searchChats({
        unreadOnly: true,
        includeMuted: true,
        limit: 30,
        type: "any",
      });

      const unreadChats = chatsResponse.items.filter((chat) => (chat.unreadCount ?? 0) > 0).slice(0, 5);

      if (unreadChats.length === 0) {
        setState({ status: "ready", items: [] });
        return;
      }

      const results: SummaryResult[] = [];

      for (let index = 0; index < unreadChats.length; index++) {
        const chat = unreadChats[index];
        setState({
          status: "loading",
          progressText: `${index + 1}/${unreadChats.length}件目を要約中…`,
        });

        try {
          const summary = await summarizeChat(client, chat);
          results.push(summary);
        } catch (error) {
          const message = handleErrorMessage(error);
          console.error("Failed to summarize chat", chat.id, error);
          results.push({
            chat,
            error: message,
            messageCount: 0,
            lastMessageAt: chat.lastActivity,
          });
        }
      }

      setState({
        status: "ready",
        items: results.sort((a, b) => getLastActivityTime(b.lastMessageAt) - getLastActivityTime(a.lastMessageAt)),
      });
    } catch (error) {
      const message = handleErrorMessage(error);
      console.error("Failed to fetch unread chats", error);
      setState({
        status: "error",
        message,
      });
      await showToast({
        style: Toast.Style.Failure,
        title: "未読チャネルの取得に失敗しました",
        message,
      });
    }
  };

  if (state.status === "loading") {
    return (
      <List isLoading searchBarPlaceholder="チャネル名で検索">
        <List.EmptyView icon={Icon.Hammer} title="要約を準備中…" description={state.progressText} />
      </List>
    );
  }

  if (state.status === "error") {
    return (
      <List searchBarPlaceholder="チャネル名で検索">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="要約を取得できませんでした"
          description={state.message}
          actions={
            <ActionPanel>
              <Action title="再試行" icon={Icon.ArrowClockwise} onAction={() => void loadSummaries()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const grouped = groupByPlatform(state.items);

  return (
    <List searchBarPlaceholder="チャネル名で検索" navigationTitle="未読チャネルの要約" isShowingDetail>
      {state.items.length === 0 ? (
        <List.EmptyView icon={Icon.Checkmark} title="未読メッセージはありません" />
      ) : null}

      {grouped.map((group) => (
        <List.Section key={group.platform} title={group.platform}>
          {group.items.map((item) => {
            const detail = buildDetailMarkdown(item);
            const metadata = buildMetadata(item);
            const accessories = buildAccessories(item);
            return (
              <List.Item
                key={item.chat.id}
                title={item.chat.title ?? "名称未設定"}
                subtitle={item.summary ?? item.error ?? "要約結果がありません"}
                icon={getChatIcon(item.chat)}
                accessories={accessories}
                detail={<List.Item.Detail markdown={detail} metadata={metadata} />}
                actions={
                  <ActionPanel>
                    <Action title="再読み込み" icon={Icon.ArrowClockwise} onAction={() => void loadSummaries()} />
                    {item.summary ? (
                      <Action.CopyToClipboard title="要約をコピー" content={item.summary} />
                    ) : null}
                    {item.summary || item.error ? (
                      <Action
                        title="詳細をクリップボードにコピー"
                        icon={Icon.Clipboard}
                        onAction={() => {
                          const content = buildFullText(item);
                          void Clipboard.copy(content);
                          void showToast({
                            style: Toast.Style.Success,
                            title: "コピーしました",
                          });
                        }}
                      />
                    ) : null}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

async function summarizeChat(client: BeeperApiClient, chat: Chat): Promise<SummaryResult> {
  const messagesResponse = await client.listMessages(chat.id, {
    direction: "before",
    limit: 40,
  });

  const messages = sortMessagesAscending(messagesResponse.messages);
  const participants = createParticipantNameMap(chat, messagesResponse.users);

  if (messages.length === 0) {
    return {
      chat,
      summary: "未読メッセージを取得できませんでした。",
      messageCount: 0,
      lastMessageAt: chat.lastActivity,
    };
  }

  const transcript = buildTranscript(chat, messages, participants);
  const prompt = buildSummaryPrompt(chat, messages.length, transcript);
  const raw = await AI.ask(prompt, { creativity: 0.1 });
  const parsed = parseSummaryResponse(raw);

  return {
    chat,
    summary: parsed.summary,
    highlights: parsed.highlights ?? [],
    nextActions: parsed.next_actions ?? [],
    snippets: sanitizedSnippets(parsed.snippets),
    messageCount: messages.length,
    lastMessageAt: messages[messages.length - 1]?.timestamp ?? chat.lastActivity,
  };
}

function buildSummaryPrompt(chat: Chat, count: number, transcript: string) {
  const channelName = chat.title ?? "名称未設定";
  const platform = chat.network ?? "Unknown";
  return [
    "You are helping summarize unread messages from a Beeper text channel.",
    `Channel: ${channelName}`,
    `Platform: ${platform}`,
    `Unread message count: ${count}`,
    "",
    "Output a pure JSON object with the shape:",
    '{ "summary": "text", "highlights": ["..."], "next_actions": ["..."], "snippets": [{ "sender": "...", "text": "...", "timestamp": "ISO", "url": "..." }] }',
    "Rules:",
    "- Keep summary within ~80 Japanese characters if possible.",
    "- Provide up to 5 highlights.",
    "- Provide up to 3 next_actions; omit if not needed.",
    "- Provide up to 3 snippets from the transcript.",
    "- Do not wrap JSON in markdown fences. Do not add explanations.",
    "",
    "Transcript of unread messages:",
    transcript,
  ].join("\n");
}

function parseSummaryResponse(raw: string): AiSummary {
  const text = normalizeJsonForParsing(extractJson(raw));
  try {
    const parsed = JSON.parse(text) as Partial<AiSummary>;
    if (!parsed.summary) {
      throw new Error("Summary field is missing.");
    }
    return parsed as AiSummary;
  } catch (error) {
    console.error("Failed to parse summary response", { raw, error });
    throw new Error("Raycast AIからの要約結果を解析できませんでした。");
  }
}

function extractJson(raw: string) {
  const fenceMatch = raw.match(/```json([\s\S]*?)```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  const generic = raw.match(/```([\s\S]*?)```/);
  if (generic) {
    return generic[1].trim();
  }
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }
  return raw.trim();
}

function normalizeJsonForParsing(text: string) {
  let result = "";
  let inString = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const prev = index > 0 ? text[index - 1] : "";
    if (char === '"' && prev !== "\\") {
      inString = !inString;
    }

    if (inString && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") {
        index++;
      }
      result += "\\n";
      continue;
    }

    result += char;
  }
  return result;
}

function sanitizedSnippets(snippets: MessageSnippet[] | undefined) {
  if (!snippets) {
    return [];
  }
  return snippets.slice(0, 3).map((snippet) => ({
    sender: snippet.sender ?? "不明な送信者",
    text: snippet.text ?? "",
    timestamp: snippet.timestamp,
    url: snippet.url,
  }));
}

function buildDetailMarkdown(item: SummaryResult) {
  const lines: string[] = [];
  lines.push(`# ${item.chat.title ?? "名称未設定"}`);
  lines.push("");

  if (item.summary) {
    lines.push(item.summary);
    lines.push("");
  }

  if (item.error) {
    lines.push(`> ⚠️ ${item.error}`);
    lines.push("");
  }

  if (item.highlights && item.highlights.length > 0) {
    lines.push("## ハイライト");
    lines.push("");
    for (const highlight of item.highlights) {
      lines.push(`- ${highlight}`);
    }
    lines.push("");
  }

  if (item.nextActions && item.nextActions.length > 0) {
    lines.push("## Next Actions");
    lines.push("");
    for (const action of item.nextActions) {
      lines.push(`- ${action}`);
    }
    lines.push("");
  }

  if (item.snippets && item.snippets.length > 0) {
    lines.push("## 代表的なメッセージ");
    lines.push("");
    for (const snippet of item.snippets) {
      const timestamp = snippet.timestamp ? formatTimestamp(snippet.timestamp) : "日時不明";
      lines.push(`**${snippet.sender}**  _${timestamp}_`);
      lines.push(snippet.text || "(本文なし)");
      if (snippet.url) {
        lines.push(`[メッセージを開く](${snippet.url})`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildMetadata(item: SummaryResult) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="プラットフォーム" text={item.chat.network ?? "不明"} />
      <List.Item.Detail.Metadata.Label title="未読数" text={(item.chat.unreadCount ?? 0).toString()} />
      <List.Item.Detail.Metadata.Label
        title="メッセージ数"
        text={item.messageCount.toString()}
      />
      {item.lastMessageAt ? (
        <List.Item.Detail.Metadata.Label title="最終メッセージ" text={formatTimestamp(item.lastMessageAt)} />
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Chat ID" text={item.chat.id} />
    </List.Item.Detail.Metadata>
  );
}

function buildAccessories(item: SummaryResult): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (item.chat.unreadCount && item.chat.unreadCount > 0) {
    accessories.push({
      tag: {
        value: item.chat.unreadCount.toString(),
        color: Color.Red,
      },
    });
  }
  if (item.lastMessageAt) {
    accessories.push({
      text: formatRelativeTime(item.lastMessageAt),
      tooltip: formatTimestamp(item.lastMessageAt),
    });
  }
  return accessories;
}

function buildFullText(item: SummaryResult) {
  const lines: string[] = [];
  lines.push(`${item.chat.title ?? "名称未設定"} (${item.chat.network ?? "不明"})`);
  lines.push(`未読数: ${item.chat.unreadCount ?? 0}`);
  lines.push(`メッセージ数: ${item.messageCount}`);
  if (item.lastMessageAt) {
    lines.push(`最終メッセージ: ${formatTimestamp(item.lastMessageAt)}`);
  }
  lines.push("");

  if (item.summary) {
    lines.push(`要約: ${item.summary}`);
    lines.push("");
  }

  if (item.highlights && item.highlights.length > 0) {
    lines.push("ハイライト:");
    for (const highlight of item.highlights) {
      lines.push(`- ${highlight}`);
    }
    lines.push("");
  }

  if (item.nextActions && item.nextActions.length > 0) {
    lines.push("Next Actions:");
    for (const action of item.nextActions) {
      lines.push(`- ${action}`);
    }
    lines.push("");
  }

  if (item.snippets && item.snippets.length > 0) {
    lines.push("代表的なメッセージ:");
    for (const snippet of item.snippets) {
      const timestamp = snippet.timestamp ? formatTimestamp(snippet.timestamp) : "日時不明";
      lines.push(`- ${snippet.sender} (${timestamp})`);
      lines.push(`  ${snippet.text || "(本文なし)"}`);
      if (snippet.url) {
        lines.push(`  URL: ${snippet.url}`);
      }
    }
  }

  if (item.error) {
    lines.push("");
    lines.push(`エラー: ${item.error}`);
  }

  return lines.join("\n");
}

function groupByPlatform(items: SummaryResult[]) {
  const map = new Map<string, SummaryResult[]>();
  for (const item of items) {
    const key = item.chat.network ?? "その他";
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push(item);
  }
  return Array.from(map.entries()).map(([platform, groupItems]) => ({
    platform,
    items: groupItems,
  }));
}

function sortMessagesAscending(messages: Message[]) {
  return [...messages].sort((a, b) => getMessageSortKey(a).localeCompare(getMessageSortKey(b)));
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

function buildTranscript(chat: Chat, messages: Message[], participants: Record<string, string>) {
  return messages
    .map((message) => {
      const sender = participants[message.senderID] ?? message.senderID;
      const timestamp = formatTimestamp(message.timestamp);
      const body = formatMessageBody(message);
      return `[${timestamp}] ${sender}: ${body}`;
    })
    .join("\n");
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
    .join(", ");
}

function getChatIcon(chat: Chat) {
  const network = chat.network?.toLowerCase();
  switch (network) {
    case "slack":
      return Icon.Hashtag;
    case "discord":
      return Icon.Bubble;
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

function getLastActivityTime(value?: string) {
  if (!value) {
    return 0;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function handleErrorMessage(error: unknown) {
  if (error instanceof BeeperApiError) {
    if (error.status === 401) {
      return "HTTP 401 Unauthorized: Beeper APIトークンをRaycast設定に入力してください。";
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "不明なエラーが発生しました。";
}
