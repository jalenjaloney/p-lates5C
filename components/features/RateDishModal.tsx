import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Alert, ScrollView, Image, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/tokens';
import { Button } from '../primitives/Button';
import RatingStars from '../rating-stars';
import { supabase, hasSupabaseConfig } from '@/src/supabaseClient';
import { UserAuth } from '@/src/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

type RateDishModalProps = {
  visible: boolean;
  onClose: () => void;
  dishId?: number;
  dishName?: string;
};

export function RateDishModal({ visible, onClose, dishId, dishName }: RateDishModalProps) {
  const { colors } = useTheme();
  const { session } = UserAuth();
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
  const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

  const validateAsset = (asset: ImagePicker.ImagePickerAsset) => {
    const mimeType = asset.mimeType || '';
    const fileName = asset.fileName || '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (mimeType && !ALLOWED_MIME.includes(mimeType)) {
      return `Unsupported file type: ${mimeType}`;
    }
    if (ext && !ALLOWED_EXT.includes(ext)) {
      return `Unsupported file extension: .${ext}`;
    }
    if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_IMAGE_BYTES) {
      return 'Image is too large. Please choose a file under 5MB.';
    }
    return null;
  };

  const pickImage = async (source: 'library' | 'camera') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        source === 'camera'
          ? 'Please allow access to your camera.'
          : 'Please allow access to your photo library.'
      );
      return;
    }
    const pickerFn =
      source === 'camera'
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;
    const result = await pickerFn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    const validationError = validateAsset(asset);
    if (validationError) {
      setErrorText(validationError);
      return;
    }
    setImageUri(asset.uri);
    setImageMimeType(asset.mimeType || null);
    setImageUrl('');
  };

  const removeImage = () => {
    setImageUri(null);
    setImageMimeType(null);
  };

  const uploadImageIfNeeded = async () => {
    if (!imageUri || !dishId || !session?.user?.id) return null;
    if (!supabase) return null;
    setUploading(true);
    try {
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const filePath = `${dishId}/${session.user.id}/${Date.now()}.${fileExt}`;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const { error } = await supabase.storage
        .from('review-images')
        .upload(filePath, blob, {
          contentType: imageMimeType || blob.type || 'image/jpeg',
          upsert: false,
        });
      if (error) throw error;
      const { data } = supabase.storage.from('review-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error('Failed to upload image', err);
      setErrorText('Failed to upload image.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setErrorText('');
    setStatusText('');
    if (!session?.user?.id) {
      setErrorText('You must be signed in to rate dishes.');
      return;
    }

    if (!dishId) {
      setErrorText('No dish selected.');
      return;
    }

    if (!hasSupabaseConfig || !supabase) {
      setErrorText('Supabase not configured.');
      return;
    }

    setSubmitting(true);

    try {
      const uploadedUrl = imageUri ? await uploadImageIfNeeded() : null;
      const clampedRating = Math.max(0.5, Math.min(5, rating));
      const { error } = await supabase.from('dish_ratings').upsert(
        {
          user_id: session.user.id,
          dish_id: dishId,
          rating: clampedRating,
          comment: comment.trim() || null,
          image_url: uploadedUrl || imageUrl.trim() || null,
          rater_handle: session.user.user_metadata?.handle || null,
        },
        { onConflict: 'dish_id,user_id' }
      );

      if (error) {
        setErrorText(error.message || 'Failed to submit rating.');
        return;
      }

      setStatusText('Your rating has been submitted!');
      setRating(3);
      setComment('');
      setImageUrl('');
      setImageUri(null);
      onClose();
    } catch (err) {
      console.error('Failed to submit rating', err);
      setErrorText(err instanceof Error ? err.message : 'Failed to submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.title, { color: colors.ink, fontFamily: tokens.font.display }]}>
              Rate a Dish
            </Text>

            {dishName && (
              <Text style={[styles.dishName, { color: colors.inkSoft, fontFamily: tokens.font.bodySemibold }]}>
                {dishName}
              </Text>
            )}

            <View style={styles.ratingSection}>
              <Text style={[styles.label, { color: colors.ink, fontFamily: tokens.font.body }]}>
                Your Rating
              </Text>
              <View style={styles.starsContainer}>
                <RatingStars rating={rating} onRatingChange={setRating} interactive />
              </View>
            </View>

            <View style={styles.commentSection}>
              <Text style={[styles.label, { color: colors.ink, fontFamily: tokens.font.body }]}>
                Comment (optional)
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Share your thoughts..."
                placeholderTextColor={colors.inkMuted}
                multiline
                maxLength={280}
                style={[
                  styles.commentInput,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                    color: colors.ink,
                    fontFamily: tokens.font.body,
                  },
                ]}
              />
              <Text style={[styles.charCount, { color: colors.inkMuted, fontFamily: tokens.font.mono }]}>
                {comment.length}/280
              </Text>
            </View>

            <View style={styles.commentSection}>
              <Text style={[styles.label, { color: colors.ink, fontFamily: tokens.font.body }]}>
                Photo (optional)
              </Text>
              <TextInput
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="Paste an image URL..."
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!imageUri}
                style={[
                  styles.commentInput,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                    color: colors.ink,
                    fontFamily: tokens.font.body,
                    opacity: imageUri ? 0.6 : 1,
                  },
                ]}
              />
              <View style={styles.photoActions}>
                <Button
                  label="Choose Photo"
                  onPress={() => pickImage('library')}
                  variant="ghost"
                  fullWidth
                  disabled={uploading || submitting}
                />
                <Button
                  label="Take Photo"
                  onPress={() => pickImage('camera')}
                  variant="ghost"
                  fullWidth
                  disabled={uploading || submitting || Platform.OS === 'web'}
                />
              </View>
              {imageUri ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: imageUri }} style={styles.preview} />
                  <View style={styles.previewActions}>
                    <Button
                      label="Replace"
                      onPress={() => pickImage('library')}
                      variant="ghost"
                      fullWidth
                      disabled={uploading || submitting}
                    />
                    <Button
                      label="Remove"
                      onPress={removeImage}
                      variant="ghost"
                      fullWidth
                      disabled={uploading || submitting}
                    />
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.actions}>
              <Button
                label="Submit Rating"
                onPress={handleSubmit}
                variant="primary"
                loading={submitting}
                disabled={submitting || uploading}
                fullWidth
              />
              <Button label="Cancel" onPress={onClose} variant="ghost" fullWidth />
            </View>

            {statusText ? (
              <Text style={[styles.statusText, { color: colors.accent, fontFamily: tokens.font.body }]}>
                {statusText}
              </Text>
            ) : null}
            {errorText ? (
              <Text style={[styles.errorText, { color: colors.error, fontFamily: tokens.font.body }]}>
                {errorText}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: tokens.space.md,
  },
  container: {
    borderRadius: tokens.radius.xxl,
    maxHeight: '80%',
  },
  content: {
    padding: tokens.space.lg,
    gap: tokens.space.lg,
  },
  title: {
    fontSize: tokens.fontSize.h1,
    fontWeight: '700',
  },
  dishName: {
    fontSize: tokens.fontSize.body,
  },
  ratingSection: {
    gap: tokens.space.sm,
  },
  label: {
    fontSize: tokens.fontSize.body,
    fontWeight: '600',
  },
  starsContainer: {
    alignItems: 'flex-start',
  },
  commentSection: {
    gap: tokens.space.sm,
  },
  photoActions: {
    gap: tokens.space.xs,
  },
  previewWrap: {
    gap: tokens.space.xs,
  },
  commentInput: {
    minHeight: 100,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    padding: tokens.space.md,
    fontSize: tokens.fontSize.body,
    textAlignVertical: 'top',
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: tokens.radius.lg,
    marginTop: tokens.space.sm,
  },
  previewActions: {
    flexDirection: 'row',
    gap: tokens.space.xs,
  },
  charCount: {
    fontSize: tokens.fontSize.tiny,
    textAlign: 'right',
  },
  actions: {
    gap: tokens.space.sm,
  },
  statusText: {
    fontSize: tokens.fontSize.caption,
    textAlign: 'center',
  },
  errorText: {
    fontSize: tokens.fontSize.caption,
    textAlign: 'center',
  },
});
