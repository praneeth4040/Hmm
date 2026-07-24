import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Theme } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';
import { useAccounts, PersonaVoice } from '../hooks/useAccounts';
import { useNarrationCategories } from '../hooks/useNarrationCategories';
import { useTtsVoices, TtsVoice } from '../hooks/useTtsVoices';
import { useYouTubeChannels } from '../hooks/useYouTubeChannels';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../api/client';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp,
  Plus, Play, Square, Wand2, Trash2,
} from 'lucide-react-native';

type Route = RouteProp<RootStackParamList, 'PersonaEditor'>;
type Nav   = NativeStackNavigationProp<RootStackParamList, 'PersonaEditor'>;

const PREVIEW_TEXT = "Hey everyone, welcome back. Today I've got something really interesting to share with you.";
const TABS = ['Identity', 'Content', 'Voices'] as const;
type Tab = typeof TABS[number];

const SPEED_STEPS = [
  { label: '0.75×', value: 0.75 },
  { label: '1×',    value: 1    },
  { label: '1.25×', value: 1.25 },
  { label: '1.5×',  value: 1.5  },
  { label: '1.75×', value: 1.75 },
  { label: '2×',    value: 2    },
];

const CAT_ICONS: Record<string, string> = {
  'reddit-stories': '🟠', 'hypothetical-scenarios': '🤔', 'horror-narratives': '👻',
  'true-crime': '🔍', 'confessions': '🤫', 'storytime': '📖',
  'alternate-history': '🏛️', 'sci-fi-stories': '🚀', 'fantasy-stories': '🐉', 'plot-twist': '🌀',
};

// ─── Voice preview hook ───────────────────────────────────────────────────────

