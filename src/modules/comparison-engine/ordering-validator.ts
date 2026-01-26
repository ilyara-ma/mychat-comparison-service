import { ILogger } from '../../types';
import { MessagePair, OrderingViolation } from './types';

class OrderingValidator {
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  public validate(matchedPairs: MessagePair[]): OrderingViolation[] {
    if (!matchedPairs || matchedPairs.length <= 1) {
      return [];
    }

    const violations: OrderingViolation[] = [];

    for (let i = 1; i < matchedPairs.length; i++) {
      const prevPair = matchedPairs[i - 1];
      const currPair = matchedPairs[i];

      const prevPubnubTimetoken = this._extractTimetoken(prevPair.pubnubMsg);
      const currPubnubTimetoken = this._extractTimetoken(currPair.pubnubMsg);

      const prevChatOffset = this._extractOffset(prevPair.chatMsg);
      const currChatOffset = this._extractOffset(currPair.chatMsg);

      if (prevPubnubTimetoken && currPubnubTimetoken && prevChatOffset !== null && currChatOffset !== null) {
        const pubnubOrder = this._compareValues(prevPubnubTimetoken, currPubnubTimetoken);
        const chatOrder = this._compareValues(prevChatOffset, currChatOffset);

        if (pubnubOrder !== chatOrder && pubnubOrder !== 0 && chatOrder !== 0) {
          violations.push({
            index: i,
            prevPubnubTimetoken,
            currPubnubTimetoken,
            prevChatOffset,
            currChatOffset,
            pubnubOrder,
            chatOrder,
          });
        }
      }
    }

    return violations;
  }

  private _extractTimetoken(pubnubMsg: unknown): string | null {
    if (!pubnubMsg) {
      return null;
    }
    return (pubnubMsg as Record<string, unknown>).timetoken as string || null;
  }

  private _extractOffset(chatMsg: unknown): number | null {
    if (!chatMsg) {
      return null;
    }
    const msg = chatMsg as Record<string, unknown>;
    return ((msg.message as Record<string, unknown>)?.offset as number) ?? (msg.offset as number) ?? null;
  }

  private _compareValues(val1: string | number, val2: string | number): number {
    const num1 = typeof val1 === 'string' ? BigInt(val1) : BigInt(val1);
    const num2 = typeof val2 === 'string' ? BigInt(val2) : BigInt(val2);

    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
    return 0;
  }
}

export default OrderingValidator;
