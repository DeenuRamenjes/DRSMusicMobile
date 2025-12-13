import { create } from 'zustand';
import axiosInstance from '../api/axios';
import { Song, Album, Stats } from '../types';

// Helper functions matching web app
const applyLikesToSongs = (songs: Song[], likedSet: Set<string>): Song[] =>
    songs.map((song) => ({ ...song, isLiked: likedSet.has(song._id) }));

const applyLikesToAlbum = (album: Album | null, likedSet: Set<string>): Album | null => {
    if (!album) return null;
    return {
        ...album,
        songs: applyLikesToSongs(album.songs, likedSet),
    };
};

const normalizeAlbumIds = (albumIds?: unknown): string[] => {
    if (!albumIds) return [];
    if (Array.isArray(albumIds)) {
        return albumIds
            .map((id) => {
                if (!id) return null;
                if (typeof id === "string") return id;
                if (typeof id === "object") {
                    if ("_id" in (id as { _id?: string })) {
                        return (id as { _id?: string })._id ?? null;
                    }
                    if (typeof (id as { toString?: () => string }).toString === "function") {
                        return (id as { toString: () => string }).toString();
                    }
                    return null;
                }
                return String(id);
            })
            .filter((id): id is string => Boolean(id));
    }

    if (typeof albumIds === "string") {
        return [albumIds];
    }
    return [];
};

const withNormalizedAlbums = (songs: Song[]): Song[] =>
    songs.map((song) => ({
        ...song,
        albumIds: normalizeAlbumIds((song as any).albumIds),
    }));

interface MusicState {
    // Songs
    songs: Song[];
    featuredSongs: Song[];
    madeForYouSongs: Song[];
    trendingSongs: Song[];
    likedSongs: Song[];
    currentSong: Song | null;

    // Albums
    albums: Album[];
    currentAlbum: Album | null;
    pendingAlbumId: string | null; // For navigating to specific album from sidebar

    // Stats
    stats: Stats;

    // Loading states
    isLoading: boolean;
    error: string | null;
    likedSongsLoading: boolean;
    likedSongsInitialized: boolean;

    // Song Actions
    fetchSongs: () => Promise<void>;
    fetchFeaturedSongs: () => Promise<void>;
    fetchMadeForYouSongs: () => Promise<void>;
    fetchTrendingSongs: () => Promise<void>;
    fetchSongById: (id: string) => Promise<Song | null>;
    searchSongs: (query: string) => Promise<Song[]>;
    deleteSong: (id: string) => Promise<void>;
    updateSong: (id: string, formData: FormData) => Promise<void>;

    // Album Actions
    fetchAlbums: () => Promise<void>;
    fetchAlbumById: (id: string) => Promise<Album | null>;
    deleteAlbum: (id: string) => Promise<void>;
    updateAlbum: (id: string, formData: FormData) => Promise<void>;
    assignSongsToAlbum: (albumId: string, songIds: string[]) => Promise<void>;
    setPendingAlbumId: (id: string | null) => void;
    clearPendingAlbumId: () => void;

    // Stats Actions
    fetchStats: () => Promise<void>;

    // Liked Songs Actions
    fetchLikedSongs: () => Promise<void>;
    likeSong: (songId: string) => Promise<void>;
    unlikeSong: (songId: string) => Promise<void>;
    isLiked: (songId: string) => boolean;

    // Utilities
    setError: (error: string | null) => void;
    clearError: () => void;
}

