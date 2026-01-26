import { ILogger } from '../../types';
import ContentHasher from '../../utils/content-hasher';
import { FuzzyMatcherChatMessage, FuzzyMatcherPubnubMessage } from './types';

class FuzzyMatcher {
  private logger: ILogger;

  private contentHasher: ContentHasher;

  private timeToleranceMs: number;

  constructor(logger: ILogger) {
    this.logger = logger;
    this.contentHasher = new ContentHasher();
    this.timeToleranceMs = 5000;
  }

  public findMatch(
    chatMsg: FuzzyMatcherChatMessage,
    pubnubMessages: FuzzyMatcherPubnubMessage[],
  ): FuzzyMatcherPubnubMessage | null {
    if (!chatMsg || !pubnubMessages || pubnubMessages.length === 0) {
      return null;
    }

    const chatContent = chatMsg.message?.content || chatMsg.content;
    const chatTime = chatMsg.message?.createdAt || chatMsg.createdAt;
    const chatHash = this.contentHasher.hashContent(chatContent);

    if (!chatHash || !chatTime) {
      return null;
    }

    for (const pubnubMsg of pubnubMessages) {
      const pubnubContent = pubnubMsg.message || pubnubMsg;
      const pubnubHash = this.contentHasher.hashContent(pubnubContent);

      const pubnubTime = pubnubMsg.timetoken
        ? parseInt(pubnubMsg.timetoken, 10) / 10000
        : null;

      if (pubnubHash && pubnubTime) {
        const hashMatches = chatHash === pubnubHash;
        const timeMatches = Math.abs(chatTime - pubnubTime) < this.timeToleranceMs;

        if (hashMatches && timeMatches) {
          this.logger.debug('Fuzzy match found', {
            chatMsgId: chatMsg.message?.id || chatMsg.id,
            pubnubTimetoken: pubnubMsg.timetoken,
            timeDiff: Math.abs(chatTime - pubnubTime),
          });
          return pubnubMsg;
        }
      }
    }

    return null;
  }
}

export default FuzzyMatcher;
