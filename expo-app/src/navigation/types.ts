// App (authenticated) stack
export type RootStackParamList = {
  Dashboard: undefined;
  ChannelDashboard: { channelId: string };
  VideoDetail: { videoId: string };
};
