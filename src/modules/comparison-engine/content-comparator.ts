import { ILogger } from '../../types';
import MessageNormalizer from '../../utils/message-normalizer';
import { ContentComparisonResult, ContentDifference } from './types';

class ContentComparator {
  private logger: ILogger;

  private messageNormalizer: MessageNormalizer;

  constructor(logger: ILogger) {
    this.logger = logger;
    this.messageNormalizer = new MessageNormalizer();
  }

  public areEqual(pubnubMsg: unknown, chatServiceMsg: unknown): boolean {
    const pubnubContent = this._extractContent(pubnubMsg, 'pubnub');
    const chatContent = this._extractContent(chatServiceMsg, 'chatService');

    if (!pubnubContent && !chatContent) {
      return true;
    }

    if (!pubnubContent || !chatContent) {
      return false;
    }

    return this.messageNormalizer.areContentsEqual(pubnubContent, chatContent);
  }

  public compareContent(pubnubMsg: unknown, chatServiceMsg: unknown): ContentComparisonResult {
    const isEqual = this.areEqual(pubnubMsg, chatServiceMsg);

    if (!isEqual) {
      const pubnubContent = this._extractContent(pubnubMsg, 'pubnub');
      const chatContent = this._extractContent(chatServiceMsg, 'chatService');

      return {
        equal: false,
        pubnubContent,
        chatContent,
        differences: this._findDifferences(pubnubContent, chatContent),
      };
    }

    return { equal: true };
  }

  public findDifferences(obj1: unknown, obj2: unknown, path = ''): ContentDifference[] {
    return this._findDifferences(obj1, obj2, path);
  }

  private _extractContent(message: unknown, source: 'pubnub' | 'chatService'): unknown {
    if (!message) {
      return null;
    }

    if (source === 'pubnub') {
      const msg = message as Record<string, unknown>;
      return msg.message || msg.content || message;
    }

    if (source === 'chatService') {
      const msg = message as Record<string, unknown>;
      const content = (msg.message as Record<string, unknown>)?.content || msg.content;
      if (content && typeof content === 'object' && content !== null && 'metadata' in content) {
        const contentObj = content as Record<string, unknown>;
        const contentWithoutMetadata: Record<string, unknown> = {};
        Object.keys(contentObj).forEach((key) => {
          if (key !== 'metadata') {
            contentWithoutMetadata[key] = contentObj[key];
          }
        });
        return contentWithoutMetadata;
      }
      return content;
    }

    return message;
  }

  private _findDifferences(obj1: unknown, obj2: unknown, path = ''): ContentDifference[] {
    const differences: ContentDifference[] = [];

    if (typeof obj1 !== typeof obj2) {
      differences.push({
        path,
        type: 'type_mismatch',
        pubnub: typeof obj1,
        chatService: typeof obj2,
      });
      return differences;
    }

    if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
      if (obj1 !== obj2) {
        differences.push({
          path,
          type: 'value_mismatch',
          pubnub: obj1,
          chatService: obj2,
        });
      }
      return differences;
    }

    const keys1 = Object.keys(obj1 || {});
    const keys2 = Object.keys(obj2 || {});
    const allKeys = new Set([...keys1, ...keys2]);

    allKeys.forEach((key) => {
      const newPath = path ? `${path}.${key}` : key;
      const o1 = obj1 as Record<string, unknown>;
      const o2 = obj2 as Record<string, unknown>;

      if (!(key in o1)) {
        differences.push({
          path: newPath,
          type: 'missing_in_pubnub',
          chatService: o2[key],
        });
      } else if (!(key in o2)) {
        differences.push({
          path: newPath,
          type: 'missing_in_chatservice',
          pubnub: o1[key],
        });
      } else {
        differences.push(...this._findDifferences(o1[key], o2[key], newPath));
      }
    });

    return differences;
  }
}

export default ContentComparator;