export const useMusicStore = create<MusicState>((set, get) => ({
    // Initial state
    songs: [],
    featuredSongs: [],
    madeForYouSongs: [],
    trendingSongs: [],
    likedSongs: [],
    currentSong: null,
    albums: [],
    currentAlbum: null,
    pendingAlbumId: null,
    stats: {
        totalSongs: 0,
        totalAlbums: 0,
        totalUsers: 0,
        uniqueArtists: 0,
    },
    isLoading: false,
    error: null,
    likedSongsLoading: false,
    likedSongsInitialized: false,

    // Fetch all songs - GET /api/songs
    fetchSongs: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await axiosInstance.get<Song[]>('/songs');
            const likedSet = new Set(get().likedSongs.map((song) => song._id));
            const normalized = withNormalizedAlbums(data);
            set({ songs: applyLikesToSongs(normalized, likedSet), isLoading: false });
        } catch (error: any) {
            console.error('Error fetching songs:', error);
            set({
                error: error.response?.data?.message || 'Failed to fetch songs',
                isLoading: false
            });
        }
    },

    // Fetch featured songs - GET /api/songs/featured
    // Note: Does not set isLoading to avoid race conditions when called in parallel
    fetchFeaturedSongs: async () => {
        try {
            const { data } = await axiosInstance.get<Song[]>('/songs/featured');
            const likedSet = new Set(get().likedSongs.map((song) => song._id));
            set({ featuredSongs: applyLikesToSongs(data, likedSet) });
        } catch (error: any) {
            console.error('Error fetching featured songs:', error);
            // Don't set global error for individual section failures
        }
    },

    // Fetch made for you songs - GET /api/songs/made-for-you
    // Note: Does not set isLoading to avoid race conditions when called in parallel
    fetchMadeForYouSongs: async () => {
        try {
            const { data } = await axiosInstance.get<Song[]>('/songs/made-for-you');
            const likedSet = new Set(get().likedSongs.map((song) => song._id));
            set({ madeForYouSongs: applyLikesToSongs(data, likedSet) });
        } catch (error: any) {
            console.error('Error fetching made for you songs:', error);
            // Don't set global error for individual section failures
        }
    },

    // Fetch trending songs - GET /api/songs/trending
    // Note: Does not set isLoading to avoid race conditions when called in parallel
    fetchTrendingSongs: async () => {
        try {
            const { data } = await axiosInstance.get<Song[]>('/songs/trending');
            const likedSet = new Set(get().likedSongs.map((song) => song._id));
            set({ trendingSongs: applyLikesToSongs(data, likedSet) });
        } catch (error: any) {
            console.error('Error fetching trending songs:', error);
            // Don't set global error for individual section failures
        }
    },

    // Fetch song by ID - GET /api/songs/:id
    fetchSongById: async (id: string) => {
        set({ isLoading: true });
        try {
            const { data } = await axiosInstance.get<Song>(`/songs/${id}`);
            const likedSet = new Set(get().likedSongs.map((song) => song._id));
            const songWithLike = { ...data, isLiked: likedSet.has(data._id) };
            set({ currentSong: songWithLike, isLoading: false });
            return songWithLike;
        } catch (error: any) {
            console.error('Error fetching song:', error);
            set({ isLoading: false });
            return null;
        }
    },

    // Search songs - GET /api/songs/search?q=query
    searchSongs: async (query: string) => {
        try {
            const response = await axiosInstance.get(`/songs/search?q=${encodeURIComponent(query)}`);
            const likedSet = new Set(get().likedSongs.map((song) => song._id));
            return applyLikesToSongs(response.data, likedSet);
        } catch (error: any) {
            console.error('Error searching songs:', error);
            return [];
        }
    },

    // Delete song - DELETE /api/admin/songs/:id
    deleteSong: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            await axiosInstance.delete(`/admin/songs/${id}`);
            set((state) => ({
                songs: state.songs.filter((song) => song._id !== id),
                isLoading: false,
            }));
        } catch (error: any) {
            console.error('Error deleting song:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    // Update song - PUT /api/admin/songs/:id
    updateSong: async (id: string, formData: FormData) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await axiosInstance.put(`/admin/songs/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const updatedSong = data.song as Song;
            const likedSet = new Set(get().likedSongs.map((song) => song._id));
            const songWithLike = {
                ...updatedSong,
                albumIds: normalizeAlbumIds((updatedSong as any).albumIds),
                isLiked: likedSet.has(updatedSong._id),
            };

            set((state) => {
                const updatedAlbums = state.albums.map((album) => {
                    let songsChanged = false;
                    let updatedAlbumSongs = album.songs;
                    const containsSong = album.songs.some((song) => song._id === id);
                    const shouldContain = songWithLike.albumIds?.includes(album._id) ?? false;

                    if (containsSong && !shouldContain) {
                        updatedAlbumSongs = album.songs.filter((song) => song._id !== id);
                        songsChanged = true;
                    }

                    if (!containsSong && shouldContain) {
                        updatedAlbumSongs = [...album.songs, songWithLike];
                        songsChanged = true;
                    }

                    if (containsSong && shouldContain) {
                        updatedAlbumSongs = album.songs.map((song) =>
                            song._id === id ? songWithLike : song
                        );
                        songsChanged = true;
                    }

                    return songsChanged ? { ...album, songs: updatedAlbumSongs } : album;
                });

                return {
                    songs: state.songs.map((song) => (song._id === id ? songWithLike : song)),
                    albums: updatedAlbums,
                    isLoading: false,
                };
            });
        } catch (error: any) {
            console.error('Failed to update song', error);
            set({ isLoading: false });
            throw error;
        }
    },

    // Fetch all albums - GET /api/album
    fetchAlbums: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.get('/album');
            set({ albums: response.data, isLoading: false, error: null });
        } catch (error: any) {
            console.error('Error fetching albums:', error);
            set({
                error: error.response?.data?.message || 'Failed to fetch albums',
                isLoading: false
            });
        }
    },

    // Fetch album by ID - GET /api/album/:id
    fetchAlbumById: async (id: string) => {
        set({ isLoading: true });
        try {
            const { data } = await axiosInstance.get<Album>(`/album/${id}`);
            const likedSet = new Set(get().likedSongs.map((song) => song._id));
            const albumWithLikes = { ...data, songs: applyLikesToSongs(data.songs, likedSet) };
            set({ currentAlbum: albumWithLikes, isLoading: false });
            return albumWithLikes;
        } catch (error: any) {
            console.error('Error fetching album:', error);
            set({
                isLoading: false,
                error: error.response?.data?.message || 'Failed to fetch album'
            });
            return null;
        }
    },

    // Delete album - DELETE /api/admin/albums/:id
    deleteAlbum: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            await axiosInstance.delete(`/admin/albums/${id}`);
            set((state) => ({
                albums: state.albums.filter((album) => album._id !== id),
                songs: state.songs.map((song) => {
                    if (!song.albumIds?.length) return song;
                    const filtered = song.albumIds.filter((albumId) => albumId !== id);
                    if (filtered.length === song.albumIds.length) return song;
                    return { ...song, albumIds: filtered };
                }),
                isLoading: false,
            }));
        } catch (error: any) {
            console.error('Error deleting album:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    // Update album - PUT /api/admin/albums/:id
    updateAlbum: async (id: string, formData: FormData) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await axiosInstance.put(`/admin/albums/${id}`, formData);
            const updatedAlbum = data.album as Album;
            set((state) => ({
                albums: state.albums.map((album) => (album._id === id ? { ...album, ...updatedAlbum } : album)),
                isLoading: false,
            }));
        } catch (error: any) {
            console.error('Failed to update album', error);
            set({ isLoading: false });
            throw error;
        }
    },

    // Assign songs to album - POST /api/admin/albums/:id/songs
    assignSongsToAlbum: async (albumId: string, songIds: string[]) => {
        if (!songIds.length) {
            throw new Error('Please select at least one song');
        }
        set({ isLoading: true, error: null });

        try {
            const { data } = await axiosInstance.post(`/admin/albums/${albumId}/songs`, {
                songIds,
            });
            const updatedAlbum = data.album;
            const updatedSongIdSet = new Set(songIds);
            set((state) => ({
                albums: state.albums.map((album) =>
                    album._id === albumId ? { ...album, ...updatedAlbum } : album
                ),
                songs: state.songs.map((song) => {
                    if (!updatedSongIdSet.has(song._id)) return song;
                    const albumIdsSet = new Set(song.albumIds ?? []);
                    albumIdsSet.add(albumId);
                    return { ...song, albumIds: Array.from(albumIdsSet) };
                }),
                isLoading: false,
            }));
        } catch (error: any) {
            console.error('Failed to assign songs:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    // Fetch stats - GET /api/stats
    fetchStats: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.get('/stats');
            set({ stats: response.data, isLoading: false });
        } catch (error: any) {
            console.error('Error fetching stats:', error);
            set({ error: 'Failed to fetch stats', isLoading: false });
        }
    },

    // Fetch liked songs - GET /api/users/me/likes
    fetchLikedSongs: async () => {
        set({ likedSongsLoading: true });
        try {
            const { data } = await axiosInstance.get<Song[]>('/users/me/likes');
            const likedSet = new Set(data.map((song) => song._id));
            set((state) => ({
                likedSongsLoading: false,
                likedSongsInitialized: true,
                likedSongs: data,
                madeForYouSongs: applyLikesToSongs(state.madeForYouSongs, likedSet),
                featuredSongs: applyLikesToSongs(state.featuredSongs, likedSet),
                trendingSongs: applyLikesToSongs(state.trendingSongs, likedSet),
                songs: applyLikesToSongs(state.songs, likedSet),
                currentAlbum: applyLikesToAlbum(state.currentAlbum, likedSet),
            }));
        } catch (error: any) {
            console.error('Error fetching liked songs', error);
            set({ likedSongsLoading: false, likedSongsInitialized: true, likedSongs: [] });
        }
    },

    // Like a song - POST /api/users/me/likes/:songId
    likeSong: async (songId: string) => {
        try {
            const { data } = await axiosInstance.post<Song[]>(`/users/me/likes/${songId}`);
            const likedSet = new Set(data.map((song) => song._id));
            set((state) => ({
                likedSongsInitialized: true,
                likedSongs: data,
                madeForYouSongs: applyLikesToSongs(state.madeForYouSongs, likedSet),
                featuredSongs: applyLikesToSongs(state.featuredSongs, likedSet),
                trendingSongs: applyLikesToSongs(state.trendingSongs, likedSet),
                songs: applyLikesToSongs(state.songs, likedSet),
                currentAlbum: applyLikesToAlbum(state.currentAlbum, likedSet),
            }));
        } catch (error: any) {
            console.error('Error liking song', error);
            throw error;
        }
    },

    // Unlike a song - DELETE /api/users/me/likes/:songId
    unlikeSong: async (songId: string) => {
        try {
            const { data } = await axiosInstance.delete<Song[]>(`/users/me/likes/${songId}`);
            const likedSet = new Set(data.map((song) => song._id));
            set((state) => ({
                likedSongsInitialized: true,
                likedSongs: data,
                madeForYouSongs: applyLikesToSongs(state.madeForYouSongs, likedSet),
                featuredSongs: applyLikesToSongs(state.featuredSongs, likedSet),
                trendingSongs: applyLikesToSongs(state.trendingSongs, likedSet),
                songs: applyLikesToSongs(state.songs, likedSet),
                currentAlbum: applyLikesToAlbum(state.currentAlbum, likedSet),
            }));
        } catch (error: any) {
            console.error('Error unliking song', error);
            throw error;
        }
    },

    // Check if song is liked
    isLiked: (songId: string) => {
        return get().likedSongs.some((song) => song._id === songId);
    },

    // Set error
    setError: (error: string | null) => set({ error }),

    // Clear error
    clearError: () => set({ error: null }),

    // Set pending album ID for navigation
    setPendingAlbumId: (id: string | null) => set({ pendingAlbumId: id }),

    // Clear pending album ID
    clearPendingAlbumId: () => set({ pendingAlbumId: null }),
}));
