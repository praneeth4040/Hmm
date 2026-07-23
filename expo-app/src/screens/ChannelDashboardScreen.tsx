import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Theme } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';
import { useYouTubeChannels, YouTubeChannel } from '../hooks/useYouTubeChannels';
import { useChannelVideos, ChannelVideo, parseDuration } from '../hooks/useChannelVideos';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Play,
  Eye,
  ChevronRight,
  ThumbsUp,
  MessageSquare,
  CalendarClock,
  AlertCircle,
} from 'lucide-react-native';

type Route = RouteProp<RootStackParamList, 'ChannelDashboard'>;
type Nav   = NativeStackNavigationProp<RootStackParamList, 'ChannelDashboard'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCount(n?: string): string {
  if (!n) return '—';
  const num = parseInt(n, 10);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={[tile.wrap, { borderTopColor: accent }]}>
      <View style={[tile.iconWrap, { backgroundColor: accent + '18' }]}>{icon}</View>
      <Text style={tile.value}>{value}</Text>
      <Text style={tile.label}>{label}</Text>
    </View>
  );
}

const tile = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    gap: 6,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  value: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
  label: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
});

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({ video, onPress }: { video: ChannelVideo; onPress: () => void }) {
  const duration = parseDuration(video.duration);
  const thumb = video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;

  return (
    <TouchableOpacity style={vc.card} onPress={onPress} activeOpacity={0.8}>
      <View style={vc.thumbWrap}>
        <Image source={{ uri: thumb }} style={vc.thumb} />
        {duration ? <Text style={vc.dur}>{duration}</Text> : null}
      </View>
      <View style={vc.info}>
        <Text style={vc.title} numberOfLines={2}>{video.title}</Text>
        <View style={vc.statsRow}>
          <View style={vc.stat}>
            <Eye size={11} color={Theme.colors.textSecondary} />
            <Text style={vc.statTxt}>{fmtCount(video.statistics.viewCount)}</Text>
          </View>
          <View style={vc.stat}>
            <ThumbsUp size={11} color={Theme.colors.textSecondary} />
            <Text style={vc.statTxt}>{fmtCount(video.statistics.likeCount)}</Text>
          </View>
          <View style={vc.stat}>
            <MessageSquare size={11} color={Theme.colors.textSecondary} />
            <Text style={vc.statTxt}>{fmtCount(video.statistics.commentCount)}</Text>
          </View>
        </View>
        <View style={vc.dateRow}>
          <CalendarClock size={11} color={Theme.colors.textSecondary} />
          <Text style={vc.statTxt}>{fmtDate(video.publishedAt)}</Text>
        </View>
      </View>
      <ChevronRight size={16} color={Theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

const vc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    paddingRight: 12,
    gap: 12,
  },
  thumbWrap: { width: 100, height: 70, position: 'relative' },
  thumb: { width: 100, height: 70 },
  dur: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.72)',
    color: '#fff',
    fontSize: 10,
    fontFamily: Theme.fonts.outfit.semibold,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  info: { flex: 1, gap: 5, paddingVertical: 10 },
  title: { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary, lineHeight: 18 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statTxt: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
});

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={err.wrap}>
      <AlertCircle size={28} color={Theme.colors.danger} />
      <Text style={err.msg}>{message}</Text>
      <TouchableOpacity style={err.btn} onPress={onRetry} activeOpacity={0.8}>
        <Text style={err.btnTxt}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const err = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  msg: { fontSize: 14, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, textAlign: 'center' },
  btn: { backgroundColor: Theme.colors.accent, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20 },
  btnTxt: { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: '#fff' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChannelDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  // Resolve channel info from the cached channels list
  const { channels } = useYouTubeChannels();
  const channel: YouTubeChannel | undefined = channels.find(c => c.id === params.channelId);

  const { videos, loading: videosLoading, error: videosError, refetch } = useChannelVideos(params.channelId);

  const avatarUrl = channel
    ? channel.snippet.thumbnails.medium?.url ||
      channel.snippet.thumbnails.default?.url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.snippet.title)}&background=FF0000&color=fff`
    : `https://ui-avatars.com/api/?name=Channel&background=FF0000&color=fff`;

  const channelName = channel?.snippet.title ?? 'Channel';

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Image source={{ uri: avatarUrl }} style={s.headerAvatar} />
          <View>
            <Text style={s.headerName} numberOfLines={1}>{channelName}</Text>
            <Text style={s.headerSub}>Channel Dashboard</Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Stats grid — populated from channel statistics */}
        {channel ? (
          <>
            <View style={s.gridRow}>
              <StatTile
                icon={<Users size={16} color={Theme.colors.accent} />}
                label="Subscribers"
                value={
                  channel.statistics.hiddenSubscriberCount
                    ? 'Hidden'
                    : fmtCount(channel.statistics.subscriberCount)
                }
                accent={Theme.colors.accent}
              />
              <StatTile
                icon={<TrendingUp size={16} color={Theme.colors.success} />}
                label="Total Views"
                value={fmtCount(channel.statistics.viewCount)}
                accent={Theme.colors.success}
              />
            </View>
            <View style={[s.gridRow, { marginBottom: 24 }]}>
              <StatTile
                icon={<Play size={16} color="#9C27B0" />}
                label="Total Videos"
                value={fmtCount(channel.statistics.videoCount)}
                accent="#9C27B0"
              />
              {channel.snippet.customUrl ? (
                <View style={[tile.wrap, { borderTopColor: '#E37400', flex: 1 }]}>
                  <View style={[tile.iconWrap, { backgroundColor: '#E3740018' }]}>
                    <TrendingUp size={16} color="#E37400" />
                  </View>
                  <Text style={tile.value} numberOfLines={1}>{channel.snippet.customUrl}</Text>
                  <Text style={tile.label}>Custom URL</Text>
                </View>
              ) : <View style={{ flex: 1 }} />}
            </View>
          </>
        ) : null}

        {/* Videos section */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Videos</Text>
            {!videosLoading && !videosError && (
              <Text style={s.sectionCount}>{videos.length} loaded</Text>
            )}
          </View>

          {videosLoading ? (
            <ActivityIndicator color={Theme.colors.accent} style={{ marginVertical: 32 }} />
          ) : videosError ? (
            <ErrorState message={videosError} onRetry={refetch} />
          ) : videos.length === 0 ? (
            <View style={s.emptyWrap}>
              <Play size={28} color={Theme.colors.border} />
              <Text style={s.emptyTxt}>No videos found for this channel</Text>
            </View>
          ) : (
            <View style={s.videoList}>
              {videos.map(v => (
                <VideoCard
                  key={v.id}
                  video={v}
                  onPress={() => navigation.navigate('VideoDetail', { videoId: v.id, channelId: params.channelId })}
                />
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6FB' },
  scrollContent: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F6FB', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: Theme.colors.border },
  headerName: { fontSize: 15, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary, maxWidth: 160 },
  headerSub: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },

  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },

  section: { marginBottom: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
  sectionCount: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
  videoList: { gap: 10 },

  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTxt: { fontSize: 14, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
});
