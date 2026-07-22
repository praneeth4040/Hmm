export interface BrandChannel {
  id: string;
  name: string;
  subscribers: string;
  totalViews: string;
  avatar: string;
}

export interface Video {
  id: string;
  title: string;
  brandChannelId: string;
  status: 'uploaded' | 'upcoming' | 'processing';
  views: string;
  uploadDate: string;
  thumbnail: string;
}

export const demoBrandChannels: BrandChannel[] = [
  {
    id: '1',
    name: 'Tech Reviews Daily',
    subscribers: '1.2M',
    totalViews: '50M',
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  {
    id: '2',
    name: 'Gaming Hub',
    subscribers: '850K',
    totalViews: '35M',
    avatar: 'https://i.pravatar.cc/150?img=2',
  },
  {
    id: '3',
    name: 'Life Hacks Pro',
    subscribers: '500K',
    totalViews: '20M',
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
];

export const demoVideos: Video[] = [
  {
    id: '1',
    title: 'Top 10 Tech Gadgets of 2026',
    brandChannelId: '1',
    status: 'uploaded',
    views: '250K',
    uploadDate: '2026-07-20',
    thumbnail: 'https://picsum.photos/id/96/400/225',
  },
  {
    id: '2',
    title: 'Epic Gaming Moments Compilation',
    brandChannelId: '2',
    status: 'uploaded',
    views: '180K',
    uploadDate: '2026-07-18',
    thumbnail: 'https://picsum.photos/id/160/400/225',
  },
  {
    id: '3',
    title: 'Smart Home Setup You Need',
    brandChannelId: '1',
    status: 'upcoming',
    views: '-',
    uploadDate: '2026-07-25',
    thumbnail: 'https://picsum.photos/id/180/400/225',
  },
  {
    id: '4',
    title: '5 Life Hacks for Productivity',
    brandChannelId: '3',
    status: 'processing',
    views: '-',
    uploadDate: '2026-07-23',
    thumbnail: 'https://picsum.photos/id/119/400/225',
  },
];

export const demoUser = {
  name: 'Praneeth Kumar',
  email: 'praneeth@example.com',
  avatar: 'https://i.pravatar.cc/150?img=12',
};