function useVoicePreview(token: string | null) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function stopCurrent() {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setPlayingVoice(null);
  }

  async function preview(voiceShortName: string, rate = 1) {
    if (playingVoice === voiceShortName) { await stopCurrent(); return; }
    await stopCurrent();
    setGenerating(true);
    setPlayingVoice(voiceShortName);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: PREVIEW_TEXT, voice: voiceShortName, rate }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setGenerating(false);
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mpeg;base64,${base64}` }, { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s) => {
        if ('didJustFinish' in s && s.didJustFinish) { setPlayingVoice(null); soundRef.current = null; }
      });
    } catch {
      setGenerating(false);
      setPlayingVoice(null);
      Alert.alert('Preview failed', 'Could not generate voice preview. Check your connection.');
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { stopCurrent(); }, []);
  return { playingVoice, generating, preview };
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={tb.wrap}>
      {TABS.map((t, i) => {
        const isActive = t === active;
        const isPast   = TABS.indexOf(active) > i;
        return (
          <TouchableOpacity key={t} style={tb.item} onPress={() => onChange(t)} activeOpacity={0.7}>
            <View style={[tb.circle, isActive && tb.circleActive, isPast && tb.circleDone]}>
              {isPast ? <Check size={11} color="#fff" /> : <Text style={[tb.num, isActive && tb.numActive]}>{i + 1}</Text>}
            </View>
            <Text style={[tb.label, isActive && tb.labelActive]}>{t}</Text>
            {i < TABS.length - 1 && <View style={[tb.connector, isPast && tb.connectorDone]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  wrap:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  item:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  circle:        { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Theme.colors.border, backgroundColor: '#F4F6FB', justifyContent: 'center', alignItems: 'center' },
  circleActive:  { borderColor: Theme.colors.accent, backgroundColor: Theme.colors.accent },
  circleDone:    { borderColor: Theme.colors.success, backgroundColor: Theme.colors.success },
  num:           { fontSize: 11, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textSecondary },
  numActive:     { color: '#fff' },
  label:         { fontSize: 13, fontFamily: Theme.fonts.outfit.medium, color: Theme.colors.textSecondary },
  labelActive:   { fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.accent },
  connector:     { width: 24, height: 2, backgroundColor: Theme.colors.border, marginHorizontal: 4 },
  connectorDone: { backgroundColor: Theme.colors.success },
});

// ─── STEP 1 — Identity ────────────────────────────────────────────────────────

function IdentityStep({ username, setUsername, avatarUrl, setAvatarUrl, email, linkedChannel, onApplyChannel }: {
  username: string; setUsername: (v: string) => void;
  avatarUrl: string; setAvatarUrl: (v: string) => void;
  email: string;
  linkedChannel: { title: string; thumb: string } | null;
  onApplyChannel: () => void;
}) {
  const initial = username[0]?.toUpperCase() ?? email[0]?.toUpperCase() ?? '?';
  return (
    <ScrollView contentContainerStyle={id.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={id.avatarRow}>
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={id.avatar} />
          : <View style={[id.avatar, id.avatarFallback]}><Text style={id.avatarInitial}>{initial}</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={id.previewName} numberOfLines={1}>{username || 'Your username'}</Text>
          <Text style={id.previewEmail} numberOfLines={1}>{email}</Text>
        </View>
      </View>

      {linkedChannel && (
        <TouchableOpacity style={id.channelBanner} onPress={onApplyChannel} activeOpacity={0.8}>
          <Image source={{ uri: linkedChannel.thumb }} style={id.channelThumb} />
          <View style={{ flex: 1 }}>
            <Text style={id.channelBannerTitle}>Use your YouTube channel</Text>
            <Text style={id.channelBannerSub} numberOfLines={1}>{linkedChannel.title}</Text>
          </View>
          <Wand2 size={16} color={Theme.colors.accent} />
        </TouchableOpacity>
      )}

      <View style={id.field}>
        <Text style={id.fieldLabel}>Username</Text>
        <Text style={id.fieldHint}>Appears as the post author on Reddit &amp; X cards</Text>
        <TextInput style={id.input} value={username} onChangeText={setUsername}
          placeholder="e.g. cool_redditor" placeholderTextColor={Theme.colors.textSecondary}
          autoCapitalize="none" autoCorrect={false} maxLength={50} />
      </View>

      <View style={id.field}>
        <Text style={id.fieldLabel}>Avatar URL <Text style={id.optional}>(optional)</Text></Text>
        <Text style={id.fieldHint}>Paste a direct image URL, or leave blank to use initials</Text>
        <TextInput style={id.input} value={avatarUrl} onChangeText={setAvatarUrl}
          placeholder="https://…" placeholderTextColor={Theme.colors.textSecondary}
          autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      </View>
    </ScrollView>
  );
}

const id = StyleSheet.create({
  scroll:              { padding: 20, paddingBottom: 40 },
  avatarRow:           { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border },
  avatar:              { width: 60, height: 60, borderRadius: 30 },
  avatarFallback:      { backgroundColor: Theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  avatarInitial:       { fontSize: 24, fontFamily: Theme.fonts.outfit.bold, color: '#fff' },
  previewName:         { fontSize: 16, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
  previewEmail:        { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, marginTop: 3 },
  channelBanner:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EBF3FD', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#C5DBF8' },
  channelThumb:        { width: 38, height: 38, borderRadius: 19 },
  channelBannerTitle:  { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.accent },
  channelBannerSub:    { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, marginTop: 1 },
  field:               { marginBottom: 20 },
  fieldLabel:          { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary, marginBottom: 3 },
  fieldHint:           { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, marginBottom: 8, lineHeight: 17 },
  optional:            { fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, fontSize: 12 },
  input:               { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: Theme.colors.border, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textPrimary },
});

// ─── STEP 2 — Content type ────────────────────────────────────────────────────

function ContentStep({ contentTypeId, setContentTypeId, categories, loading }: {
  contentTypeId: string | null;
  setContentTypeId: (v: string | null) => void;
  categories: { id: string; name: string; tone: string }[];
  loading: boolean;
}) {
  if (loading) return (
    <View style={ct.centered}>
      <ActivityIndicator color={Theme.colors.accent} size="large" />
      <Text style={ct.loadingTxt}>Loading categories…</Text>
    </View>
  );
  return (
    <ScrollView contentContainerStyle={ct.scroll} showsVerticalScrollIndicator={false}>
      <Text style={ct.heading}>What kind of content?</Text>
      <Text style={ct.sub}>Sets the AI narration style for scripts generated on this account.</Text>
      {categories.map((cat) => {
        const active = cat.id === contentTypeId;
        return (
          <TouchableOpacity key={cat.id} style={[ct.card, active && ct.cardActive]}
            onPress={() => setContentTypeId(active ? null : cat.id)} activeOpacity={0.75}>
            <Text style={ct.emoji}>{CAT_ICONS[cat.id] ?? '🎬'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[ct.name, active && ct.nameActive]}>{cat.name}</Text>
              <Text style={ct.tone}>{cat.tone}</Text>
            </View>
            <View style={[ct.check, active && ct.checkActive]}>
              {active && <Check size={13} color="#fff" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const ct = StyleSheet.create({
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt:  { fontSize: 14, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
  scroll:      { padding: 20, paddingBottom: 40 },
  heading:     { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginBottom: 6 },
  sub:         { fontSize: 13, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, lineHeight: 19, marginBottom: 20 },
  card:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: Theme.colors.border },
  cardActive:  { borderColor: Theme.colors.accent, backgroundColor: '#F0F7FF' },
  emoji:       { fontSize: 26 },
  name:        { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary, marginBottom: 2 },
  nameActive:  { color: Theme.colors.accent },
  tone:        { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
  check:       { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Theme.colors.border, justifyContent: 'center', alignItems: 'center' },
  checkActive: { backgroundColor: Theme.colors.accent, borderColor: Theme.colors.accent },
});

// ─── STEP 3 — Voices ─────────────────────────────────────────────────────────

function SpeedPills({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={sp.row}>
      {SPEED_STEPS.map((s) => {
        const active = Math.abs(value - s.value) < 0.01;
        return (
          <TouchableOpacity key={s.label} style={[sp.pill, active && sp.active]} onPress={() => onChange(s.value)} activeOpacity={0.75}>
            <Text style={[sp.txt, active && sp.txtActive]}>{s.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const sp = StyleSheet.create({
  row:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  pill:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5, borderColor: Theme.colors.border, backgroundColor: '#F4F6FB' },
  active:    { backgroundColor: Theme.colors.accent, borderColor: Theme.colors.accent },
  txt:       { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textSecondary },
  txtActive: { color: '#fff' },
});

function VoicesStep({ allVoices, voicesLoading, selectedVoices, onAdd, onUpdate, onRemove, playingVoice, generating, onPreview }: {
  allVoices: TtsVoice[];
  voicesLoading: boolean;
  selectedVoices: PersonaVoice[];
  onAdd: (v: TtsVoice) => void;
  onUpdate: (i: number, v: PersonaVoice) => void;
  onRemove: (i: number) => void;
  playingVoice: string | null;
  generating: boolean;
  onPreview: (shortName: string, rate: number) => void;
}) {
  const [query, setQuery]           = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const taken = new Set(selectedVoices.map((v) => v.voiceShortName));
    return allVoices
      .filter((v) => !taken.has(v.ShortName) &&
        (v.FriendlyName.toLowerCase().includes(q) || v.Gender.toLowerCase().includes(q)))
      .slice(0, 50);
  }, [allVoices, selectedVoices, query]);

  if (voicesLoading) return (
    <View style={vs.centered}>
      <ActivityIndicator color={Theme.colors.accent} size="large" />
      <Text style={vs.loadingTxt}>Loading voices…</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={vs.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={vs.heading}>Choose voices</Text>
      <Text style={vs.sub}>Up to 5. Preview any voice before adding, then set its speed.</Text>

      {/* ── Selected voice cards ────────────────────────────────────── */}
      {selectedVoices.map((v, i) => {
        const meta        = allVoices.find((av) => av.ShortName === v.voiceShortName);
        const label       = meta?.FriendlyName ?? v.voiceShortName;
        const gender      = meta?.Gender ?? 'Unknown';
        const isFemale    = gender === 'Female';
        const gColor      = isFemale ? '#C2185B' : '#1565C0';
        const isExpanded  = expanded === v.voiceShortName;
        const isPlaying   = playingVoice === v.voiceShortName;
        const speedLabel  = SPEED_STEPS.find((s) => Math.abs(s.value - v.rate) < 0.01)?.label ?? `${v.rate}×`;

        return (
          <View key={v.voiceShortName} style={vs.card}>
            {/* Header row */}
            <View style={vs.cardHeader}>
              {/* Gender pill */}
              <View style={[vs.genderPill, { backgroundColor: gColor + '15' }]}>
                <Text style={[vs.genderTxt, { color: gColor }]}>{isFemale ? '♀' : '♂'}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={vs.voiceName} numberOfLines={1}>{label}</Text>
                <Text style={vs.voiceSpeed}>Speed: {speedLabel}</Text>
              </View>

              {/* Preview */}
              <TouchableOpacity
                style={[vs.playBtn, isPlaying && !generating && vs.playBtnActive]}
                onPress={() => onPreview(v.voiceShortName, v.rate)}
                disabled={generating && !isPlaying}
                activeOpacity={0.75}
              >
                {generating && isPlaying
                  ? <ActivityIndicator size="small" color={Theme.colors.accent} />
                  : isPlaying
                  ? <Square size={13} color={Theme.colors.accent} fill={Theme.colors.accent} />
                  : <Play size={13} color={Theme.colors.accent} fill={Theme.colors.accent} />}
              </TouchableOpacity>

              {/* Expand / collapse */}
              <TouchableOpacity
                style={vs.editPill}
                onPress={() => setExpanded(isExpanded ? null : v.voiceShortName)}
                activeOpacity={0.7}
              >
                <Text style={vs.editPillTxt}>{isExpanded ? 'Done' : 'Edit'}</Text>
                {isExpanded ? <ChevronUp size={12} color={Theme.colors.accent} /> : <ChevronDown size={12} color={Theme.colors.accent} />}
              </TouchableOpacity>
            </View>

            {/* Expanded: speed picker + remove */}
            {isExpanded && (
              <View style={vs.expandBody}>
                <View style={vs.divider} />
                <Text style={vs.controlLabel}>SPEED</Text>
                <SpeedPills value={v.rate} onChange={(val) => onUpdate(i, { ...v, rate: val })} />
                <TouchableOpacity style={vs.removeBtn} onPress={() => { onRemove(i); setExpanded(null); }} activeOpacity={0.7}>
                  <Trash2 size={13} color={Theme.colors.danger} />
                  <Text style={vs.removeTxt}>Remove voice</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* ── Add voice ───────────────────────────────────────────────── */}
      {selectedVoices.length < 5 ? (
        <>
          <TouchableOpacity
            style={[vs.addTrigger, pickerOpen && vs.addTriggerOpen]}
            onPress={() => setPickerOpen((o) => !o)}
            activeOpacity={0.8}
          >
            <View style={vs.addIcon}><Plus size={14} color="#fff" /></View>
            <Text style={vs.addTxt}>
              {selectedVoices.length === 0 ? 'Add your first voice' : 'Add another voice'}
            </Text>
            {pickerOpen ? <ChevronUp size={15} color={Theme.colors.textSecondary} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={15} color={Theme.colors.textSecondary} style={{ marginLeft: 'auto' }} />}
          </TouchableOpacity>

          {pickerOpen && (
            <View style={vs.dropdown}>
              <View style={vs.searchRow}>
                <TextInput
                  style={vs.search}
                  value={query} onChangeText={setQuery}
                  placeholder="Search name, Female or Male…"
                  placeholderTextColor={Theme.colors.textSecondary}
                  autoCapitalize="none" autoCorrect={false}
                />
              </View>
              {filtered.length === 0
                ? <Text style={vs.noResults}>No voices match</Text>
                : (
                  <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {filtered.map((item) => {
                      const gColor    = item.Gender === 'Female' ? '#C2185B' : '#1565C0';
                      const isFemale  = item.Gender === 'Female';
                      const isPlaying = playingVoice === item.ShortName;
                      return (
                        <View key={item.ShortName} style={vs.dropRow}>
                          <View style={[vs.genderPill, { backgroundColor: gColor + '15' }]}>
                            <Text style={[vs.genderTxt, { color: gColor }]}>{isFemale ? '♀' : '♂'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={vs.voiceName} numberOfLines={1}>{item.FriendlyName}</Text>
                            <Text style={vs.voiceSpeed}>{item.Gender} · {item.Locale}</Text>
                          </View>
                          {/* Preview */}
                          <TouchableOpacity
                            style={[vs.playBtn, isPlaying && !generating && vs.playBtnActive]}
                            onPress={() => onPreview(item.ShortName, 1)}
                            disabled={generating && !isPlaying}
                            activeOpacity={0.75}
                          >
                            {generating && isPlaying
                              ? <ActivityIndicator size="small" color={Theme.colors.accent} />
                              : isPlaying
                              ? <Square size={12} color={Theme.colors.accent} fill={Theme.colors.accent} />
                              : <Play size={12} color={Theme.colors.accent} fill={Theme.colors.accent} />}
                          </TouchableOpacity>
                          {/* Add */}
                          <TouchableOpacity
                            style={vs.dropAdd}
                            onPress={() => { onAdd(item); setPickerOpen(false); setQuery(''); }}
                            activeOpacity={0.75}
                          >
                            <Text style={vs.dropAddTxt}>Add</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
            </View>
          )}
        </>
      ) : (
        <View style={vs.maxBanner}>
          <Check size={15} color={Theme.colors.success} />
          <Text style={vs.maxBannerTxt}>5 voices selected — you're all set</Text>
        </View>
      )}
    </ScrollView>
  );
}

const vs = StyleSheet.create({
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 },
  loadingTxt:     { fontSize: 14, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
  scroll:         { padding: 20, paddingBottom: 40 },
  heading:        { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginBottom: 6 },
  sub:            { fontSize: 13, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, lineHeight: 19, marginBottom: 20 },

  card:           { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 12, overflow: 'hidden' },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  genderPill:     { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  genderTxt:      { fontSize: 17, fontFamily: Theme.fonts.outfit.bold },
  voiceName:      { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary, marginBottom: 3 },
  voiceSpeed:     { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
  playBtn:        { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: Theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  playBtnActive:  { backgroundColor: '#EBF3FD' },
  editPill:       { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#EBF3FD' },
  editPillTxt:    { fontSize: 12, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.accent },

  expandBody:     { paddingHorizontal: 14, paddingBottom: 14 },
  divider:        { height: 1, backgroundColor: '#F0F2F5', marginBottom: 12 },
  controlLabel:   { fontSize: 11, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textSecondary, letterSpacing: 0.8, marginBottom: 6 },
  removeBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 14, paddingVertical: 6 },
  removeTxt:      { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.danger },

  addTrigger:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: Theme.colors.border, padding: 14 },
  addTriggerOpen: { borderColor: Theme.colors.accent, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  addIcon:        { width: 28, height: 28, borderRadius: 14, backgroundColor: Theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  addTxt:         { flex: 1, fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },

  dropdown:       { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Theme.colors.accent, borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
  searchRow:      { padding: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  search:         { fontSize: 14, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textPrimary },
  noResults:      { padding: 24, textAlign: 'center', color: Theme.colors.textSecondary, fontSize: 13 },
  dropRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  dropAdd:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 22, backgroundColor: Theme.colors.accent },
  dropAddTxt:     { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: '#fff' },

  maxBanner:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E6F4EA', borderRadius: 14, padding: 16 },
  maxBannerTxt:   { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.success },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PersonaEditorScreen() {
  const navigation = useNavigation<Nav>();
  const { params }  = useRoute<Route>();
  const { token }   = useAuth();

  const { accounts, updatePersona } = useAccounts();
  const { categories, loading: catsLoading } = useNarrationCategories();
  const { voices: allVoices, loading: voicesLoading } = useTtsVoices();
  const { channels } = useYouTubeChannels();

  const account       = accounts.find((a) => a.id === params.accountId);
  const linkedChannel = channels.find((ch) => ch.accountId === params.accountId);

  const [tab,            setTab]            = useState<Tab>('Identity');
  const [username,       setUsername]       = useState('');
  const [avatarUrl,      setAvatarUrl]      = useState('');
  const [contentTypeId,  setContentTypeId]  = useState<string | null>(null);
  const [selectedVoices, setSelectedVoices] = useState<PersonaVoice[]>([]);
  const [saving,         setSaving]         = useState(false);

  useEffect(() => {
    if (!account) return;
    setUsername(account.cardUsername ?? linkedChannel?.snippet.title ?? '');
    setAvatarUrl(
      account.cardAvatarUrl ??
      linkedChannel?.snippet.thumbnails.medium?.url ??
      linkedChannel?.snippet.thumbnails.default?.url ?? ''
    );
    setContentTypeId(account.contentTypeId ?? null);
    setSelectedVoices(account.voices ?? []);
  }, [account?.id, linkedChannel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { playingVoice, generating, preview } = useVoicePreview(token);

  function addVoice(v: TtsVoice) {
    if (selectedVoices.length >= 5) { Alert.alert('Limit reached', 'Maximum 5 voices per persona.'); return; }
    setSelectedVoices((p) => [...p, { voiceShortName: v.ShortName, rate: 1, pitch: 0 }]);
  }
  function updateVoice(i: number, v: PersonaVoice) { setSelectedVoices((p) => p.map((x, idx) => idx === i ? v : x)); }
  function removeVoice(i: number) { setSelectedVoices((p) => p.filter((_, idx) => idx !== i)); }

  function applyChannel() {
    if (!linkedChannel) return;
    setUsername(linkedChannel.snippet.title);
    setAvatarUrl(linkedChannel.snippet.thumbnails.medium?.url ?? linkedChannel.snippet.thumbnails.default?.url ?? '');
  }

  async function handleSave() {
    if (!account) return;
    setSaving(true);
    try {
      await updatePersona(account.id, {
        cardUsername:  username.trim() || undefined,
        cardAvatarUrl: avatarUrl.trim() || null,
        contentTypeId: contentTypeId || null,
        voices:        selectedVoices,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Save failed', 'Could not update persona. Please try again.');
    } finally { setSaving(false); }
  }

  if (!account) return (
    <SafeAreaView style={scr.root} edges={['top']}>
      <ActivityIndicator color={Theme.colors.accent} style={{ marginTop: 64 }} />
    </SafeAreaView>
  );

  const linkedChannelInfo = linkedChannel ? {
    title: linkedChannel.snippet.title,
    thumb: linkedChannel.snippet.thumbnails.medium?.url ?? linkedChannel.snippet.thumbnails.default?.url ?? '',
  } : null;

  const tabIndex   = TABS.indexOf(tab);
  const isLastTab  = tab === 'Voices';

  return (
    <SafeAreaView style={scr.root} edges={['top']}>
      {/* Top bar */}
      <View style={scr.topBar}>
        <TouchableOpacity style={scr.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={scr.title}>Persona Setup</Text>
        <View style={{ width: 38 }} />
      </View>

      <TabBar active={tab} onChange={setTab} />

      <View style={{ flex: 1 }}>
        {tab === 'Identity' && (
          <IdentityStep
            username={username} setUsername={setUsername}
            avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl}
            email={account.email}
            linkedChannel={linkedChannelInfo}
            onApplyChannel={applyChannel}
          />
        )}
        {tab === 'Content' && (
          <ContentStep
            contentTypeId={contentTypeId} setContentTypeId={setContentTypeId}
            categories={categories} loading={catsLoading}
          />
        )}
        {tab === 'Voices' && (
          <VoicesStep
            allVoices={allVoices} voicesLoading={voicesLoading}
            selectedVoices={selectedVoices}
            onAdd={addVoice} onUpdate={updateVoice} onRemove={removeVoice}
            playingVoice={playingVoice} generating={generating}
            onPreview={(name, rate) => preview(name, rate)}
          />
        )}
      </View>

      {/* Bottom navigation */}
      <View style={scr.bottomBar}>
        {tabIndex > 0 ? (
          <TouchableOpacity style={scr.backPill} onPress={() => setTab(TABS[tabIndex - 1])} activeOpacity={0.8}>
            <ArrowLeft size={15} color={Theme.colors.accent} />
            <Text style={scr.backPillTxt}>Back</Text>
          </TouchableOpacity>
        ) : <View style={{ flex: 1 }} />}

        {isLastTab ? (
          <TouchableOpacity style={[scr.nextBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Check size={16} color="#fff" /><Text style={scr.nextTxt}>Save Persona</Text></>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={scr.nextBtn} onPress={() => setTab(TABS[tabIndex + 1])} activeOpacity={0.85}>
            <Text style={scr.nextTxt}>Next</Text>
            <ArrowRight size={15} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F4F6FB' },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F6FB', justifyContent: 'center', alignItems: 'center' },
  title:       { fontSize: 16, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
  bottomBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Theme.colors.border, gap: 12 },
  nextBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Theme.colors.accent, borderRadius: 14, paddingVertical: 15 },
  nextTxt:     { fontSize: 15, fontFamily: Theme.fonts.outfit.semibold, color: '#fff' },
  backPill:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: Theme.colors.border },
  backPillTxt: { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.accent },
});
