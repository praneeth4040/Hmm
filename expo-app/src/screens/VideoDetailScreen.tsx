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
import { useChannelVideos, parseDuration } from '../hooks/useChannelVideos';
import {
  ArrowLeft,
  Eye,
  ThumbsUp,
  MessageSquare,
  CalendarClock,
  Play,
  AlertCircle,
} from 'lucide-react-native';

type Route = RouteProp<RootStackParamList, 'VideoDetail'>;
type Nav   = NativeStackNavigationProp<RootStackParamList, 'VideoDetail'>;

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
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({
  icon,
  label,
  value,
  accent = Theme.colors.textSecondary,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={sr.row}>
      <View style={[sr.iconWrap, { backgroundColor: accent + '18' }]}>{icon}</View>
      <Text style={sr.label}>{label}</Text>
      <Text style={[sr.value, { color: accent }]}>{value}</Text>
    </View>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  label: { flex: 1, fontSize: 14, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
  value: { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold },
});

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={card.wrap}>
      <Text style={card.title}>{title}</Text>
      <View style={card.divider} />
      {children}
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  title: { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textSecondary, marginBottom: 10, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 4 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VideoDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  // Load the channel's videos so we can look up this specific one by ID.
  // channelId may be undefined if navigated to from outside ChannelDashboard.
  const { videos, loading, error } = useChannelVideos(params.channelId ?? '');
  const video = videos.find(v => v.id === params.videoId);
  const duration = parseDuration(video?.duration);
  const thumb =
    video?.thumbnail ||
    `https://img.youtube.com/vi/${params.videoId}/mqdefault.jpg`;

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Video Detail</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Theme.colors.accent} style={{ marginTop: 64 }} />
      ) : error || !video ? (
        <View style={s.errorWrap}>
          <AlertCircle size={32} color={Theme.colors.danger} />
          <Text style={s.errorTxt}>{error ?? 'Video not found'}</Text>
          <TouchableOpacity style={s.errorBtn} onPress={() => navigation.goBack()}>
            <Text style={s.errorBtnTxt}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Hero thumbnail */}
          <View style={s.heroWrap}>
            <Image source={{ uri: thumb }} style={s.hero} />
            <View style={s.heroPlayBtn}>
              <Play size={28} color="#fff" fill="#fff" />
            </View>
            {duration ? <Text style={s.heroDur}>{duration}</Text> : null}
          </View>

          {/* Title & date */}
          <View style={s.titleBlock}>
            <Text style={s.title}>{video.title}</Text>
            <View style={s.titleMeta}>
              <CalendarClock size={13} color={Theme.colors.textSecondary} />
              <Text style={s.dateTxt}>{fmtDate(video.publishedAt)}</Text>
            </View>
          </View>

          {/* Performance */}
          <Card title="PERFORMANCE">
            <StatRow
              icon={<Eye size={16} color={Theme.colors.accent} />}
              label="Views"
              value={fmtCount(video.statistics.viewCount)}
              accent={Theme.colors.accent}
            />
            <View style={s.rowDivider} />
            <StatRow
              icon={<ThumbsUp size={16} color={Theme.colors.success} />}
              label="Likes"
              value={fmtCount(video.statistics.likeCount)}
              accent={Theme.colors.success}
            />
            <View style={s.rowDivider} />
            <StatRow
              icon={<MessageSquare size={16} color="#9C27B0" />}
              label="Comments"
              value={fmtCount(video.statistics.commentCount)}
              accent="#9C27B0"
            />
          </Card>

          {/* Description */}
          {video.description ? (
            <Card title="DESCRIPTION">
              <Text style={s.description} numberOfLines={6}>{video.description}</Text>
            </Card>
          ) : null}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6FB' },
  scrollContent: { padding: 16, paddingBottom: 48 },

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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },

  heroWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  hero: { width: '100%', aspectRatio: 16 / 9 },
  heroPlayBtn: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  heroDur: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.72)',
    color: '#fff',
    fontSize: 12,
    fontFamily: Theme.fonts.outfit.semibold,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },

  titleBlock: { marginBottom: 16 },
  title: { fontSize: 17, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginBottom: 8, lineHeight: 24 },
  titleMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateTxt: { fontSize: 13, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },

  rowDivider: { height: 1, backgroundColor: '#F4F4F4', marginVertical: 2 },

  description: { fontSize: 13, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, lineHeight: 20 },

  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorTxt: { fontSize: 14, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, textAlign: 'center' },
  errorBtn: { backgroundColor: Theme.colors.accent, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20 },
  errorBtnTxt: { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: '#fff' },
});
