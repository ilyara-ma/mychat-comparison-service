export type PubnubMessage = {
  timetoken: string;
  [key: string]: unknown;
};

export type ChatMessage = {
  message?: {
    id?: string;
    [key: string]: unknown;
  };
  actions?: unknown;
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
