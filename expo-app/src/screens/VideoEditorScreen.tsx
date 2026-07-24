/**
 * VideoEditorScreen — full-screen dark video editor
 *
 * Layout (top→bottom, flex column):
 *   SafeAreaView top   — header bar (back + title + save)
 *   Video player       — fixed 16:9, flex: 0
 *   Timecode row       — current / clip badge / total
 *   Timeline section   — ruler + filmstrip + IN/OUT labels   (flex: 1, scrolls if needed)
 *   Transport bar      — mute / skip-back / play-pause / skip-forward
 *   SafeAreaView btm
 *
 * Touch routing fix:
 *   The filmstrip track handles seek gestures.
 *   The IN/OUT handles are rendered in a separate absolute-positioned
 *   overlay View that sits *above* the track so their touches win.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Video as ExpoVideo, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { RootStackParamList } from '../navigation/types';
import { useVideos } from '../hooks/useVideos';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../api/client';
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX,
  SkipBack, SkipForward, Check, Scissors, RotateCcw,
} from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type Route = RouteProp<RootStackParamList, 'VideoEditor'>;
type Nav   = NativeStackNavigationProp<RootStackParamList, 'VideoEditor'>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_W     = Dimensions.get('window').width;
const TIMELINE_H   = 52;
const HANDLE_W     = 20;
const PADDING_H    = 16;
const TRACK_W      = SCREEN_W - PADDING_H * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h  = Math.floor(sec / 3600);
  const m  = Math.floor((sec % 3600) / 60);
  const s  = Math.floor(sec % 60);
  const ds = Math.floor((sec % 1) * 10);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ds}`;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function secToX(sec: number, duration: number): number {
  if (duration <= 0) return 0;
  return clamp((sec / duration) * TRACK_W, 0, TRACK_W);
}

function xToSec(x: number, duration: number): number {
  if (TRACK_W <= 0) return 0;
  return clamp((x / TRACK_W) * duration, 0, duration);
}


// ─── Ruler ────────────────────────────────────────────────────────────────────

function Ruler({ duration }: { duration: number }) {
  if (duration <= 0) return <View style={{ height: 20 }} />;
  const step =
    duration <= 20  ? 5  :
    duration <= 60  ? 10 :
    duration <= 180 ? 30 :
    duration <= 600 ? 60 : 300;

  const marks: React.ReactElement[] = [];
  for (let t = 0; t <= duration; t += step) {
    const x = secToX(t, duration);
    marks.push(
      <View key={t} style={[rl.mark, { left: x }]}>
        <View style={rl.tick} />
        <Text style={rl.label}>{fmtTime(t)}</Text>
      </View>,
    );
  }
  return <View style={rl.wrap}>{marks}</View>;
}

const rl = StyleSheet.create({
  wrap:  { height: 20, width: TRACK_W, position: 'relative', marginBottom: 4 },
  mark:  { position: 'absolute', alignItems: 'center' },
  tick:  { width: 1, height: 5, backgroundColor: '#4A4A4A' },
  label: { fontSize: 8, color: '#666', marginTop: 1, fontFamily: 'Outfit_400Regular' },
});

// ─── Filmstrip track ──────────────────────────────────────────────────────────
// The track itself only handles seek-scrub gestures.
// IN/OUT handle gesture areas are rendered in a separate sibling overlay
// so they receive touches independently (RN doesn't route by zIndex).

interface TrackProps {
  duration: number;
  position: number;
  trimStart: number;
  trimEnd: number;
  onSeek: (sec: number) => void;
  onTrimStartChange: (sec: number) => void;
  onTrimEndChange: (sec: number) => void;
}

function FilmstripTrack({
  duration, position, trimStart, trimEnd,
  onSeek, onTrimStartChange, onTrimEndChange,
}: TrackProps) {

  // Use a ref to always have latest values inside gesture closures
  const live = useRef({ duration, trimStart, trimEnd, onSeek, onTrimStartChange, onTrimEndChange });
  live.current = { duration, trimStart, trimEnd, onSeek, onTrimStartChange, onTrimEndChange };

  // ── Seek pan (on the background track) ──────────────────────────────────
  const seekPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      onPanResponderGrant: (e) =>
        live.current.onSeek(xToSec(e.nativeEvent.locationX, live.current.duration)),
      onPanResponderMove: (e) =>
        live.current.onSeek(xToSec(e.nativeEvent.locationX, live.current.duration)),
    }),
  ).current;

  // ── IN handle pan ────────────────────────────────────────────────────────
  const inStartX = useRef(0);
  const inPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      onPanResponderGrant: () => {
        inStartX.current = secToX(live.current.trimStart, live.current.duration);
      },
      onPanResponderMove: (_, g) => {
        const { duration: dur, trimEnd: te, onTrimStartChange: cb } = live.current;
        const outX = secToX(te, dur);
        const nx   = clamp(inStartX.current + g.dx, 0, outX - HANDLE_W);
        cb(xToSec(nx, dur));
      },
    }),
  ).current;

  // ── OUT handle pan ───────────────────────────────────────────────────────
  const outStartX = useRef(0);
  const outPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      onPanResponderGrant: () => {
        outStartX.current = secToX(live.current.trimEnd, live.current.duration);
      },
      onPanResponderMove: (_, g) => {
        const { duration: dur, trimStart: ts, onTrimEndChange: cb } = live.current;
        const inX = secToX(ts, dur);
        const nx  = clamp(outStartX.current + g.dx, inX + HANDLE_W, TRACK_W);
        cb(xToSec(nx, dur));
      },
    }),
  ).current;

  const inX      = secToX(trimStart, duration);
  const outX     = secToX(trimEnd,   duration);
  const headX    = secToX(position,  duration);
  const selWidth = Math.max(0, outX - inX);

  return (
    // Outer container — clip the track but NOT the handle overlay
    <View style={{ width: TRACK_W, height: TIMELINE_H + 8 }}>

      {/* ── Filmstrip track (seek target) ── */}
      <View
        style={[ft.track, { width: TRACK_W }]}
        {...seekPan.panHandlers}
      >
        {/* Dimmed left region */}
        {inX > 0 && (
          <View style={[ft.dim, { left: 0, width: inX }]} />
        )}

        {/* Selected region — amber top/bottom border */}
        <View style={[ft.selection, { left: inX, width: selWidth }]} />

        {/* Dimmed right region */}
        {outX < TRACK_W && (
          <View style={[ft.dim, { left: outX, right: 0 }]} />
        )}

        {/* Filmstrip frame ticks */}
        {Array.from({ length: 24 }, (_, i) => (
          <View key={i} style={[ft.frameTick, { left: ((i + 1) / 24) * TRACK_W }]} />
        ))}

        {/* Playhead line */}
        <View
          style={[ft.playheadLine, { left: clamp(headX, 1, TRACK_W - 1) }]}
          pointerEvents="none"
        />
      </View>

      {/* ── Playhead cap (above the track, not clipped) ── */}
      <View
        style={[ft.playheadCap, { left: clamp(headX - 5, 0, TRACK_W - 10) }]}
        pointerEvents="none"
      />

      {/* ── IN handle — rendered over the track ── */}
      <View
        style={[ft.handle, ft.handleLeft, { left: clamp(inX - HANDLE_W / 2, 0, TRACK_W - HANDLE_W) }]}
        {...inPan.panHandlers}
      >
        <View style={ft.grip} />
        <View style={ft.grip} />
        <View style={ft.grip} />
      </View>

      {/* ── OUT handle ── */}
      <View
        style={[ft.handle, ft.handleRight, { left: clamp(outX - HANDLE_W / 2, 0, TRACK_W - HANDLE_W) }]}
        {...outPan.panHandlers}
      >
        <View style={ft.grip} />
        <View style={ft.grip} />
        <View style={ft.grip} />
      </View>
    </View>
  );
}

