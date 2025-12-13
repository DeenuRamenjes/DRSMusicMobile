import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';

// Channel IDs
const MESSAGE_CHANNEL_ID = 'drs-messages';
const BROADCAST_CHANNEL_ID = 'drs-broadcast';

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Initialize notification channels when app starts
export const initializeNotifications = async () => {
    if (Platform.OS !== 'android') {
        return;
    }

    if (isInitialized) {
        return;
    }

    // Prevent multiple simultaneous initializations
    if (initializationPromise) {
        await initializationPromise;
        return;
    }

    initializationPromise = (async () => {

        try {
            await notifee.createChannel({
                id: MESSAGE_CHANNEL_ID,
                name: 'Chat Messages',
                description: 'Notifications for new chat messages',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
                sound: 'default',
                vibration: true,
            });

            // Create broadcast channel
            await notifee.createChannel({
                id: BROADCAST_CHANNEL_ID,
                name: 'Announcements',
                description: 'Broadcast announcements from DRS Music',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
                sound: 'default',
                vibration: true,
            });

            isInitialized = true;
        } catch (error: any) {
            console.error('[NotificationService] Init error:', error?.message || error);
        } finally {
            initializationPromise = null;
        }
    })();

    await initializationPromise;
};

// Display a message notification (for chat messages)
export const showMessageNotification = async (
    senderName: string,
    messageBody: string,
    data?: { userId?: string; messageId?: string }
) => {
    if (Platform.OS !== 'android') return;

    try {
        await initializeNotifications();

        // Sanitize data
        const sanitizedData: Record<string, string> = {};
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    sanitizedData[key] = String(value);
                }
            });
        }

        await notifee.displayNotification({
            id: sanitizedData.messageId || Date.now().toString(),
            title: `💬 ${senderName}`,
            body: messageBody,
            android: {
                channelId: MESSAGE_CHANNEL_ID,
                importance: AndroidImportance.HIGH,
                smallIcon: 'ic_notification',
                color: '#22c55e', // Green for messages
                pressAction: {
                    id: 'open_chat',
                },
            },
            data: Object.keys(sanitizedData).length > 0 ? sanitizedData : undefined,
        });
    } catch (error: any) {
        console.error('[NotificationService] Message notification error:', error?.message || error);
    }
};

// Display a broadcast notification (for admin announcements)
export const showBroadcastNotification = async (
    title: string,
    message: string,
    data?: { id?: string; imageUrl?: string; link?: string; type?: string }
) => {
    if (Platform.OS !== 'android') return;

    try {
        await initializeNotifications();


        // Sanitize data - notifee requires all data values to be strings
        const sanitizedData: Record<string, string> = {};
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    sanitizedData[key] = String(value);
                }
            });
        }

        await notifee.displayNotification({
            id: sanitizedData.id || Date.now().toString(),
            title: `📢 ${title}`,
            body: message,
            android: {
                channelId: BROADCAST_CHANNEL_ID,
                importance: AndroidImportance.HIGH,
                smallIcon: 'ic_notification',
                color: '#f59e0b', // Orange for broadcasts
                pressAction: {
                    id: 'open_app',
                },
            },
            data: Object.keys(sanitizedData).length > 0 ? sanitizedData : undefined,
        });
    } catch (error: any) {
        console.error('[NotificationService] Broadcast notification error:', error?.message || error);
    }
};

// Legacy function for backwards compatibility
export const showGeneralNotification = showBroadcastNotification;

// For backwards compatibility
export const createNotificationChannel = initializeNotifications;

export default {
    initializeNotifications,
    showMessageNotification,
    showBroadcastNotification,
    showGeneralNotification,
    createNotificationChannel,
};
