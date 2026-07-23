export interface BrandChannel {
  id: string;
  name: string;
  subscribers: string;
  totalViews: string;
  avatar: string;
  watchTimeHours: string;
  avgViewDuration: string;
  revenue: string;
  videosCount: number;
}

export interface VideoStats {
  costUSD: string;
  aiTokensUsed: number;
  ttsCharsUsed: number;
  processingTimeSec: number;
  storageGB: string;
  narrationModel: string;
  captionModel: string;
}

export interface Video {
  id: string;
  title: string;
  brandChannelId: string;
  status: 'uploaded' | 'upcoming' | 'processing';
  views: string;
  uploadDate: string;
  thumbnail: string;
  sourceUrl: string;
  sourceType: 'reddit' | 'youtube';
  likes?: string;
  comments?: string;
  duration?: string;
  stats: VideoStats;
}

export const demoBrandChannels: BrandChannel[] = [
  {
    id: '1',
    name: 'Tech Reviews Daily',
    subscribers: '1.2M',
    totalViews: '50M',
    avatar: 'https://i.pravatar.cc/150?img=1',
    watchTimeHours: '3.2M hrs',
    avgViewDuration: '4m 12s',
    revenue: '$3,840',
    videosCount: 2,
  },
  {
    id: '2',
    name: 'Gaming Hub',
    subscribers: '850K',
    totalViews: '35M',
    avatar: 'https://i.pravatar.cc/150?img=2',
    watchTimeHours: '2.1M hrs',
    avgViewDuration: '5m 38s',
    revenue: '$2,210',
    videosCount: 1,
  },
  {
    id: '3',
    name: 'Life Hacks Pro',
    subscribers: '500K',
    totalViews: '20M',
    avatar: 'https://i.pravatar.cc/150?img=3',
    watchTimeHours: '1.4M hrs',
    avgViewDuration: '3m 55s',
    revenue: '$1,560',
    videosCount: 1,
  },
];

export const demoVideos: Video[] = [
  {
    id: '1',
    title: 'Top 10 Tech Gadgets of 2026',
    brandChannelId: '1',
    status: 'uploaded',
    views: '250K',
    likes: '18.4K',
    comments: '1.2K',
    duration: '8:42',
    uploadDate: '2026-07-20',
    thumbnail: 'https://picsum.photos/id/96/400/225',
    sourceUrl: 'https://www.reddit.com/r/tech/comments/abc123',
    sourceType: 'reddit',
    stats: {
      costUSD: '$0.38',
      aiTokensUsed: 24800,
      ttsCharsUsed: 3200,
      processingTimeSec: 142,
      storageGB: '0.84',
      narrationModel: 'deepseek/deepseek-v4-pro',
      captionModel: 'whisper-large-v3',
    },
  },
  {
    id: '2',
    title: 'Epic Gaming Moments Compilation',
    brandChannelId: '2',
    status: 'uploaded',
    views: '180K',
    likes: '12.1K',
    comments: '874',
    duration: '11:05',
    uploadDate: '2026-07-18',
    thumbnail: 'https://picsum.photos/id/160/400/225',
    sourceUrl: 'https://www.reddit.com/r/gaming/comments/xyz789',
    sourceType: 'reddit',
    stats: {
      costUSD: '$0.52',
      aiTokensUsed: 31400,
      ttsCharsUsed: 4100,
      processingTimeSec: 198,
      storageGB: '1.22',
      narrationModel: 'deepseek/deepseek-v4-pro',
      captionModel: 'whisper-large-v3',
    },
  },
  {
    id: '3',
    title: 'Smart Home Setup You Need',
    brandChannelId: '1',
    status: 'upcoming',
    views: '-',
    duration: '7:18',
    uploadDate: '2026-07-25',
    thumbnail: 'https://picsum.photos/id/180/400/225',
    sourceUrl: 'https://youtube.com/watch?v=smarthome2026',
    sourceType: 'youtube',
    stats: {
      costUSD: '$0.29',
      aiTokensUsed: 18900,
      ttsCharsUsed: 2750,
      processingTimeSec: 110,
      storageGB: '0.65',
      narrationModel: 'deepseek/deepseek-v4-pro',
      captionModel: 'whisper-large-v3',
    },
  },
  {
    id: '4',
    title: '5 Life Hacks for Productivity',
    brandChannelId: '3',
    status: 'processing',
    views: '-',
    duration: '6:55',
    uploadDate: '2026-07-23',
    thumbnail: 'https://picsum.photos/id/119/400/225',
    sourceUrl: 'https://www.reddit.com/r/productivity/comments/lhacks',
    sourceType: 'reddit',
    stats: {
      costUSD: '$0.21',
      aiTokensUsed: 14200,
      ttsCharsUsed: 2100,
      processingTimeSec: 88,
      storageGB: '0.51',
      narrationModel: 'deepseek/deepseek-v4-pro',
      captionModel: 'whisper-large-v3',
    },
  },
];

export const demoUser = {
  name: 'Praneeth Kumar',
  email: 'praneeth@example.com',
  avatar: 'https://i.pravatar.cc/150?img=12',
};
