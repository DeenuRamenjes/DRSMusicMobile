import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { useMusicStore } from '../store/useMusicStore';
import axiosInstance from '../api/axios';
import { CustomDialog, useDialog } from '../components/CustomDialog';

interface NewAlbum {
  title: string;
  artist: string;
  releaseYear: string;
}

export const CreateAlbumScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors } = useThemeStore();
  const { fetchAlbums } = useMusicStore();
  const { dialogState, hideDialog, showSuccess, showError } = useDialog();
  
  const [isLoading, setIsLoading] = useState(false);
  const [newAlbum, setNewAlbum] = useState<NewAlbum>({
    title: '',
    artist: '',
    releaseYear: new Date().getFullYear().toString(),
  });
  
  const [imageFile, setImageFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const selectImageFile = async () => {
    try {
      const result = await pick({
        type: [types.images],
      });
      
      if (result && result.length > 0) {
        const file = result[0];
        setImageFile({
          uri: file.uri,
          name: file.name || 'image.jpg',
          type: file.type || 'image/jpeg',
        });
        setImagePreview(file.uri);
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.error('Error picking image:', err);
        showError('Error', 'Failed to select image file');
      }
    }
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      showError('Error', 'Please select a cover image');
      return;
    }
    if (!newAlbum.title.trim()) {
      showError('Error', 'Please enter an album title');
      return;
    }
    if (!newAlbum.artist.trim()) {
      showError('Error', 'Please enter an artist name');
      return;
    }
    if (!newAlbum.releaseYear.trim()) {
      showError('Error', 'Please enter a release year');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', newAlbum.title);
      formData.append('artist', newAlbum.artist);
      formData.append('releaseYear', newAlbum.releaseYear);
      
      formData.append('imageFile', {
        uri: imageFile.uri,
        name: imageFile.name,
        type: imageFile.type,
      } as any);

      await axiosInstance.post('/admin/albums', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      fetchAlbums();
      showSuccess('Success', 'Album created successfully', () => navigation.goBack());
    } catch (error: any) {
      console.error('Error creating album:', error);
      showError('Error', error.response?.data?.message || 'Failed to create album');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Album</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Upload */}
        <Text style={styles.sectionTitle}>Cover Art</Text>
        <TouchableOpacity 
          style={styles.imageUploadContainer}
          onPress={selectImageFile}
        >
          {imagePreview ? (
            <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image" size={32} color={COLORS.textMuted} />
              <Text style={styles.uploadText}>Tap to select image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title Input */}
        <Text style={styles.sectionTitle}>Album Title</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Album title"
          placeholderTextColor={COLORS.textMuted}
          value={newAlbum.title}
          onChangeText={(text) => setNewAlbum(prev => ({ ...prev, title: text }))}
        />

        {/* Artist Input */}
        <Text style={styles.sectionTitle}>Artist</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Artist name"
          placeholderTextColor={COLORS.textMuted}
          value={newAlbum.artist}
          onChangeText={(text) => setNewAlbum(prev => ({ ...prev, artist: text }))}
        />

        {/* Release Year Input */}
        <Text style={styles.sectionTitle}>Release Year</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Release year"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={newAlbum.releaseYear}
          onChangeText={(text) => setNewAlbum(prev => ({ ...prev, releaseYear: text }))}
          maxLength={4}
        />

        {/* Info Box */}
        <View style={[styles.infoBox, { borderColor: themeColors.primaryMuted }]}>
          <Icon name="info" size={16} color={themeColors.primary} />
          <Text style={styles.infoText}>
            After creating the album, you can add songs to it from the Manage Songs section.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: themeColors.primary },
            isLoading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.textPrimary} />
          ) : (
            <>
              <Icon name="plus-circle" size={20} color={COLORS.textPrimary} />
              <Text style={styles.submitButtonText}>Create Album</Text>
            </>
          )}
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  imageUploadContainer: {
    width: '100%',
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.zinc800,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.zinc700,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default CreateAlbumScreen;
