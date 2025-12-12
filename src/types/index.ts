// Navigation types
export type RootStackParamList = {
    Landing: undefined;
    MainLayout: undefined;
    MainTabs: undefined;
    SongDetail: { songId: string };
    AlbumDetail: { albumId: string };
    Admin: undefined;
    ManageSongs: undefined;
    UploadSong: undefined;
    ManageAlbums: undefined;
    ManageUsers: undefined;
    CreateAlbum: undefined;
    EditAlbum: { album: Album };
    EditSong: { song: Song };
};

export type MainTabParamList = {
    Home: undefined;
    Songs: undefined;
    Albums: undefined;
    Profile: undefined;
    Settings: undefined;
};

// Song model matching backend
export interface Song {
    _id: string;
    title: string;
    artist: string;
    albumIds?: string[];
    imageUrl: string;
    audioUrl: string;
    duration: number; // in seconds
    createdAt: string;
    updatedAt?: string;
    isLiked?: boolean;
}

// Album model matching backend
export interface Album {
    _id: string;
    title: string;
    artist: string;
    imageUrl: string;
    songs: Song[];
    releaseYear: number;
    createdAt?: string;
    updatedAt?: string;
}

// User settings matching backend
export interface UserSettings {
    playback: {
        shuffle: boolean;
        loop: boolean;
        volume: number;
        audioQuality: 'low' | 'normal' | 'high';
        crossfade: boolean;
        gaplessPlayback: boolean;
        normalizeVolume: boolean;
    };
    display: {
        theme: 'dark' | 'light' | 'system';
        accentColor: 'emerald' | 'green' | 'blue' | 'purple' | 'pink' | 'orange';
        compactMode: boolean;
        layout: 'default' | 'compact' | 'comfortable';
    };
    downloads: {
        downloadQuality: 'low' | 'normal' | 'high';
        downloadOverWifi: boolean;
        autoDownload: boolean;
    };
    privacy: {
        profileVisibility: 'public' | 'friends' | 'private';
        showListeningActivity: boolean;
        allowFriendRequests: boolean;
    };
    notifications: {
        emailNotifications: boolean;
        pushNotifications: boolean;
        newReleases: boolean;
        friendActivity: boolean;
    };
}

// User model matching backend
export interface User {
    _id: string;
    clerkId: string;
    name: string;
    fullName?: string;
    username?: string;
    emailAddress?: string;
    imageUrl?: string;
    image?: string;
    likedSongs: string[];
    lastSeen?: string;
    createdAt?: string;
    settings: UserSettings;
}

// AuthUser for auth store (simplified)
export interface AuthUser {
    id: string;
    clerkId: string;
    name?: string;
    fullName?: string;
    username?: string;
    emailAddress?: string;
    imageUrl?: string;
    createdAt?: string;
}

// Message model matching backend
export interface Message {
    _id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
}

// Stats response
export interface Stats {
    totalSongs: number;
    totalAlbums: number;
    totalUsers: number;
    uniqueArtists: number;
    totalArtists?: number;
}

// API Response types
export interface ApiError {
    message: string;
    status?: number;
}
