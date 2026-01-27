class MessageNormalizer {
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
