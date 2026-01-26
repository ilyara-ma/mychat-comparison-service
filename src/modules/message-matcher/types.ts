export type PubnubMessage = {
  timetoken: string;
  [key: string]: unknown;
};

export type ChatMessage = {
  id?: string;
  message?: {
    id?: string;
    content?: {
      metadata?: {
        messageId?: string;
        pubnubTimetoken?: string;
      };
      messageId?: string;
      pubnubTimetoken?: string;
      [key: string]: unknown;
    };
  };
  content?: {
    metadata?: {
      messageId?: string;
      pubnubTimetoken?: string;
    };
    messageId?: string;
    pubnubTimetoken?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type MessagePair = {
  pubnubMsg: PubnubMessage;
  chatMsg: ChatMessage;
};

export type MatchResult = {
  matched: MessagePair[];
  pubnubOnly: PubnubMessage[];
  chatServiceOnly: ChatMessage[];
};

export type FuzzyMatcherChatMessage = {
  id?: string;
  message?: {
    id?: string;
    content?: unknown;
    createdAt?: number;
  };
  content?: unknown;
  createdAt?: number;
};

export type FuzzyMatcherPubnubMessage = {
  timetoken?: string;
  message?: unknown;
  [key: string]: unknown;
};
