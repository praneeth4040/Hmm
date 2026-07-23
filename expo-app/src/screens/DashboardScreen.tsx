import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Theme } from '../constants/theme';
import { demoBrandChannels, demoVideos, demoUser, BrandChannel, Video } from '../constants/demoData';
import { RootStackParamList } from '../navigation/types';
import {
  Link2,
  Upload,
  TrendingUp,
  Users,
  Play,
  Clock,
  CheckCircle2,
  Loader,
  Bell,
  ChevronRight,
  PlusCircle,
  MonitorPlay,
  Hash,
} from 'lucide-react-native';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Video['status'] }) {
  const map = {
    uploaded:   { label: 'Live',       color: Theme.colors.success, bg: '#E6F4EA', Icon: CheckCircle2 },
    upcoming:   { label: 'Scheduled',  color: Theme.colors.accent,  bg: '#E8F0FE', Icon: Clock        },
    processing: { label: 'Processing', color: '#E37400',            bg: '#FEF3E2', Icon: Loader       },
  };
  const { label, color, bg, Icon } = map[status];
  return (
    <View style={[badge.wrap, { backgroundColor: bg }]}>
      <Icon size={11} color={color} />
      <Text style={[badge.text, { color }]}>{label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontSize: 11, fontFamily: Theme.fonts.outfit.semibold },
});

// ─── Channel card ─────────────────────────────────────────────────────────────

function ChannelCard({ channel, onPress }: { channel: BrandChannel; onPress: () => void }) {
  return (
    <TouchableOpacity style={ch.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: channel.avatar }} style={ch.avatar} />
      <View style={ch.info}>
        <Text style={ch.name} numberOfLines={1}>{channel.name}</Text>
        <View style={ch.row}>
          <Users size={12} color={Theme.colors.textSecondary} />
          <Text style={ch.stat}>{channel.subscribers}</Text>
        </View>
        <View style={ch.row}>
          <TrendingUp size={12} color={Theme.colors.textSecondary} />
          <Text style={ch.stat}>{channel.totalViews} views</Text>
        </View>
      </View>
      <ChevronRight size={18} color={Theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

const ch = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: Theme.colors.border },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stat: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
});

// ─── Video row ────────────────────────────────────────────────────────────────

