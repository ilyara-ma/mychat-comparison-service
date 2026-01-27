import {
  ChatMessage, MatchResult, PubnubMessage,
} from './types';

class MessageMatcher {
  public matchMessages(pubnubMessages: PubnubMessage[], chatServiceMessages: ChatMessage[]): MatchResult {
    const matched: Array<{ pubnubMsg: PubnubMessage; chatMsg: ChatMessage }> = [];
    const chatServiceOnly: ChatMessage[] = [];
    const matchedPubnubTimetokens = new Set<string>();

    for (const chatMsg of chatServiceMessages) {
      const messageId = this._extractMessageIdFromChatMessage(chatMsg);

      if (messageId) {
        const pubnubMsg = pubnubMessages.find((p) => p.timetoken === messageId);

        if (pubnubMsg) {
          matched.push({ pubnubMsg, chatMsg });
          matchedPubnubTimetokens.add(pubnubMsg.timetoken);
        } else {
          chatServiceOnly.push(chatMsg);
        }
      } else {
        chatServiceOnly.push(chatMsg);
      }
    }

    const pubnubOnly = pubnubMessages.filter(
      (p) => !matchedPubnubTimetokens.has(p.timetoken),
    );

    return { matched, pubnubOnly, chatServiceOnly };
  }

  private _extractMessageIdFromChatMessage(chatMsg: ChatMessage): string | null {
    return chatMsg.message?.id || chatMsg.id || null;
  }
}

export default MessageMatcher;
