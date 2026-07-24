import { VideoSource } from '../hooks/useVideos';

// App (authenticated) stack
export type RootStackParamList = {
  Dashboard: undefined;
  ChannelDashboard: { channelId: string };
  /** videoId is the YouTube video ID; channelId is provided when navigating from ChannelDashboard */
  VideoDetail: { videoId: string; channelId?: string };
  PersonaEditor: { accountId: string };
  /** Full video editor — receives the prepared session from the download step */
  VideoEditor: {
    sessionId: string;
    title: string;
    author: string;
    source: VideoSource;
  };
};