const ft = StyleSheet.create({
  track: {
    height: TIMELINE_H,
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  dim: {
    position: 'absolute',
    top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1,
  },
  selection: {
    position: 'absolute',
    top: 0, bottom: 0,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#F5A623',
    backgroundColor: 'rgba(245,166,35,0.08)',
    zIndex: 2,
  },
  frameTick: {
    position: 'absolute',
    top: 8, bottom: 8,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    zIndex: 0,
  },
  playheadLine: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  // Sits above track container, so not clipped by overflow:hidden
  playheadCap: {
    position: 'absolute',
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    zIndex: 30,
  },
  handle: {
    position: 'absolute',
    top: 0,
    width: HANDLE_W,
    height: TIMELINE_H,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    zIndex: 40,
  },
  handleLeft:  { backgroundColor: '#F5A623' },
  handleRight: { backgroundColor: '#F5A623' },
  grip: {
    width: 2,
    height: 12,
    borderRadius: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});


// ─── Main screen ──────────────────────────────────────────────────────────────

export default function VideoEditorScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { token }  = useAuth();
  const { saveVideo, discardSession } = useVideos();

  const streamUrl = `${API_BASE_URL}/api/v1/video/session/${params.sessionId}/stream`;

  // ── Player ───────────────────────────────────────────────────────────────
  const videoRef                    = useRef<ExpoVideo>(null);
  const [duration,  setDuration]    = useState(0);
  const [position,  setPosition]    = useState(0);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isMuted,   setIsMuted]     = useState(false);
  const [loaded,    setLoaded]      = useState(false);

  // ── Trim ─────────────────────────────────────────────────────────────────
  const [trimStart, setTrimStart]   = useState(0);
  const [trimEnd,   setTrimEnd]     = useState(0);

  // ── Saving ───────────────────────────────────────────────────────────────
  const [saving, setSaving]         = useState(false);

  // Keep a stable ref to trim/duration for the playback callback
  const trimRef = useRef({ trimStart: 0, trimEnd: 0, duration: 0 });
  trimRef.current = { trimStart, trimEnd: trimEnd > 0 ? trimEnd : duration, duration };

  const effectiveTrimEnd = trimEnd > 0 ? trimEnd : duration;

  // ── Playback status ──────────────────────────────────────────────────────
  const onPlaybackStatus = useCallback((s: AVPlaybackStatus) => {
    if (!s.isLoaded) return;

    const dur = (s.durationMillis ?? 0) / 1000;
    const pos = s.positionMillis / 1000;

    // Initialise duration and trim range once
    if (dur > 0) {
      setDuration((prev) => {
        if (prev === 0) {
          setTrimEnd(dur);
          setLoaded(true);
          return dur;
        }
        return prev;
      });
    }

    setPosition(pos);
    setIsPlaying(s.isPlaying);

    // Auto-stop at OUT point — read from ref to always have the latest value
    const { trimEnd: te, trimStart: ts } = trimRef.current;
    if (s.isPlaying && te > 0 && pos >= te) {
      videoRef.current?.pauseAsync();
      videoRef.current?.setPositionAsync(ts * 1000);
    }
  }, []); // stable — reads live values via ref

  // ── Seek ─────────────────────────────────────────────────────────────────
  const seekTo = useCallback(async (sec: number) => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(Math.round(sec * 1000));
  }, []);

  // ── Transport ─────────────────────────────────────────────────────────────
  const togglePlay = async () => {
    if (!videoRef.current || !loaded) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      if (position >= effectiveTrimEnd) await seekTo(trimStart);
      await videoRef.current.playAsync();
    }
  };

  const skipBack    = () => seekTo(Math.max(trimStart, position - 5));
  const skipForward = () => seekTo(Math.min(effectiveTrimEnd, position + 5));

  const toggleMute  = async () => {
    const next = !isMuted;
    setIsMuted(next);
    await videoRef.current?.setIsMutedAsync(next);
  };

  const resetTrim   = () => { setTrimStart(0); setTrimEnd(duration); };

  // ── Trim handle callbacks ─────────────────────────────────────────────────
  const handleTrimStartChange = useCallback((v: number) => {
    setTrimStart(v);
    seekTo(v);
  }, [seekTo]);

  const handleTrimEndChange = useCallback((v: number) => {
    setTrimEnd(v);
    seekTo(v);
  }, [seekTo]);

  // ── Save / discard ────────────────────────────────────────────────────────
  const handleSave = () => {
    const start     = trimStart;
    const end       = effectiveTrimEnd;
    const isTrimmed = start > 0.05 || end < duration - 0.05;

    Alert.alert(
      'Save video',
      isTrimmed
        ? `Save trimmed clip\n${fmtTime(start)} → ${fmtTime(end)}  (${fmtTime(end - start)})`
        : 'Save full video to your library?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            setSaving(true);
            try {
              await saveVideo(
                params.sessionId,
                isTrimmed ? { startSec: start, endSec: end } : undefined,
              );
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Save failed', err?.message ?? 'Something went wrong.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard video',
      'Leave without saving? The downloaded file will be deleted.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await discardSession(params.sessionId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const hasTrim      = trimStart > 0.05 || effectiveTrimEnd < duration - 0.05;
  const clipDuration = Math.max(0, effectiveTrimEnd - trimStart);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <SafeAreaView style={s.header} edges={['top']}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={handleDiscard}
          disabled={saving}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>

        <View style={s.titleBlock}>
          <Text style={s.titleTxt} numberOfLines={1}>{params.title}</Text>
          <Text style={s.authorTxt} numberOfLines={1}>{params.author}</Text>
        </View>

        <TouchableOpacity
          style={[s.saveBtn, (!loaded || saving) && s.saveBtnOff]}
          onPress={handleSave}
          disabled={!loaded || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color="#000" />
            : <Check size={16} color="#000" />}
          <Text style={s.saveTxt}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Video player — fixed 16:9 */}
      <View style={s.playerWrap}>
        <ExpoVideo
          ref={videoRef}
          source={{ uri: streamUrl, headers: { Authorization: `Bearer ${token}` } } as any}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.CONTAIN}
          onPlaybackStatusUpdate={onPlaybackStatus}
          shouldPlay={false}
          useNativeControls={false}
          isMuted={isMuted}
        />
        {!loaded && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color="#F5A623" />
            <Text style={s.loadingTxt}>Loading video…</Text>
          </View>
        )}
      </View>

      {/* Editing controls — fills remaining height */}
      <View style={s.controls}>

        {/* Timecodes */}
        <View style={s.timecodeRow}>
          <Text style={s.timecodeTxt}>{fmtTime(position)}</Text>
          <View style={s.clipBadge}>
            <Scissors size={10} color={hasTrim ? '#F5A623' : '#4A4A4A'} />
            <Text style={[s.clipDurTxt, hasTrim && s.clipDurActive]}>
              {hasTrim ? fmtTime(clipDuration) : fmtTime(duration)}
            </Text>
          </View>
          <Text style={s.timecodeTxt}>{fmtTime(duration)}</Text>
        </View>

        {/* Ruler + Timeline */}
        <View style={s.timelineSection}>
          <Ruler duration={duration} />
          <FilmstripTrack
            duration={duration}
            position={position}
            trimStart={trimStart}
            trimEnd={effectiveTrimEnd}
            onSeek={seekTo}
            onTrimStartChange={handleTrimStartChange}
            onTrimEndChange={handleTrimEndChange}
          />

          {/* IN / OUT labels + reset */}
          <View style={s.inOutRow}>
            <View style={s.inOutGroup}>
              <Text style={s.inOutKey}>IN</Text>
              <Text style={s.inOutVal}>{fmtTime(trimStart)}</Text>
            </View>

            <TouchableOpacity
              style={[s.resetBtn, !hasTrim && s.resetBtnOff]}
              onPress={resetTrim}
              disabled={!hasTrim}
              activeOpacity={0.7}
            >
              <RotateCcw size={12} color={hasTrim ? '#F5A623' : '#333'} />
              <Text style={[s.resetTxt, hasTrim && s.resetTxtActive]}>Reset</Text>
            </TouchableOpacity>

            <View style={[s.inOutGroup, s.inOutGroupRight]}>
              <Text style={s.inOutKey}>OUT</Text>
              <Text style={s.inOutVal}>{fmtTime(effectiveTrimEnd)}</Text>
            </View>
          </View>
        </View>

        {/* Transport */}
        <View style={s.transport}>
          <TouchableOpacity
            style={s.transBtn}
            onPress={toggleMute}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            {isMuted
              ? <VolumeX size={22} color={loaded ? '#888' : '#333'} />
              : <Volume2 size={22} color={loaded ? '#fff' : '#333'} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.transBtn}
            onPress={skipBack}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            <SkipBack size={24} color={loaded ? '#fff' : '#333'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.playBtn, (!loaded || saving) && s.playBtnOff]}
            onPress={togglePlay}
            disabled={!loaded || saving}
            activeOpacity={0.8}
          >
            {isPlaying
              ? <Pause size={30} color="#000" fill="#000" />
              : <Play  size={30} color="#000" fill="#000" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.transBtn}
            onPress={skipForward}
            disabled={!loaded}
            activeOpacity={0.7}
          >
            <SkipForward size={24} color={loaded ? '#fff' : '#333'} />
          </TouchableOpacity>

          {/* Right spacer — mirrors mute button */}
          <View style={s.transBtn} />
        </View>
      </View>

      <SafeAreaView edges={['bottom']} style={s.bottomSafe} />
    </View>
  );
}


// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#0A0A0A',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#0A0A0A',
    gap: 10,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center', alignItems: 'center',
  },
  titleBlock: { flex: 1, minWidth: 0 },
  titleTxt: {
    fontSize: 14, fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF', lineHeight: 18,
  },
  authorTxt: {
    fontSize: 11, fontFamily: 'Outfit_400Regular',
    color: '#666', marginTop: 1,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F5A623',
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20,
  },
  saveBtnOff: { opacity: 0.35 },
  saveTxt: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#000' },

  // ── Player ────────────────────────────────────────────────────────────────
  playerWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingTxt: {
    fontSize: 13, fontFamily: 'Outfit_400Regular', color: '#666',
  },

  // ── Controls area ─────────────────────────────────────────────────────────
  controls: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 4,
  },

  // ── Timecodes ─────────────────────────────────────────────────────────────
  timecodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING_H,
    paddingVertical: 10,
  },
  timecodeTxt: {
    fontSize: 12, fontFamily: 'Outfit_600SemiBold',
    color: '#666', letterSpacing: 0.3,
    minWidth: 52, textAlign: 'center',
  },
  clipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#161616',
    borderWidth: 1, borderColor: '#2A2A2A',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14,
  },
  clipDurTxt: {
    fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: '#444',
  },
  clipDurActive: { color: '#F5A623' },

  // ── Timeline section ──────────────────────────────────────────────────────
  timelineSection: {
    paddingHorizontal: PADDING_H,
  },
  inOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  inOutGroup: { gap: 2 },
  inOutGroupRight: { alignItems: 'flex-end' },
  inOutKey: {
    fontSize: 9, fontFamily: 'Outfit_600SemiBold',
    color: '#444', letterSpacing: 1.5,
  },
  inOutVal: {
    fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#F5A623',
  },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#161616',
    borderWidth: 1, borderColor: '#2A2A2A',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14,
  },
  resetBtnOff: { opacity: 0.4 },
  resetTxt: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: '#333' },
  resetTxtActive: { color: '#F5A623' },

  // ── Transport ─────────────────────────────────────────────────────────────
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  transBtn: {
    width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  playBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F5A623',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  playBtnOff: { backgroundColor: '#2A2A2A', shadowOpacity: 0 },

  bottomSafe: { backgroundColor: '#0A0A0A' },
});
