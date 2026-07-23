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
  DollarSign,
  Cpu,
  Mic,
  HardDrive,
  Timer,
  Eye,
  ThumbsUp,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Clock,
  Loader,
  MonitorPlay,
  Hash,
  CalendarClock,
  Play,
} from 'lucide-react-native';

type Route = RouteProp<RootStackParamList, 'VideoDetail'>;
type Nav   = NativeStackNavigationProp<RootStackParamList, 'VideoDetail'>;

// ─── Stat row item ────────────────────────────────────────────────────────────

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

// ─── Section card ─────────────────────────────────────────────────────────────

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
  title: { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textSecondary, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 4 },
});

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Video['status'] }) {
  const map = {
    uploaded:   { label: 'Live',       color: Theme.colors.success, bg: '#E6F4EA', Icon: CheckCircle2  },
    upcoming:   { label: 'Scheduled',  color: Theme.colors.accent,  bg: '#E8F0FE', Icon: CalendarClock },
    processing: { label: 'Processing', color: '#E37400',            bg: '#FEF3E2', Icon: Loader        },
  };
  const { label, color, bg, Icon } = map[status];
  return (
    <View style={[sb.wrap, { backgroundColor: bg }]}>
      <Icon size={13} color={color} />
      <Text style={[sb.text, { color }]}>{label}</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontFamily: Theme.fonts.outfit.semibold },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VideoDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const video   = demoVideos.find(v => v.id === params.videoId);
  if (!video) return null;

  const channel = demoBrandChannels.find(c => c.id === video.brandChannelId);
  const { stats } = video;

  // Format big token numbers nicely
  const fmtNum = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

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

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero thumbnail */}
        <View style={s.heroWrap}>
          <Image source={{ uri: video.thumbnail }} style={s.hero} />
          <View style={s.heroPlayBtn}>
            <Play size={28} color="#fff" fill="#fff" />
          </View>
          {video.duration && <Text style={s.heroDur}>{video.duration}</Text>}
        </View>

        {/* Title & status */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{video.title}</Text>
          <View style={s.titleMeta}>
            <StatusBadge status={video.status} />
            {channel && (
              <View style={s.channelPill}>
                <Image source={{ uri: channel.avatar }} style={s.channelAvatar} />
                <Text style={s.channelName}>{channel.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Performance (uploaded only) */}
        {video.status === 'uploaded' && (
          <Card title="PERFORMANCE">
            <StatRow icon={<Eye size={16} color={Theme.colors.accent} />}      label="Views"     value={video.views ?? '-'}    accent={Theme.colors.accent} />
            <View style={s.rowDivider} />
            <StatRow icon={<ThumbsUp size={16} color={Theme.colors.success} />} label="Likes"    value={video.likes ?? '-'}    accent={Theme.colors.success} />
            <View style={s.rowDivider} />
            <StatRow icon={<MessageSquare size={16} color="#9C27B0" />}          label="Comments" value={video.comments ?? '-'} accent="#9C27B0" />
            <View style={s.rowDivider} />
            <StatRow icon={<CalendarClock size={16} color={Theme.colors.textSecondary} />} label="Uploaded" value={video.uploadDate} />
          </Card>
        )}

        {/* Source */}
        <Card title="SOURCE">
          <StatRow
            icon={video.sourceType === 'youtube'
              ? <MonitorPlay size={16} color="#FF0000" />
              : <Hash size={16} color="#FF4500" />}
            label={video.sourceType === 'youtube' ? 'YouTube' : 'Reddit'}
            value="View original →"
            accent={video.sourceType === 'youtube' ? '#FF0000' : '#FF4500'}
          />
        </Card>

        {/* AI Production Cost */}
        <Card title="AI PRODUCTION COST">
          <StatRow
            icon={<DollarSign size={16} color={Theme.colors.success} />}
            label="Total cost"
            value={stats.costUSD}
            accent={Theme.colors.success}
          />
          <View style={s.rowDivider} />
          <StatRow
            icon={<Cpu size={16} color={Theme.colors.accent} />}
            label="AI tokens used"
            value={fmtNum(stats.aiTokensUsed)}
            accent={Theme.colors.accent}
          />
          <View style={s.rowDivider} />
          <StatRow
            icon={<Mic size={16} color="#9C27B0" />}
            label="TTS characters"
            value={fmtNum(stats.ttsCharsUsed)}
            accent="#9C27B0"
          />
          <View style={s.rowDivider} />
          <StatRow
            icon={<Timer size={16} color="#E37400" />}
            label="Processing time"
            value={`${stats.processingTimeSec}s`}
            accent="#E37400"
          />
          <View style={s.rowDivider} />
          <StatRow
            icon={<HardDrive size={16} color={Theme.colors.textSecondary} />}
            label="Storage used"
            value={`${stats.storageGB} GB`}
          />
        </Card>

        {/* Models used */}
        <Card title="MODELS USED">
          <StatRow
            icon={<Cpu size={16} color={Theme.colors.accent} />}
            label="Narration / Script"
            value={stats.narrationModel.split('/')[1] ?? stats.narrationModel}
            accent={Theme.colors.accent}
          />
          <View style={s.rowDivider} />
          <StatRow
            icon={<Mic size={16} color="#9C27B0" />}
            label="Captions / ASR"
            value={stats.captionModel}
            accent="#9C27B0"
          />
        </Card>

      </ScrollView>
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
  title: { fontSize: 17, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginBottom: 10, lineHeight: 24 },
  titleMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  channelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F4F6FB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  channelAvatar: { width: 20, height: 20, borderRadius: 10 },
  channelName: { fontSize: 12, fontFamily: Theme.fonts.outfit.medium, color: Theme.colors.textSecondary },

  rowDivider: { height: 1, backgroundColor: '#F4F4F4', marginVertical: 2 },
});
