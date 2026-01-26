export type BatchResult<T> = {
  successful: T[];
  failed: Array<{
    item: unknown;
    error: unknown;
  }>;
};

export interface IDualRealtimeCommunicator {
  fetchMessagesFromBothSystems: (
    channel: string,
    options: Record<string, unknown>
  ) => Promise<{
    pubnubMessages: unknown[];
    chatServiceMessages: unknown[];
    pubnubSuccess: boolean;
    chatServiceSuccess: boolean;
  }>;
}