function VideoRow({ video, onPress }: { video: Video; onPress: () => void }) {
  return (
    <TouchableOpacity style={vr.card} onPress={onPress} activeOpacity={0.8}>
      <View style={vr.thumbWrap}>
        <Image source={{ uri: video.thumbnail }} style={vr.thumb} />
        <View style={vr.playOverlay}>
          <Play size={14} color="#fff" fill="#fff" />
        </View>
        {video.duration && <Text style={vr.duration}>{video.duration}</Text>}
      </View>
      <View style={vr.info}>
        <Text style={vr.title} numberOfLines={2}>{video.title}</Text>
        <View style={vr.footer}>
          <StatusBadge status={video.status} />
          {video.status === 'uploaded' && (
            <View style={vr.views}>
              <TrendingUp size={11} color={Theme.colors.textSecondary} />
              <Text style={vr.viewsTxt}>{video.views}</Text>
            </View>
          )}
        </View>
      </View>
      <ChevronRight size={16} color={Theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

const vr = StyleSheet.create({
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
    gap: 12,
    paddingRight: 12,
  },
  thumbWrap: { width: 100, height: 70, position: 'relative' },
  thumb: { width: 100, height: 70 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  duration: {
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
  info: { flex: 1, gap: 6, paddingVertical: 10 },
  title: { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary, lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  views: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewsTxt: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [url, setUrl] = useState('');

  const totalSubs = '2.55M';
  const totalViews = '105M';

  function detectSource(u: string): 'reddit' | 'youtube' | null {
    if (u.includes('reddit.com')) return 'reddit';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    return null;
  }

  const source = detectSource(url);

  function handleExtract() {
    if (!url.trim()) return;
    if (!source) {
      Alert.alert('Unsupported URL', 'Please enter a Reddit or YouTube URL.');
      return;
    }
    Alert.alert('Extracting…', `Starting extraction from ${source === 'reddit' ? 'Reddit' : 'YouTube'}.`);
    setUrl('');
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <View style={s.topBar}>
          <View>
            <Text style={s.greeting}>Hey, {demoUser.name.split(' ')[0]} 👋</Text>
            <Text style={s.greetingSub}>Your automation hub</Text>
          </View>
          <View style={s.topActions}>
            <TouchableOpacity style={s.iconBtn}>
              <Bell size={20} color={Theme.colors.textPrimary} />
              <View style={s.dot} />
            </TouchableOpacity>
            <Image source={{ uri: demoUser.avatar }} style={s.avatar} />
          </View>
        </View>

        {/* ── Summary pills ────────────────────────────────────────────────── */}
        <View style={s.pillRow}>
          <View style={s.pill}>
            <Users size={14} color={Theme.colors.accent} />
            <Text style={s.pillVal}>{totalSubs}</Text>
            <Text style={s.pillLbl}>subscribers</Text>
          </View>
          <View style={s.pillDivider} />
          <View style={s.pill}>
            <TrendingUp size={14} color={Theme.colors.success} />
            <Text style={s.pillVal}>{totalViews}</Text>
            <Text style={s.pillLbl}>total views</Text>
          </View>
          <View style={s.pillDivider} />
          <View style={s.pill}>
            <Play size={14} color="#E37400" />
            <Text style={s.pillVal}>{demoVideos.length}</Text>
            <Text style={s.pillLbl}>videos</Text>
          </View>
        </View>

        {/* ── Video Extraction ─────────────────────────────────────────────── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionTitle}>Video Extraction</Text>
          <Text style={s.sectionSub}>Paste any Reddit or YouTube URL to get started</Text>

          <View style={s.extractCard}>
            {/* URL input */}
            <View style={[s.inputWrap, url && source === 'reddit' && s.inputReddit, url && source === 'youtube' && s.inputYoutube, url && !source && s.inputError]}>
              {source === 'youtube' ? (
                <MonitorPlay size={18} color="#FF0000" style={s.inputIcon} />
              ) : source === 'reddit' ? (
                <Hash size={18} color="#FF4500" style={s.inputIcon} />
              ) : (                <Link2 size={18} color={Theme.colors.textSecondary} style={s.inputIcon} />
              )}
              <TextInput
                style={s.input}
                placeholder="https://reddit.com/r/...  or  youtube.com/watch?v=..."
                placeholderTextColor={Theme.colors.textSecondary}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {url.length > 0 && (
                <TouchableOpacity onPress={() => setUrl('')} style={s.clearBtn}>
                  <Text style={s.clearX}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Source hint */}
            {url.length > 0 && (
              <Text style={[s.sourceHint, !source && { color: Theme.colors.danger }]}>
                {source === 'reddit' ? '🟠 Reddit post detected' : source === 'youtube' ? '🔴 YouTube video detected' : '⚠️ Unrecognised URL'}
              </Text>
            )}

            {/* Extract button */}
            <TouchableOpacity
              style={[s.extractBtn, (!url.trim() || !source) && s.extractBtnOff]}
              onPress={handleExtract}
              disabled={!url.trim() || !source}
              activeOpacity={0.85}
            >
              <Upload size={17} color="#fff" />
              <Text style={s.extractBtnTxt}>Extract & Process</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Brand Channels ───────────────────────────────────────────────── */}
        <View style={s.sectionWrap}>
          <View style={s.sectionRow}>
            <View>
              <Text style={s.sectionTitle}>Brand Channels</Text>
              <Text style={s.sectionSub}>{demoBrandChannels.length} connected</Text>
            </View>
            <TouchableOpacity
              style={s.connectBtn}
              onPress={() => Alert.alert('Connect Channel', 'Google OAuth flow would open here.')}
              activeOpacity={0.8}
            >
              <PlusCircle size={15} color={Theme.colors.accent} />
              <Text style={s.connectTxt}>Connect</Text>
            </TouchableOpacity>
          </View>

          <View style={s.channelList}>
            {demoBrandChannels.map(ch => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                onPress={() => navigation.navigate('ChannelDashboard', { channelId: ch.id })}
              />
            ))}
          </View>
        </View>

        {/* ── Recent Videos ────────────────────────────────────────────────── */}
        <View style={s.sectionWrap}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recent Videos</Text>
            <Text style={s.videoCount}>{demoVideos.length} total</Text>
          </View>
          <View style={s.videoList}>
            {demoVideos.map(v => (
              <VideoRow
                key={v.id}
                video={v}
                onPress={() => navigation.navigate('VideoDetail', { videoId: v.id })}
              />
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6FB' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  greeting: { fontSize: 20, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
  greetingSub: { fontSize: 13, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, marginTop: 1 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F6FB', justifyContent: 'center', alignItems: 'center' },
  dot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.colors.danger, borderWidth: 1.5, borderColor: '#fff' },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: Theme.colors.accent },

  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  pill: { flex: 1, alignItems: 'center', gap: 3 },
  pillVal: { fontSize: 15, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
  pillLbl: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
  pillDivider: { width: 1, height: 36, backgroundColor: Theme.colors.border },

  sectionWrap: { marginTop: 28, paddingHorizontal: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
  sectionSub: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, marginTop: 2, marginBottom: 14 },
  videoCount: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },

  extractCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6FB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  inputReddit: { borderColor: '#FF4500' },
  inputYoutube: { borderColor: '#FF0000' },
  inputError: { borderColor: Theme.colors.danger },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 13, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textPrimary },
  clearBtn: { paddingHorizontal: 6 },
  clearX: { fontSize: 13, color: Theme.colors.textSecondary },
  sourceHint: { fontSize: 12, fontFamily: Theme.fonts.outfit.medium, color: Theme.colors.textSecondary, marginBottom: 12, marginLeft: 2 },
  extractBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  extractBtnOff: { backgroundColor: '#A8C7F5' },
  extractBtnTxt: { fontSize: 15, fontFamily: Theme.fonts.outfit.semibold, color: '#fff' },

  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBF3FD',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  connectTxt: { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.accent },

  channelList: { gap: 10 },
  videoList: { gap: 10 },
});
