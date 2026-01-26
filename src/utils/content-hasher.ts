import crypto from 'crypto';

class ContentHasher {
  public hashContent(content: unknown): string | null {
    if (!content) {
      return null;
    }

    const normalized = this._normalizeContent(content);
    const contentString = JSON.stringify(normalized);

    return crypto
      .createHash('sha256')
      .update(contentString)
      .digest('hex');
  }

  public normalizeContent(content: unknown): unknown {
    return this._normalizeContent(content);
  }

  private _normalizeContent(content: unknown): unknown {
    if (typeof content !== 'object' || content === null) {
      return content;
    }

    if (Array.isArray(content)) {
      return content.map((item) => this._normalizeContent(item));
    }

    const normalized: Record<string, unknown> = {};
    const keys = Object.keys(content).sort();

    keys.forEach((key) => {
      if (key !== 'metadata' && key !== 'timestamp' && key !== 'timetoken') {
        normalized[key] = this._normalizeContent((content as Record<string, unknown>)[key]);
      }
    });

    return normalized;
  }
}

export default ContentHasher;
