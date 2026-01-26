type PubnubMessage = {
  timetoken?: string;
  message?: unknown;
  actions?: Record<string, unknown>;
  [key: string]: unknown;
};

type ChatServiceMessage = {
  id?: string;
  message?: {
    id?: string;
    content?: unknown;
    actions?: Record<string, unknown>;
    offset?: number;
    createdAt?: string;
  };
  content?: unknown;
  actions?: Record<string, unknown>;
  offset?: number;
  createdAt?: string;
  [key: string]: unknown;
};

type NormalizedPubnubMessage = {
  timetoken?: string;
  content: unknown;
  actions: Record<string, unknown>;
};

type NormalizedChatServiceMessage = {
  messageId?: string;
  content: unknown;
  actions: Record<string, unknown>;
  offset?: number;
  createdAt?: string;
};

class MessageNormalizer {
  public normalizePubnubMessage(
    pubnubMsg: PubnubMessage | null | undefined,
  ): NormalizedPubnubMessage | null {
    if (!pubnubMsg) {
      return null;
    }

    return {
      timetoken: pubnubMsg.timetoken,
      content: pubnubMsg.message || pubnubMsg,
      actions: pubnubMsg.actions || {},
    };
  }

  public normalizeChatServiceMessage(
    chatMsg: ChatServiceMessage | null | undefined,
  ): NormalizedChatServiceMessage | null {
    if (!chatMsg) {
      return null;
    }

    return {
      messageId: chatMsg.message?.id || chatMsg.id,
      content: chatMsg.message?.content || chatMsg.content || chatMsg.message,
      actions: chatMsg.message?.actions || chatMsg.actions || {},
      offset: chatMsg.message?.offset || chatMsg.offset,
      createdAt: chatMsg.message?.createdAt || chatMsg.createdAt,
    };
  }

  public extractMessageContent(message: unknown, source: 'pubnub' | 'chatService' = 'pubnub'): unknown {
    if (!message) {
      return null;
    }

    if (source === 'pubnub') {
      return (message as PubnubMessage).message || (message as Record<string, unknown>).content || message;
    }

    if (source === 'chatService') {
      return (message as ChatServiceMessage).content
        || (message as ChatServiceMessage).message?.content
        || message;
    }

    return message;
  }

  public areContentsEqual(content1: unknown, content2: unknown): boolean {
    if (content1 === content2) {
      return true;
    }

    if (typeof content1 !== typeof content2) {
      return false;
    }

    if (typeof content1 === 'object' && content1 !== null && content2 !== null) {
      return JSON.stringify(this._sortKeys(content1)) === JSON.stringify(this._sortKeys(content2));
    }

    return false;
  }

  public sortKeys(obj: unknown): unknown {
    return this._sortKeys(obj);
  }

  private _sortKeys(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this._sortKeys(item));
    }

    const sorted: Record<string, unknown> = {};
    Object.keys(obj).sort().forEach((key) => {
      sorted[key] = this._sortKeys((obj as Record<string, unknown>)[key]);
    });

    return sorted;
  }
}

export default MessageNormalizer;
