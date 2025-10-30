export type DirectMessage = {
  id: string;
  platform: string;
  conversationId: string;
  sender: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
};

export type ConversationMessage = {
  id: string;
  chatId: string;
  chatName: string;
  platform?: string;
  senderId: string;
  senderName: string;
  text?: string;
  attachments?: {
    type: string;
    name?: string;
    url?: string;
  }[];
  timestamp: Date;
  isFromSelf: boolean;
  isUnread: boolean;
};

export type WeeklyDigestPeriod = {
  start: Date;
  end: Date;
};

export type ContactStats = {
  contactId: string;
  contactName: string;
  platform?: string;
  messageCount: number;
};

export type ChannelStats = {
  chatId: string;
  chatName: string;
  platform?: string;
  messageCount: number;
};

export type DailyStats = {
  date: string;
  messageCount: number;
  weekday: string;
};

export type TimeOfDayStats = {
  eveningCount: number;
  weekendCount: number;
};

export type WeeklyDigestStats = {
  totalMessages: number;
  contacts: ContactStats[];
  channels: ChannelStats[];
  daily: DailyStats[];
  busiestDay?: DailyStats;
  timeOfDay: TimeOfDayStats;
};

export type WeeklyDigestComparison = {
  messageDelta: number;
  messageDeltaPercentage: number;
  eveningDelta: number;
  weekendDelta: number;
};

export type FollowUpItem = {
  chatId: string;
  chatName: string;
  senderName: string;
  lastMessageAt: Date;
  messagePreview: string;
};

export type WeeklyDigest = {
  currentPeriod: WeeklyDigestPeriod;
  previousPeriod: WeeklyDigestPeriod;
  currentStats: WeeklyDigestStats;
  previousStats: WeeklyDigestStats;
  comparison: WeeklyDigestComparison;
  followUps: FollowUpItem[];
  highlights: string[];
  lowlights: string[];
};

export type WeeklyDigestReport = {
  period: WeeklyDigestPeriod;
  generatedAt: Date;
  markdown: string;
  summary: string;
  stats: WeeklyDigestStats;
  comparison: WeeklyDigestComparison;
  followUps: FollowUpItem[];
};
