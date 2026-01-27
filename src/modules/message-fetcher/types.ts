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
