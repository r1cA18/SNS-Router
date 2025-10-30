import {
  Action,
  ActionPanel,
  AI,
  Clipboard,
  Detail,
  Icon,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BeeperApiClient } from "./lib/beeper-api";
import { fetchConversationMessages } from "./lib/beeper-digest";
import {
  ConversationMessage,
  WeeklyDigest,
  WeeklyDigestComparison,
  WeeklyDigestPeriod,
  WeeklyDigestStats,
} from "./types";

type Preferences = {
  beeperAuthToken?: string;
};

type DigestState =
  | { status: "idle" | "loading"; message?: string }
  | { status: "ready"; digest: WeeklyDigest; reportMarkdown: string }
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

  const [state, setState] = useState<DigestState>({ status: "idle" });

  const loadDigest = useCallback(async () => {
    setState({ status: "loading", message: "Beeper会話履歴を取得しています…" });

    try {
      const result = await fetchConversationMessages(client, {
        days: 14,
        chatLimit: 25,
        messageLimitPerChat: 200,
        includeMuted: true,
      });

      const allMessages = result.messages;
      const digest = buildWeeklyDigest(result.period, allMessages);

      setState({
        status: "loading",
        message: "Raycast AIで週次レポートを生成しています…",
      });

      const prompt = buildReportPrompt(digest, allMessages);
      const markdown = await AI.ask(prompt, { creativity: 0.2 });

      setState({
        status: "ready",
        digest,
        reportMarkdown: markdown,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "週次レポートの生成に失敗しました。";
      console.error("Failed to generate weekly digest", error);
      setState({ status: "error", message });
      await showToast({
        style: Toast.Style.Failure,
        title: "週次レポートを生成できませんでした",
        message,
      });
    }
  }, [client]);

  useEffect(() => {
    void loadDigest();
  }, [loadDigest]);

  if (state.status === "idle" || state.status === "loading") {
    const message = state.message ?? "準備中…";
    return <Detail isLoading markdown={`# Weekly Digest\n\n${message}`} />;
  }

  if (state.status === "error") {
    return (
      <Detail
        markdown={`# Weekly Digest\n\n🚨 **エラー**\n\n${state.message}`}
        actions={
          <ActionPanel>
            <Action title="再試行" icon={Icon.ArrowClockwise} onAction={() => void loadDigest()} />
          </ActionPanel>
        }
      />
    );
  }

  const { digest, reportMarkdown } = state;

  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Label title="期間" text={`${formatDate(digest.currentPeriod.start)} 〜 ${formatDate(digest.currentPeriod.end)}`} />
      <Detail.Metadata.Label title="総メッセージ数" text={digest.currentStats.totalMessages.toString()} />
      <Detail.Metadata.Label title="先週との差分" text={formatDelta(digest.comparison.messageDelta, digest.comparison.messageDeltaPercentage)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="上位コンタクト" text={formatTopContacts(digest.currentStats)} />
      <Detail.Metadata.Label title="アクティブチャンネル" text={formatTopChannels(digest.currentStats)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="フォローアップ件数" text={digest.followUps.length.toString()} />
    </Detail.Metadata>
  );

  return (
    <Detail
      markdown={reportMarkdown}
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action title="再生成" icon={Icon.ArrowClockwise} onAction={() => void loadDigest()} />
          <Action.CopyToClipboard title="レポートをコピー" content={reportMarkdown} />
          <Action
            title="統計情報をコピー"
            icon={Icon.Clipboard}
            onAction={() => {
              const summary = buildStatsSummary(digest);
              void Clipboard.copy(summary);
              void showToast({
                style: Toast.Style.Success,
                title: "統計情報をコピーしました",
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function buildWeeklyDigest(period: WeeklyDigestPeriod, messages: ConversationMessage[]): WeeklyDigest {
  const currentPeriod: WeeklyDigestPeriod = {
    start: subtractDays(period.end, 6),
    end: period.end,
  };
  const previousPeriod: WeeklyDigestPeriod = {
    start: subtractDays(currentPeriod.start, 7),
    end: subtractDays(currentPeriod.start, 1),
  };

  const currentMessages = messages.filter((message) => isWithinPeriod(message.timestamp, currentPeriod));
  const previousMessages = messages.filter((message) => isWithinPeriod(message.timestamp, previousPeriod));

  const currentStats = computeStats(currentMessages);
  const previousStats = computeStats(previousMessages);
  const comparison = computeComparison(currentStats, previousStats);
  const followUps = detectFollowUps(currentMessages);

  return {
    currentPeriod,
    previousPeriod,
    currentStats,
    previousStats,
    comparison,
    followUps,
    highlights: [],
    lowlights: [],
  };
}

function computeStats(messages: ConversationMessage[]): WeeklyDigestStats {
  const contactsMap = new Map<string, { name: string; platform?: string; count: number }>();
  const channelsMap = new Map<string, { name: string; platform?: string; count: number }>();
  const dailyMap = new Map<string, number>();

  let eveningCount = 0;
  let weekendCount = 0;

  for (const message of messages) {
    // contacts
    const contactKey = `${message.senderId}:${message.platform ?? ""}`;
    if (!contactsMap.has(contactKey)) {
      contactsMap.set(contactKey, {
        name: message.senderName,
        platform: message.platform,
        count: 0,
      });
    }
    contactsMap.get(contactKey)!.count += 1;

    // channels
    if (!channelsMap.has(message.chatId)) {
      channelsMap.set(message.chatId, {
        name: message.chatName,
        platform: message.platform,
        count: 0,
      });
    }
    channelsMap.get(message.chatId)!.count += 1;

    // daily
    const dateKey = message.timestamp.toISOString().slice(0, 10);
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + 1);

    // time-of-day
    const hour = message.timestamp.getHours();
    const weekday = message.timestamp.getDay(); // 0 = Sunday
    if (hour >= 18) {
      eveningCount += 1;
    }
    if (weekday === 0 || weekday === 6) {
      weekendCount += 1;
    }
  }

  const contacts = Array.from(contactsMap.entries())
    .map(([key, data]) => ({
      contactId: key,
      contactName: data.name,
      platform: data.platform,
      messageCount: data.count,
    }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5);

  const channels = Array.from(channelsMap.entries())
    .map(([chatId, data]) => ({
      chatId,
      chatName: data.name,
      platform: data.platform,
      messageCount: data.count,
    }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5);

  const daily = Array.from(dailyMap.entries())
    .map(([date, count]) => ({
      date,
      messageCount: count,
      weekday: weekdayLabel(new Date(date)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const busiestDay = daily.reduce((max, current) => {
    if (!max || current.messageCount > max.messageCount) {
      return current;
    }
    return max;
  }, undefined as typeof daily[number] | undefined);

  return {
    totalMessages: messages.length,
    contacts,
    channels,
    daily,
    busiestDay,
    timeOfDay: {
      eveningCount,
      weekendCount,
    },
  };
}

function computeComparison(current: WeeklyDigestStats, previous: WeeklyDigestStats): WeeklyDigestComparison {
  const messageDelta = current.totalMessages - previous.totalMessages;
  const base = previous.totalMessages === 0 ? 1 : previous.totalMessages;
  const percentage = ((messageDelta / base) * 100) | 0;

  const eveningDelta = current.timeOfDay.eveningCount - previous.timeOfDay.eveningCount;
  const weekendDelta = current.timeOfDay.weekendCount - previous.timeOfDay.weekendCount;

  return {
    messageDelta,
    messageDeltaPercentage: percentage,
    eveningDelta,
    weekendDelta,
  };
}

function detectFollowUps(messages: ConversationMessage[]) {
  const followUps = [];
  const now = new Date();
  for (const message of messages) {
    if (message.isFromSelf) {
      continue;
    }
    const ageDays = (now.getTime() - message.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays >= 3 && message.isUnread) {
      followUps.push({
        chatId: message.chatId,
        chatName: message.chatName,
        senderName: message.senderName,
        lastMessageAt: message.timestamp,
        messagePreview: message.text ?? "(本文なし)",
      });
    }
  }
  return followUps.slice(0, 10);
}

function buildReportPrompt(digest: WeeklyDigest, messages: ConversationMessage[]) {
  const sampleMessages = messages
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 40)
    .map((message) => ({
      chat: message.chatName,
      sender: message.senderName,
      text: message.text,
      timestamp: message.timestamp.toISOString(),
    }));

  const payload = {
    period: {
      start: digest.currentPeriod.start.toISOString(),
      end: digest.currentPeriod.end.toISOString(),
      previousStart: digest.previousPeriod.start.toISOString(),
      previousEnd: digest.previousPeriod.end.toISOString(),
    },
    stats: digest.currentStats,
    previousStats: digest.previousStats,
    comparison: digest.comparison,
    followUps: digest.followUps,
    sampleMessages,
  };

  return [
    "You are generating a weekly digest report for Beeper conversations.",
    "Use the provided stats to produce a concise but actionable report in Japanese.",
    "Structure suggestions:",
    "- 概要（総メッセージ数、先週との差分）",
    "- ハイライト（トピックや成果）",
    "- 課題・フォローアップ",
    "- コミュニケーションの傾向（時間帯、週末など）",
    "Return the report as Markdown. Keep it under ~400 Japanese characters per section if possible.",
    "Data:",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

function buildStatsSummary(digest: WeeklyDigest) {
  const lines: string[] = [];
  lines.push("Weekly Digest Summary");
  lines.push(`期間: ${formatDate(digest.currentPeriod.start)} 〜 ${formatDate(digest.currentPeriod.end)}`);
  lines.push(`総メッセージ数: ${digest.currentStats.totalMessages}`);
  lines.push(`先週との差分: ${digest.comparison.messageDelta} (${digest.comparison.messageDeltaPercentage}%)`);
  lines.push("");
  lines.push("上位コンタクト:");
  for (const contact of digest.currentStats.contacts) {
    lines.push(`- ${contact.contactName}: ${contact.messageCount}`);
  }
  lines.push("");
  lines.push("アクティブチャンネル:");
  for (const channel of digest.currentStats.channels) {
    lines.push(`- ${channel.chatName}: ${channel.messageCount}`);
  }
  return lines.join("\n");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(date);
}

function formatDelta(delta: number, percentage: number) {
  const sign = delta > 0 ? "+" : "";
  const pctSign = percentage > 0 ? "+" : "";
  return `${sign}${delta} (${pctSign}${percentage}%)`;
}

function formatTopContacts(stats: WeeklyDigestStats) {
  if (stats.contacts.length === 0) {
    return "該当なし";
  }
  return stats.contacts.map((contact) => `${contact.contactName} (${contact.messageCount})`).join(", ");
}

function formatTopChannels(stats: WeeklyDigestStats) {
  if (stats.channels.length === 0) {
    return "該当なし";
  }
  return stats.channels.map((channel) => `${channel.chatName} (${channel.messageCount})`).join(", ");
}

function subtractDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

function isWithinPeriod(timestamp: Date, period: WeeklyDigestPeriod) {
  return timestamp >= period.start && timestamp <= period.end;
}

function weekdayLabel(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date);
}
