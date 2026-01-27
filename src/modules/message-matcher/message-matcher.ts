import { IAlerts, ILogger, ModuleParams } from '../../types';
import FuzzyMatcher from './fuzzy-matcher';
import {
  ChatMessage, MatchResult, PubnubMessage,
} from './types';

class MessageMatcher {
  private logger: ILogger;

  private alerts: IAlerts;

  private fuzzyMatcher: FuzzyMatcher;

  constructor(params: ModuleParams) {
    const { services } = params;
    this.logger = services.loggerManager.getLogger('message-matcher');
    this.alerts = services.alerts;
    this.fuzzyMatcher = new FuzzyMatcher(this.logger);
  }

  public matchMessages(pubnubMessages: PubnubMessage[], chatServiceMessages: ChatMessage[]): MatchResult {
    const matched: Array<{ pubnubMsg: PubnubMessage; chatMsg: ChatMessage }> = [];
    const chatServiceOnly: ChatMessage[] = [];
    const matchedPubnubTimetokens = new Set<string>();

    this.logger.info('Matching messages', {
      pubnubCount: pubnubMessages.length,
      chatServiceCount: chatServiceMessages.length,
    });

    for (const chatMsg of chatServiceMessages) {
      const messageId = this._extractMessageIdFromChatMessage(chatMsg);
      let wasMatched = false;

      if (messageId) {
        const pubnubMsg = pubnubMessages.find((p) => p.timetoken === messageId);

        if (pubnubMsg) {
          matched.push({ pubnubMsg, chatMsg });
          matchedPubnubTimetokens.add(pubnubMsg.timetoken);
          wasMatched = true;
        }
      }

      if (!wasMatched) {
        const unmatchedPubnubMessages = pubnubMessages.filter(
          (p) => !matchedPubnubTimetokens.has(p.timetoken),
        );
        const fuzzyMatch = this.fuzzyMatcher!.findMatch(chatMsg, unmatchedPubnubMessages);

        if (fuzzyMatch && fuzzyMatch.timetoken) {
          matched.push({ pubnubMsg: fuzzyMatch as PubnubMessage, chatMsg });
          matchedPubnubTimetokens.add(fuzzyMatch.timetoken);
          this.alerts.counter('chat_comparison.fuzzy_matches', {});
        } else {
          chatServiceOnly.push(chatMsg);
        }
      }
    }

    const pubnubOnly = pubnubMessages.filter(
      (p) => !matchedPubnubTimetokens.has(p.timetoken),
    );

    this.logger.info('Message matching completed', {
      matchedCount: matched.length,
      pubnubOnlyCount: pubnubOnly.length,
      chatServiceOnlyCount: chatServiceOnly.length,
    });

    return { matched, pubnubOnly, chatServiceOnly };
  }

  private _extractMessageIdFromChatMessage(chatMsg: ChatMessage): string | null {
    return chatMsg.message?.id || chatMsg.id || null;
  }
}

export default MessageMatcher;
