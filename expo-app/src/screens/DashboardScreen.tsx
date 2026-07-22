import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';
import { demoBrandChannels, demoVideos, demoUser, BrandChannel, Video } from '../constants/demoData';
import { Link, Upload, TrendingUp, Users, CalendarCheck, Clock, UserCircle } from 'lucide-react-native';

export default function DashboardScreen() {
  const [redditUrl, setRedditUrl] = useState('');

  const uploadedVideos = demoVideos.filter(v => v.status === 'uploaded');
  const upcomingVideos = demoVideos.filter(v => v.status === 'upcoming' || v.status === 'processing');

  const getChannelById = (id: string): BrandChannel | undefined => {
    return demoBrandChannels.find(c => c.id === id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with user info */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View>
              <Text style={styles.greeting}>Hello, {demoUser.name.split(' ')[0]}!</Text>
              <Text style={styles.subGreeting}>Manage your YouTube channels</Text>
            </View>
            <Image source={{ uri: demoUser.avatar }} style={styles.userAvatar} />
          </View>
        </View>

        {/* Reddit URL Input Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Extract Reddit Video</Text>
          <Text style={styles.cardSubtitle}>Enter a Reddit post URL to get started</Text>
          <View style={styles.inputContainer}>
            <Link size={20} color={Theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="https://www.reddit.com/r/..."
              placeholderTextColor={Theme.colors.textSecondary}
              value={redditUrl}
              onChangeText={setRedditUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.button} onPress={() => setRedditUrl('')}>
            <Upload size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Extract Video</Text>
          </TouchableOpacity>
        </View>

        {/* Brand Channels Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Brand Channels</Text>
          <View style={styles.channelsContainer}>
            {demoBrandChannels.map(channel => (
              <View key={channel.id} style={styles.channelCard}>
                <Image source={{ uri: channel.avatar }} style={styles.channelAvatar} />
                <View style={styles.channelInfo}>
                  <Text style={styles.channelName}>{channel.name}</Text>
                  <View style={styles.channelStatsRow}>
                    <Users size={14} color={Theme.colors.textSecondary} />
                    <Text style={styles.channelStat}>{channel.subscribers} subscribers</Text>
                  </View>
                  <View style={styles.channelStatsRow}>
                    <TrendingUp size={14} color={Theme.colors.textSecondary} />
                    <Text style={styles.channelStat}>{channel.totalViews} views</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Uploaded Videos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uploaded Videos</Text>
          <View style={styles.videosContainer}>
            {uploadedVideos.map(video => {
              const channel = getChannelById(video.brandChannelId);
              return (
                <View key={video.id} style={styles.videoCard}>
                  <Image source={{ uri: video.thumbnail }} style={styles.videoThumbnail} />
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle}>{video.title}</Text>
                    <Text style={styles.videoChannel}>{channel?.name}</Text>
                    <View style={styles.videoMetaRow}>
                      <TrendingUp size={14} color={Theme.colors.textSecondary} />
                      <Text style={styles.videoMeta}>{video.views} views</Text>
                      <CalendarCheck size={14} color={Theme.colors.textSecondary} style={{ marginLeft: Theme.spacing.sm }} />
                      <Text style={styles.videoMeta}>{video.uploadDate}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Upcoming/Processing Videos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming & Processing</Text>
          <View style={styles.videosContainer}>
            {upcomingVideos.map(video => {
              const channel = getChannelById(video.brandChannelId);
              return (
                <View key={video.id} style={styles.videoCard}>
                  <Image source={{ uri: video.thumbnail }} style={styles.videoThumbnail} />
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle}>{video.title}</Text>
                    <Text style={styles.videoChannel}>{channel?.name}</Text>
                    <View style={styles.videoMetaRow}>
                      <Clock size={14} color={Theme.colors.textSecondary} />
                      <Text style={[styles.videoMeta, { color: video.status === 'processing' ? Theme.colors.warning : Theme.colors.accent }]}>
                        {video.status === 'processing' ? 'Processing...' : `Uploading: ${video.uploadDate}`}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.secondary,
  },
  scrollView: {
    flex: 1,
    padding: Theme.spacing.xl,
  },
  header: {
    marginBottom: Theme.spacing.xl,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontFamily: Theme.fonts.outfit.bold,
    color: Theme.colors.textPrimary,
  },
  subGreeting: {
    fontSize: 16,
    fontFamily: Theme.fonts.outfit.regular,
    color: Theme.colors.textSecondary,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.full,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: Theme.spacing.xl,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: Theme.fonts.outfit.semibold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.outfit.regular,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.secondary,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: 12,
    marginBottom: Theme.spacing.lg,
  },
  inputIcon: {
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Theme.fonts.outfit.regular,
    color: Theme.colors.textPrimary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.accent,
    borderRadius: Theme.radius.full,
    paddingVertical: 16,
    gap: Theme.spacing.sm,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: Theme.fonts.outfit.semibold,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.outfit.semibold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.lg,
  },
  channelsContainer: {
    gap: Theme.spacing.md,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  channelAvatar: {
    width: 56,
    height: 56,
    borderRadius: Theme.radius.full,
    marginRight: Theme.spacing.lg,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 18,
    fontFamily: Theme.fonts.outfit.semibold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  channelStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: 2,
  },
  channelStat: {
    fontSize: 14,
    fontFamily: Theme.fonts.outfit.regular,
    color: Theme.colors.textSecondary,
  },
  videosContainer: {
    gap: Theme.spacing.md,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  videoThumbnail: {
    width: 120,
    height: 68,
    borderRadius: Theme.radius.md,
    marginRight: Theme.spacing.lg,
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.outfit.semibold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  videoChannel: {
    fontSize: 14,
    fontFamily: Theme.fonts.outfit.regular,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  videoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  videoMeta: {
    fontSize: 13,
    fontFamily: Theme.fonts.outfit.regular,
    color: Theme.colors.textSecondary,
  },
  bottomPadding: {
    height: 40,
  },
});
