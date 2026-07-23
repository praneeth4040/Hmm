import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Theme } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useYouTubeChannels, YouTubeChannel } from '../hooks/useYouTubeChannels';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../api/client';
import {
  Link2,
  Upload,
  TrendingUp,
  Users,
  Play,
  Bell,
  ChevronRight,
  PlusCircle,
  MonitorPlay,
  Hash,
  Tv2,
} from 'lucide-react-native';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCount(n?: string): string {
  if (!n) return '—';
  const num = parseInt(n, 10);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

// ─── Channel card ─────────────────────────────────────────────────────────────

function ChannelCard({ channel, onPress }: { channel: YouTubeChannel; onPress: () => void }) {
  const avatarUrl =
    channel.snippet.thumbnails.medium?.url ||
    channel.snippet.thumbnails.default?.url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.snippet.title)}&background=FF0000&color=fff`;

  return (
    <TouchableOpacity style={ch.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: avatarUrl }} style={ch.avatar} />
      <View style={ch.info}>
        <Text style={ch.name} numberOfLines={1}>{channel.snippet.title}</Text>
        {channel.snippet.customUrl && (
          <Text style={ch.handle} numberOfLines={1}>{channel.snippet.customUrl}</Text>
        )}
        <View style={ch.statsRow}>
          <View style={ch.stat}>
            <Users size={11} color={Theme.colors.textSecondary} />
            <Text style={ch.statTxt}>
              {channel.statistics.hiddenSubscriberCount
                ? 'Hidden'
                : fmtCount(channel.statistics.subscriberCount)}
            </Text>
          </View>
          <View style={ch.stat}>
            <TrendingUp size={11} color={Theme.colors.textSecondary} />
            <Text style={ch.statTxt}>{fmtCount(channel.statistics.viewCount)} views</Text>
          </View>
          <View style={ch.stat}>
            <Play size={11} color={Theme.colors.textSecondary} />
            <Text style={ch.statTxt}>{fmtCount(channel.statistics.videoCount)} videos</Text>
          </View>
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
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: Theme.colors.border },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
  handle: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.accent },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statTxt: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
});

// ─── Empty channel state ──────────────────────────────────────────────────────

function EmptyChannels({ onConnect }: { onConnect: () => void }) {
  return (
    <View style={empty.wrap}>
      <Tv2 size={36} color={Theme.colors.border} />
      <Text style={empty.title}>No channels connected</Text>
      <Text style={empty.sub}>Connect your YouTube account to see your channels here</Text>
      <TouchableOpacity style={empty.btn} onPress={onConnect} activeOpacity={0.8}>
        <PlusCircle size={15} color="#fff" />
        <Text style={empty.btnTxt}>Connect YouTube</Text>
      </TouchableOpacity>
    </View>
  );
}

const empty = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  title: { fontSize: 15, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary, marginTop: 4 },
  sub: { fontSize: 13, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Theme.colors.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  btnTxt: { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: '#fff' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [url, setUrl] = useState('');
  const [connecting, setConnecting] = useState(false);

  const { user } = useCurrentUser();
  const { token } = useAuth();
  const { channels, loading: channelsLoading, refetch: refetchChannels } = useYouTubeChannels();

  const firstName = user?.name?.split(' ')[0] ?? '...';
  const avatarUri = user?.avatarUrl
    ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'U')}&background=1A73E8&color=fff`;

  // ── Connect YouTube channel ──────────────────────────────────────────────
  const handleConnect = async () => {
    if (!token) return;
    setConnecting(true);
    try {
      const redirectUri = Linking.createURL('auth/callback');
      const authUrl =
        `${API_BASE_URL}/api/v1/auth/google` +
        `?token=${encodeURIComponent(token)}` +
        `&redirectUri=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success') {
        await refetchChannels();
      } else if (result.type !== 'cancel') {
        Alert.alert('Connection failed', 'Could not connect your YouTube account.');
      }
    } catch {
      Alert.alert('Connection failed', 'Something went wrong. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  // ── URL extraction ───────────────────────────────────────────────────────
  function detectSource(u: string): 'reddit' | 'youtube' | null {
    if (u.includes('reddit.com')) return 'reddit';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    return null;
  }

  const source = detectSource(url);

  function handleExtract() {
    if (!url.trim() || !source) return;
    Alert.alert('Extracting…', `Starting extraction from ${source === 'reddit' ? 'Reddit' : 'YouTube'}.`);
    setUrl('');
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <View style={s.topBar}>
          <View>
            <Text style={s.greeting}>Hey, {firstName} 👋</Text>
            <Text style={s.greetingSub}>Your automation hub</Text>
          </View>
          <View style={s.topActions}>
            <TouchableOpacity style={s.iconBtn}>
              <Bell size={20} color={Theme.colors.textPrimary} />
              <View style={s.dot} />
            </TouchableOpacity>
            <Image source={{ uri: avatarUri }} style={s.avatar} />
          </View>
        </View>

        {/* ── Video Extraction ─────────────────────────────────────────────── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionTitle}>Video Extraction</Text>
          <Text style={s.sectionSub}>Paste any Reddit or YouTube URL to get started</Text>

          <View style={s.extractCard}>
            <View style={[
              s.inputWrap,
              url && source === 'reddit'  && s.inputReddit,
              url && source === 'youtube' && s.inputYoutube,
              url && !source              && s.inputError,
            ]}>
              {source === 'youtube' ? (
                <MonitorPlay size={18} color="#FF0000" style={s.inputIcon} />
              ) : source === 'reddit' ? (
                <Hash size={18} color="#FF4500" style={s.inputIcon} />
              ) : (
                <Link2 size={18} color={Theme.colors.textSecondary} style={s.inputIcon} />
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

            {url.length > 0 && (
              <Text style={[s.sourceHint, !source && { color: Theme.colors.danger }]}>
                {source === 'reddit'
                  ? '🟠 Reddit post detected'
                  : source === 'youtube'
                  ? '🔴 YouTube video detected'
                  : '⚠️ Unrecognised URL'}
              </Text>
            )}

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
              {!channelsLoading && (
                <Text style={s.sectionSub}>
                  {channels.length > 0 ? `${channels.length} connected` : 'None connected'}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[s.connectBtn, connecting && s.connectBtnDisabled]}
              onPress={handleConnect}
              disabled={connecting}
              activeOpacity={0.8}
            >
              {connecting
                ? <ActivityIndicator size="small" color={Theme.colors.accent} />
                : <PlusCircle size={15} color={Theme.colors.accent} />
              }
              <Text style={s.connectTxt}>{connecting ? 'Connecting…' : 'Connect'}</Text>
            </TouchableOpacity>
          </View>

          {channelsLoading ? (
            <ActivityIndicator color={Theme.colors.accent} style={{ marginVertical: 24 }} />
          ) : channels.length === 0 ? (
            <EmptyChannels onConnect={handleConnect} />
          ) : (
            <View style={s.channelList}>
              {channels.map(channel => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  onPress={() => navigation.navigate('ChannelDashboard', { channelId: channel.id })}
                />
              ))}
            </View>
          )}
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

  sectionWrap: { marginTop: 28, paddingHorizontal: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
  sectionSub: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, marginTop: 2 },

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
  inputReddit:  { borderColor: '#FF4500' },
  inputYoutube: { borderColor: '#FF0000' },
  inputError:   { borderColor: Theme.colors.danger },
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
  connectBtnDisabled: { opacity: 0.6 },
  connectTxt: { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.accent },

  channelList: { gap: 10 },
});
