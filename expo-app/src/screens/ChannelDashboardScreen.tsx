import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Theme } from '../constants/theme';
import { demoBrandChannels, demoVideos, Video } from '../constants/demoData';
import { RootStackParamList } from '../navigation/types';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Play,
  Clock,
  DollarSign,
  Eye,
  ChevronRight,
  CheckCircle2,
  Loader,
  CalendarClock,
  Timer,
} from 'lucide-react-native';

type Route = RouteProp<RootStackParamList, 'ChannelDashboard'>;
type Nav   = NativeStackNavigationProp<RootStackParamList, 'ChannelDashboard'>;

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

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Video['status'] }) {
  const map = {
    uploaded:   { label: 'Live',       color: Theme.colors.success, bg: '#E6F4EA', Icon: CheckCircle2 },
    upcoming:   { label: 'Scheduled',  color: Theme.colors.accent,  bg: '#E8F0FE', Icon: CalendarClock },
    processing: { label: 'Processing', color: '#E37400',            bg: '#FEF3E2', Icon: Loader       },
  };
  const { label, color, bg, Icon } = map[status];
  return (
    <View style={[sb.wrap, { backgroundColor: bg }]}>
      <Icon size={11} color={color} />
      <Text style={[sb.text, { color }]}>{label}</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontSize: 11, fontFamily: Theme.fonts.outfit.semibold },
});

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({ video, onPress }: { video: Video; onPress: () => void }) {
  return (
    <TouchableOpacity style={vc.card} onPress={onPress} activeOpacity={0.8}>
      <View style={vc.thumbWrap}>
        <Image source={{ uri: video.thumbnail }} style={vc.thumb} />
        {video.duration && <Text style={vc.dur}>{video.duration}</Text>}
      </View>
      <View style={vc.info}>
        <Text style={vc.title} numberOfLines={2}>{video.title}</Text>
        <View style={vc.row}>
          <StatusBadge status={video.status} />
          {video.status === 'uploaded' && (
            <View style={vc.views}>
              <Eye size={11} color={Theme.colors.textSecondary} />
              <Text style={vc.viewsTxt}>{video.views}</Text>
            </View>
          )}
        </View>
        <View style={vc.costRow}>
          <DollarSign size={11} color={Theme.colors.success} />
          <Text style={vc.costTxt}>Cost: {video.stats.costUSD}</Text>
          <Timer size={11} color={Theme.colors.textSecondary} style={{ marginLeft: 8 }} />
          <Text style={vc.costTxt}>{video.stats.processingTimeSec}s</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  views: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewsTxt: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  costTxt: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChannelDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { params }  = useRoute<Route>();

  const channel = demoBrandChannels.find(c => c.id === params.channelId);
  if (!channel) return null;

  const channelVideos = demoVideos.filter(v => v.brandChannelId === channel.id);
  const uploaded  = channelVideos.filter(v => v.status === 'uploaded');
  const scheduled = channelVideos.filter(v => v.status !== 'uploaded');

  const totalCost = channelVideos
    .reduce((sum, v) => sum + parseFloat(v.stats.costUSD.replace('$', '')), 0)
    .toFixed(2);

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Image source={{ uri: channel.avatar }} style={s.headerAvatar} />
          <View>
            <Text style={s.headerName}>{channel.name}</Text>
            <Text style={s.headerSub}>Channel Dashboard</Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Stats grid */}
        <View style={s.gridRow}>
          <StatTile icon={<Users size={16} color={Theme.colors.accent} />}       label="Subscribers"   value={channel.subscribers}     accent={Theme.colors.accent} />
          <StatTile icon={<TrendingUp size={16} color={Theme.colors.success} />}  label="Total Views"   value={channel.totalViews}      accent={Theme.colors.success} />
        </View>
        <View style={s.gridRow}>
          <StatTile icon={<Clock size={16} color="#9C27B0" />}                    label="Watch Time"    value={channel.watchTimeHours}  accent="#9C27B0" />
          <StatTile icon={<Timer size={16} color="#E37400" />}                    label="Avg Duration"  value={channel.avgViewDuration} accent="#E37400" />
        </View>
        <View style={s.gridRow}>
          <StatTile icon={<DollarSign size={16} color={Theme.colors.success} />}  label="Est. Revenue"  value={channel.revenue}         accent={Theme.colors.success} />
          <StatTile icon={<Play size={16} color={Theme.colors.accent} />}          label="Total Videos"  value={String(channelVideos.length)} accent={Theme.colors.accent} />
        </View>

        {/* Total AI cost for this channel */}
        <View style={s.costBanner}>
          <DollarSign size={18} color={Theme.colors.success} />
          <View>
            <Text style={s.costBannerLabel}>Total AI Production Cost</Text>
            <Text style={s.costBannerValue}>${totalCost} across {channelVideos.length} videos</Text>
          </View>
        </View>

        {/* Uploaded videos */}
        {uploaded.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Live Videos</Text>
              <Text style={s.sectionCount}>{uploaded.length}</Text>
            </View>
            <View style={s.videoList}>
              {uploaded.map(v => (
                <VideoCard
                  key={v.id}
                  video={v}
                  onPress={() => navigation.navigate('VideoDetail', { videoId: v.id })}
                />
              ))}
            </View>
          </View>
        )}

        {/* Scheduled / processing */}
        {scheduled.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Scheduled & Processing</Text>
              <Text style={s.sectionCount}>{scheduled.length}</Text>
            </View>
            <View style={s.videoList}>
              {scheduled.map(v => (
                <VideoCard
                  key={v.id}
                  video={v}
                  onPress={() => navigation.navigate('VideoDetail', { videoId: v.id })}
                />
              ))}
            </View>
          </View>
        )}

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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: Theme.colors.border },
  headerName: { fontSize: 15, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
  headerSub: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },

  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },

  costBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E6F4EA',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  costBannerLabel: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
  costBannerValue: { fontSize: 15, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },

  section: { marginBottom: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
  sectionCount: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
  videoList: { gap: 10 },
});
