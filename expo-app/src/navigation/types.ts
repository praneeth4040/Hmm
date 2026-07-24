// App (authenticated) stack
export type RootStackParamList = {
  Dashboard: undefined;
  ChannelDashboard: { channelId: string };
  /** videoId is the YouTube video ID; channelId is provided when navigating from ChannelDashboard */
  VideoDetail: { videoId: string; channelId?: string };
  PersonaEditor: { accountId: string };
};
