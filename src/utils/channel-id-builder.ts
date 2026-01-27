class ChannelIdBuilder {
  private channelPrefixes: string[];

  constructor(channelPrefixes?: string[]) {
    this.channelPrefixes = channelPrefixes && channelPrefixes.length > 0
      ? channelPrefixes
      : ['team_'];
  }

  public buildChannelIds(teamId: string): string[] {
    return this.channelPrefixes.map((prefix) => `${prefix}${teamId}`);
  }

  public extractTeamId(channelId: string): string {
    for (const prefix of this.channelPrefixes) {
      if (channelId.startsWith(prefix)) {
        return channelId.substring(prefix.length);
      }
    }
    return channelId;
  }
}

export default ChannelIdBuilder;
