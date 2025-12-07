import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, DIMENSIONS } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useMusicStore } from '../store/useMusicStore';

// Stat Card Component
const StatCard = ({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string | number;
  label: string;
  color: string;
}) => {
  const colorStyles: Record<string, { gradient: string[]; iconColor: string }> = {
    emerald: { gradient: ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.05)'], iconColor: '#34d399' },
    blue: { gradient: ['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.05)'], iconColor: '#60a5fa' },
    pink: { gradient: ['rgba(236, 72, 153, 0.2)', 'rgba(219, 39, 119, 0.05)'], iconColor: '#f472b6' },
    purple: { gradient: ['rgba(168, 85, 247, 0.2)', 'rgba(139, 92, 246, 0.05)'], iconColor: '#c084fc' },
    orange: { gradient: ['rgba(249, 115, 22, 0.2)', 'rgba(234, 88, 12, 0.05)'], iconColor: '#fb923c' },
  };

  const style = colorStyles[color] || colorStyles.emerald;

  return (
    <LinearGradient colors={style.gradient} style={styles.statCard}>
      <View style={styles.statContent}>
        <Icon name={icon} size={24} color={style.iconColor} />
        <Text style={[styles.statValue, { color: style.iconColor }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  );
};

export const AdminScreen = () => {
  const navigation = useNavigation();
  const { isAdmin, isLoading: authLoading, user } = useAuthStore();
  const { stats, albums, songs, fetchStats, fetchAlbums, fetchSongs, isLoading: musicLoading } = useMusicStore();
  const [activeTab, setActiveTab] = useState<'songs' | 'albums'>('songs');

  useEffect(() => {
    fetchStats();
    fetchAlbums();
    fetchSongs();
  }, []);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'MainLayout' }],
      });
    }
  };

  // Show forbidden if not admin
  if (!authLoading && !isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.forbiddenContainer}>
          <Icon name="shield-off" size={64} color={COLORS.error} />
          <Text style={styles.forbiddenTitle}>Access Denied</Text>
          <Text style={styles.forbiddenText}>
            You don't have admin privileges to access this page.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-left" size={20} color={COLORS.textPrimary} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (authLoading || musicLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Manage your music</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Welcome Section */}
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.1)', 'transparent']}
          style={styles.welcomeSection}
        >
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{user?.fullName || 'Admin'}</Text>
          <View style={styles.adminBadge}>
            <Icon name="shield" size={14} color={COLORS.primary} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="music"
            value={stats?.totalSongs || songs.length}
            label="Total Songs"
            color="emerald"
          />
          <StatCard
            icon="disc"
            value={stats?.totalAlbums || albums.length}
            label="Total Albums"
            color="purple"
          />
          <StatCard
            icon="users"
            value={stats?.totalUsers || 0}
            label="Total Users"
            color="blue"
          />
          <StatCard
            icon="headphones"
            value={stats?.uniqueArtists || 0}
            label="Artists"
            color="pink"
          />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'songs' && styles.tabActive]}
            onPress={() => setActiveTab('songs')}
          >
            <Icon
              name="music"
              size={18}
              color={activeTab === 'songs' ? COLORS.textPrimary : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'songs' && styles.tabTextActive]}>
              Songs ({songs.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'albums' && styles.tabActive]}
            onPress={() => setActiveTab('albums')}
          >
            <Icon
              name="disc"
              size={18}
              color={activeTab === 'albums' ? COLORS.textPrimary : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'albums' && styles.tabTextActive]}>
              Albums ({albums.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'songs' ? (
            <View>
              <Text style={styles.listTitle}>Recent Songs</Text>
              {songs.slice(0, 10).map((song) => (
                <View key={song._id} style={styles.listItem}>
                  <Icon name="music" size={16} color={COLORS.textMuted} />
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemTitle} numberOfLines={1}>{song.title}</Text>
                    <Text style={styles.listItemSubtitle} numberOfLines={1}>{song.artist}</Text>
                  </View>
                  <Text style={styles.listItemDuration}>{song.duration}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View>
              <Text style={styles.listTitle}>All Albums</Text>
              {albums.map((album) => (
                <View key={album._id} style={styles.listItem}>
                  <Icon name="disc" size={16} color={COLORS.textMuted} />
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemTitle} numberOfLines={1}>{album.title}</Text>
                    <Text style={styles.listItemSubtitle} numberOfLines={1}>
                      {album.artist} • {album.songs?.length || 0} songs
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: DIMENSIONS.playbackHeight + SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
  forbiddenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  forbiddenTitle: {
    fontSize: FONT_SIZES.heading,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  forbiddenText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  backButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
  },
  welcomeSection: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xxl,
    marginBottom: SPACING.xl,
  },
  welcomeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  welcomeName: {
    fontSize: FONT_SIZES.display,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    width: '47%',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.heading,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  tabActive: {
    backgroundColor: COLORS.backgroundTertiary,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  tabContent: {
    marginBottom: SPACING.xl,
  },
  listTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  listItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  listItemTitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  listItemSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  listItemDuration: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
});
