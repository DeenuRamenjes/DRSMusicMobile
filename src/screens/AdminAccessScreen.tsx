import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    TextInput,
    Image,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import axiosInstance from '../api/axios';
import { CustomDialog, useDialog } from '../components/CustomDialog';
import { getFullImageUrl } from '../config';

const SUPER_ADMIN_EMAIL = 'deenuramenjes29@gmail.com';

interface User {
    _id: string;
    name: string;
    email: string;
    image?: string;
    isAdmin: boolean;
    createdAt: string;
}

export const AdminAccessScreen = () => {
    const navigation = useNavigation();
    const { colors: themeColors } = useThemeStore();
    const { user } = useAuthStore();
    const { dialogState, hideDialog, showError, showConfirm, showSuccess } = useDialog();

    const [admins, setAdmins] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'admins' | 'users'>('admins');
    const [processingUserId, setProcessingUserId] = useState<string | null>(null);

    // Check if current user is super admin
    const isSuperAdmin = user?.emailAddress === SUPER_ADMIN_EMAIL;

    // Fetch admins and users
    const fetchData = useCallback(async () => {
        if (!isSuperAdmin) {
            setIsLoading(false);
            return;
        }
        try {
            const [adminsRes, usersRes] = await Promise.all([
                axiosInstance.get('/admin/admins'),
                axiosInstance.get('/admin/users'),
            ]);
            // Ensure data is always an array
            setAdmins(Array.isArray(adminsRes.data) ? adminsRes.data : []);
            setAllUsers(Array.isArray(usersRes.data) ? usersRes.data :
                (usersRes.data?.users ? usersRes.data.users : []));
        } catch (error) {
            console.error('Error fetching data:', error);
            showError('Error', 'Failed to load data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [isSuperAdmin, showError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchData();
    }, [fetchData]);

    // Promote user to admin
    const promoteUser = async (userId: string, userName: string) => {
        showConfirm(
            'Promote to Admin',
            `Are you sure you want to make ${userName} an admin? They will have full access to admin features.`,
            async () => {
                setProcessingUserId(userId);
                try {
                    await axiosInstance.post(`/admin/admins/${userId}`);
                    showSuccess('Success', `${userName} is now an admin`);
                    fetchData();
                } catch (error: any) {
                    showError('Error', error.response?.data?.message || 'Failed to promote user');
                } finally {
                    setProcessingUserId(null);
                }
            },
            'Promote',
            true
        );
    };

    // Demote admin
    const demoteAdmin = async (userId: string, userName: string) => {
        showConfirm(
            'Remove Admin Access',
            `Are you sure you want to remove admin access from ${userName}?`,
            async () => {
                setProcessingUserId(userId);
                try {
                    await axiosInstance.delete(`/admin/admins/${userId}`);
                    showSuccess('Success', `${userName} is no longer an admin`);
                    fetchData();
                } catch (error: any) {
                    showError('Error', error.response?.data?.message || 'Failed to demote user');
                } finally {
                    setProcessingUserId(null);
                }
            },
            'Remove',
            true
        );
    };

    // Filter users based on search
    const filteredUsers = Array.isArray(allUsers) ? allUsers.filter(user =>
        !user.isAdmin && (
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    ) : [];

    const renderUserCard = (user: User, isAdminCard: boolean) => {
        const isProcessing = processingUserId === user._id;

        return (
            <View key={user._id} style={styles.userCard}>
                <View style={styles.userInfo}>
                    {user.image ? (
                        <Image
                            source={{ uri: getFullImageUrl(user.image) }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.primary + '30' }]}>
                            <Text style={[styles.avatarInitial, { color: themeColors.primary }]}>
                                {user.name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                        {isAdminCard && (
                            <View style={[styles.adminBadge, { backgroundColor: themeColors.primary + '20' }]}>
                                <Icon name="shield" size={12} color={themeColors.primary} />
                                <Text style={[styles.adminBadgeText, { color: themeColors.primary }]}>Admin</Text>
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        isAdminCard
                            ? styles.demoteButton
                            : { backgroundColor: themeColors.primary }
                    ]}
                    onPress={() => isAdminCard
                        ? demoteAdmin(user._id, user.name)
                        : promoteUser(user._id, user.name)
                    }
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Icon
                                name={isAdminCard ? "user-minus" : "user-plus"}
                                size={16}
                                color="#fff"
                            />
                            <Text style={styles.actionButtonText}>
                                {isAdminCard ? 'Remove' : 'Promote'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
        );
    }

    // Access denied for non-super admins
    if (!isSuperAdmin) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Admin Access</Text>
                    <View style={styles.headerPlaceholder} />
                </View>
                <View style={styles.accessDenied}>
                    <Icon name="lock" size={64} color={COLORS.textMuted} />
                    <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
                    <Text style={styles.accessDeniedText}>
                        Only the super admin can manage admin access controls.
                    </Text>
                    <TouchableOpacity
                        style={[styles.backHomeButton, { backgroundColor: themeColors.primary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backHomeText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin Access</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'admins' && { backgroundColor: themeColors.primary }
                    ]}
                    onPress={() => setActiveTab('admins')}
                >
                    <Icon
                        name="shield"
                        size={18}
                        color={activeTab === 'admins' ? '#fff' : COLORS.textMuted}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === 'admins' && styles.tabTextActive
                    ]}>
                        Admins ({admins.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'users' && { backgroundColor: themeColors.primary }
                    ]}
                    onPress={() => setActiveTab('users')}
                >
                    <Icon
                        name="users"
                        size={18}
                        color={activeTab === 'users' ? '#fff' : COLORS.textMuted}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === 'users' && styles.tabTextActive
                    ]}>
                        Add Admin
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search (only for users tab) */}
            {activeTab === 'users' && (
                <View style={styles.searchContainer}>
                    <Icon name="search" size={18} color={COLORS.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users by name or email..."
                        placeholderTextColor={COLORS.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="x" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor={themeColors.primary}
                    />
                }
            >
                {activeTab === 'admins' ? (
                    <>
                        <Text style={styles.sectionDescription}>
                            Admins have full access to manage songs, albums, users, and app settings.
                        </Text>

                        {admins.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="shield-off" size={48} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>No admins found</Text>
                            </View>
                        ) : (
                            admins.map(admin => renderUserCard(admin, true))
                        )}
                    </>
                ) : (
                    <>
                        <Text style={styles.sectionDescription}>
                            Search for users and promote them to admin status.
                        </Text>

                        {filteredUsers.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="users" size={48} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>
                                    {searchQuery ? 'No users found' : 'All users are already admins'}
                                </Text>
                            </View>
                        ) : (
                            filteredUsers.map(user => renderUserCard(user, false))
                        )}
                    </>
                )}
            </ScrollView>

            {/* Custom Dialog */}
            <CustomDialog
                visible={dialogState.visible}
                title={dialogState.title}
                message={dialogState.message}
                type={dialogState.type}
                buttons={dialogState.buttons}
                onClose={hideDialog}
            />
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
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.zinc800,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    headerPlaceholder: {
        width: 32,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        gap: SPACING.sm,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.zinc800,
        borderRadius: BORDER_RADIUS.lg,
        gap: SPACING.xs,
    },
    tabText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.zinc800,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        gap: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: SPACING.md,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.xxl,
    },
    sectionDescription: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginBottom: SPACING.lg,
        lineHeight: 20,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.zinc900,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.zinc800,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
    },
    userDetails: {
        marginLeft: SPACING.md,
        flex: 1,
    },
    userName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    userEmail: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        marginTop: SPACING.xs,
        gap: 4,
    },
    adminBadgeText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        gap: SPACING.xs,
        minWidth: 90,
        justifyContent: 'center',
    },
    demoteButton: {
        backgroundColor: COLORS.error,
    },
    actionButtonText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: '#fff',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xxl * 2,
    },
    emptyText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textMuted,
        marginTop: SPACING.md,
    },
    accessDenied: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    accessDeniedTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: SPACING.lg,
    },
    accessDeniedText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: SPACING.sm,
        lineHeight: 22,
    },
    backHomeButton: {
        marginTop: SPACING.xl,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },
    backHomeText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: '#fff',
    },
});
