import React, { useMemo, useState } from 'react';
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
import { useAccounts, ConnectedAccount } from '../hooks/useAccounts';
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
  Pencil,
  UserCircle2,
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

// ─── Merged account row ───────────────────────────────────────────────────────
// Shows the persona avatar/username on the left, channel stats in the middle,
// and an Edit Persona button on the right. Tapping the channel area navigates
// to ChannelDashboard; tapping Edit goes to PersonaEditor.

interface AccountRowProps {
  account: ConnectedAccount;
  channel: YouTubeChannel | undefined;
  onChannelPress: () => void;
  onEditPersona: () => void;
}

function AccountRow({ account, channel, onChannelPress, onEditPersona }: AccountRowProps) {
  const personaInitial = (account.cardUsername ?? account.email)[0]?.toUpperCase() ?? '?';
  const channelAvatarUrl =
    channel?.snippet.thumbnails.medium?.url ||
    channel?.snippet.thumbnails.default?.url ||
    (channel
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.snippet.title)}&background=FF0000&color=fff`
      : null);

  return (
    <View style={ar.card}>
      {/* ── Persona pill ─────────────────────────────────────────────────── */}
      <View style={ar.personaCol}>
        {account.cardAvatarUrl ? (
          <Image source={{ uri: account.cardAvatarUrl }} style={ar.personaAvatar} />
        ) : (
          <View style={ar.personaFallback}>
            <Text style={ar.personaInitial}>{personaInitial}</Text>
          </View>
        )}
        <Text style={ar.personaName} numberOfLines={1}>
          {account.cardUsername ?? <Text style={ar.personaUnset}>No name</Text>}
        </Text>
        <TouchableOpacity style={ar.editBtn} onPress={onEditPersona} activeOpacity={0.75}>
          <Pencil size={11} color={Theme.colors.accent} />
          <Text style={ar.editTxt}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <View style={ar.divider} />

      {/* ── Channel area ─────────────────────────────────────────────────── */}
      {channel ? (
        <TouchableOpacity style={ar.channelCol} onPress={onChannelPress} activeOpacity={0.8}>
          {channelAvatarUrl && (
            <Image source={{ uri: channelAvatarUrl }} style={ar.channelAvatar} />
          )}
          <View style={ar.channelInfo}>
            <Text style={ar.channelName} numberOfLines={1}>{channel.snippet.title}</Text>
            {channel.snippet.customUrl && (
              <Text style={ar.channelHandle} numberOfLines={1}>{channel.snippet.customUrl}</Text>
            )}
            <View style={ar.statsRow}>
              <View style={ar.stat}>
                <Users size={10} color={Theme.colors.textSecondary} />
                <Text style={ar.statTxt}>
                  {channel.statistics.hiddenSubscriberCount
                    ? 'Hidden'
                    : fmtCount(channel.statistics.subscriberCount)}
                </Text>
              </View>
              <View style={ar.stat}>
                <TrendingUp size={10} color={Theme.colors.textSecondary} />
                <Text style={ar.statTxt}>{fmtCount(channel.statistics.viewCount)} views</Text>
              </View>
              <View style={ar.stat}>
                <Play size={10} color={Theme.colors.textSecondary} />
                <Text style={ar.statTxt}>{fmtCount(channel.statistics.videoCount)} videos</Text>
              </View>
            </View>
          </View>
          <ChevronRight size={16} color={Theme.colors.textSecondary} />
        </TouchableOpacity>
      ) : (
        <View style={ar.channelCol}>
          <View style={ar.noChannelIconWrap}>
            <Tv2 size={18} color={Theme.colors.textSecondary} />
          </View>
          <View style={ar.channelInfo}>
            <Text style={ar.channelName}>{account.email}</Text>
            <Text style={ar.noChannelTxt}>No channel linked</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const ar = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Persona side
  personaCol: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 5,
    minWidth: 80,
  },
  personaAvatar: { width: 40, height: 40, borderRadius: 20 },
  personaFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personaInitial: { fontSize: 16, fontFamily: Theme.fonts.outfit.bold, color: '#fff' },
  personaName: {
    fontSize: 11,
    fontFamily: Theme.fonts.outfit.semibold,
    color: Theme.colors.textPrimary,
    maxWidth: 72,
    textAlign: 'center',
  },
  personaUnset: {
    fontSize: 11,
    fontFamily: Theme.fonts.outfit.regular,
    color: Theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EBF3FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  editTxt: { fontSize: 11, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.accent },

  // Divider
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: Theme.colors.border },

  // Channel side
  channelCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  channelAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Theme.colors.border },
  noChannelIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F6FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfo: { flex: 1, gap: 2 },
  channelName: { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
  channelHandle: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.accent },
  noChannelTxt: { fontSize: 11, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statTxt: { fontSize: 10, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyAccounts({ onConnect }: { onConnect: () => void }) {
  return (
    <View style={empty.wrap}>
      <Tv2 size={36} color={Theme.colors.border} />
      <Text style={empty.title}>No accounts connected</Text>
      <Text style={empty.sub}>Connect your Google / YouTube account to get started</Text>
      <TouchableOpacity style={empty.btn} onPress={onConnect} activeOpacity={0.8}>
        <PlusCircle size={15} color="#fff" />
        <Text style={empty.btnTxt}>Connect Account</Text>
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
  const { accounts, loading: accountsLoading, refetch: refetchAccounts } = useAccounts();

  // Build a map of accountId → channel for O(1) lookup
  const channelByAccountId = useMemo(() => {
    const map = new Map<string, YouTubeChannel>();
    for (const ch of channels) {
      if (ch.accountId) map.set(ch.accountId, ch);
    }
    return map;
  }, [channels]);

  const isLoading = channelsLoading || accountsLoading;

  const firstName = user?.name?.split(' ')[0] ?? '...';
  const avatarUri = user?.avatarUrl
    ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'U')}&background=1A73E8&color=fff`;

  // ── Connect Google / YouTube account ────────────────────────────────────
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
        await Promise.all([refetchChannels(), refetchAccounts()]);
      } else if (result.type !== 'cancel') {
        Alert.alert('Connection failed', 'Could not connect your account.');
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

        {/* ── Video Extraction ──────────────────────────────────────────────── */}
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

        {/* ── Connected Accounts (channel + persona merged) ─────────────────── */}
        <View style={s.sectionWrap}>
          <View style={s.sectionRow}>
            <View>
              <Text style={s.sectionTitle}>Connected Accounts</Text>
              {!isLoading && (
                <Text style={s.sectionSub}>
                  {accounts.length > 0
                    ? `${accounts.length} account${accounts.length !== 1 ? 's' : ''} · tap channel to explore`
                    : 'None connected'}
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

          {/* Column headers — only shown when there are accounts */}
          {!isLoading && accounts.length > 0 && (
            <View style={s.colHeaders}>
              <Text style={s.colHeaderPersona}>Persona</Text>
              <Text style={s.colHeaderChannel}>Channel</Text>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator color={Theme.colors.accent} style={{ marginVertical: 24 }} />
          ) : accounts.length === 0 ? (
            <EmptyAccounts onConnect={handleConnect} />
          ) : (
            <View style={s.accountList}>
              {accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  channel={channelByAccountId.get(account.id)}
                  onChannelPress={() => {
                    const ch = channelByAccountId.get(account.id);
                    if (ch) navigation.navigate('ChannelDashboard', { channelId: ch.id });
                  }}
                  onEditPersona={() =>
                    navigation.navigate('PersonaEditor', { accountId: account.id })
                  }
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
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
  sectionSub: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, marginTop: 2 },

  // Column headers
  colHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  colHeaderPersona: {
    width: 80,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Theme.fonts.outfit.semibold,
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colHeaderChannel: {
    flex: 1,
    marginLeft: 15,
    fontSize: 11,
    fontFamily: Theme.fonts.outfit.semibold,
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  accountList: { gap: 10 },

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
});