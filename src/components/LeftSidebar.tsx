import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

interface LeftSidebarProps {
  onNavigate: (screen: string) => void;
}

interface NavItem {
  icon: string;
  label: string;
  screen: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: '🏠', label: 'Home', screen: 'Home' },
  { icon: '🎵', label: 'Songs', screen: 'Songs' },
  { icon: '💬', label: 'Messages', screen: 'Messages', badge: 0 },
  { icon: '👤', label: 'Profile', screen: 'Profile' },
  { icon: '⚙️', label: 'Settings', screen: 'Settings' },
];

// Mock albums data
const albums = [
  { id: '1', title: 'Chill Vibes', imageUrl: '🎧' },
  { id: '2', title: 'Workout Mix', imageUrl: '💪' },
  { id: '3', title: 'Focus Flow', imageUrl: '🎯' },
  { id: '4', title: 'Party Hits', imageUrl: '🎉' },
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      {/* Navigation Links */}
      <View style={styles.navSection}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.navItem}
            onPress={() => onNavigate(item.screen)}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={styles.navLabel}>{item.label}</Text>
            {item.badge ? (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{item.badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
        
        {/* Friends Activity - Mobile only */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('Friends')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navLabel}>Friends Activity</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Albums Library */}
      <View style={styles.librarySection}>
        <Text style={styles.libraryTitle}>Your Library</Text>
        <ScrollView style={styles.albumsList} showsVerticalScrollIndicator={false}>
          {albums.map((album) => (
            <TouchableOpacity
              key={album.id}
              style={styles.albumItem}
              activeOpacity={0.7}
            >
              <View style={styles.albumIcon}>
                <Text style={styles.albumEmoji}>{album.imageUrl}</Text>
              </View>
              <Text style={styles.albumTitle} numberOfLines={1}>
                {album.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  navSection: {
    paddingHorizontal: SPACING.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  navIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  navLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  navBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  navBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
  },
  librarySection: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  libraryTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  albumsList: {
    flex: 1,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  albumIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  albumEmoji: {
    fontSize: 20,
  },
  albumTitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    flex: 1,
  },
});
