import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Plus, Trash2, X, User } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';
import { trpcClient } from '@/lib/trpc';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBanner from '@/components/StatusBanner';

type PhotoCategory = 'front' | 'side' | 'back';

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  front: 'Vorne',
  side: 'Seite',
  back: 'Rücken',
};

export default function ProgressPhotosScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory>('front');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const data = await trpcClient.photos.list.query();
      setPhotos(data as any[]);
    } catch {}
    setLoading(false);
  };

  const uploadBase64 = async (base64: string) => {
    try {
      await trpcClient.photos.upload.mutate({
        imageData: base64,
        category: selectedCategory,
      });
      setStatusMessage({ type: 'success', text: 'Foto gespeichert!' });
      loadPhotos();
    } catch {
      setStatusMessage({ type: 'error', text: 'Fehler beim Hochladen.' });
    }
  };

  const handlePickPhoto = async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            await uploadBase64(base64);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } catch {
        setStatusMessage({ type: 'error', text: 'Dateiauswahl nicht verfuegbar.' });
      }
      return;
    }

    // Native: use expo-image-picker
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setStatusMessage({ type: 'error', text: 'Zugriff auf Fotobibliothek verweigert. Bitte in den Einstellungen erlauben.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        await uploadBase64(result.assets[0].base64);
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Kamera/Galerie nicht verfuegbar.' });
    }
  };

  const handleDelete = async () => {
    if (!deletePhotoId) return;
    try {
      await trpcClient.photos.delete.mutate({ id: deletePhotoId });
      setPhotos(photos.filter(p => p.id?.toString() !== deletePhotoId));
      setStatusMessage({ type: 'success', text: 'Foto gelöscht.' });
    } catch {}
    setShowDeleteConfirm(false);
    setDeletePhotoId(null);
  };

  const filteredPhotos = photos.filter(p => p.category === selectedCategory);

  const togglePhotoSelect = (id: string) => {
    if (selectedPhotos.includes(id)) {
      setSelectedPhotos(selectedPhotos.filter(p => p !== id));
    } else if (selectedPhotos.length < 2) {
      setSelectedPhotos([...selectedPhotos, id]);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Fortschrittsfotos' }} />
      <View style={styles.container}>
        {statusMessage && (
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
            <StatusBanner type={statusMessage.type} text={statusMessage.text} onDismiss={() => setStatusMessage(null)} />
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Category tabs */}
          <View style={styles.categoryRow}>
            {(['front', 'side', 'back'] as PhotoCategory[]).map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryTab, selectedCategory === cat && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryTabText, selectedCategory === cat && styles.categoryTabTextActive]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.addButton} onPress={handlePickPhoto}>
              <Camera size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Foto hinzufügen</Text>
            </TouchableOpacity>
            {filteredPhotos.length >= 2 && (
              <TouchableOpacity
                style={[styles.compareButton, compareMode && styles.compareButtonActive]}
                onPress={() => {
                  setCompareMode(!compareMode);
                  setSelectedPhotos([]);
                }}
              >
                <Text style={styles.compareButtonText}>
                  {compareMode ? 'Abbrechen' : 'Vergleichen'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {compareMode && selectedPhotos.length === 2 && (
            <View style={styles.comparisonContainer}>
              <Text style={styles.comparisonTitle}>Vorher / Nachher</Text>
              <View style={styles.comparisonRow}>
                {selectedPhotos.map((id, i) => {
                  const photo = photos.find(p => p.id?.toString() === id);
                  return (
                    <View key={id} style={styles.comparisonPhoto}>
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${photo?.image_data}` }}
                        style={styles.comparisonImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.comparisonDate}>
                        {new Date(photo?.created_at).toLocaleDateString('de-DE')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Photo grid */}
          {filteredPhotos.length === 0 ? (
            <View style={styles.emptyState}>
              <User size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Noch keine {CATEGORY_LABELS[selectedCategory]}-Fotos</Text>
              <Text style={styles.emptySubtext}>Dokumentiere deinen Fortschritt mit Fotos!</Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {filteredPhotos.map(photo => {
                const id = photo.id?.toString();
                const isSelected = selectedPhotos.includes(id);
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.photoCard, isSelected && styles.photoCardSelected]}
                    onPress={() => compareMode ? togglePhotoSelect(id) : null}
                    onLongPress={() => {
                      setDeletePhotoId(id);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${photo.image_data}` }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.photoDate}>
                      {new Date(photo.created_at).toLocaleDateString('de-DE')}
                    </Text>
                    {photo.notes && <Text style={styles.photoNotes}>{photo.notes}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        <ConfirmDialog
          visible={showDeleteConfirm}
          title="Foto löschen"
          message="Dieses Foto wirklich löschen?"
          confirmText="Löschen"
          cancelText="Abbrechen"
          destructive
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteConfirm(false); setDeletePhotoId(null); }}
        />
      </View>
    </>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  categoryRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 3, borderWidth: 1, borderColor: Colors.border },
  categoryTab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
  categoryTabActive: { backgroundColor: Colors.accent },
  categoryTabText: { fontSize: 14, fontWeight: '500' as const, color: Colors.textMuted },
  categoryTabTextActive: { color: '#FFFFFF', fontWeight: '600' as const },
  actionsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginTop: Spacing.md, gap: Spacing.sm },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.accent, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  compareButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.accent },
  compareButtonActive: { backgroundColor: Colors.accent },
  compareButtonText: { color: Colors.accent, fontSize: 14, fontWeight: '500' as const },
  comparisonContainer: { marginHorizontal: Spacing.lg, marginTop: Spacing.md },
  comparisonTitle: { fontSize: 16, fontWeight: '600' as const, color: Colors.text, marginBottom: Spacing.sm },
  comparisonRow: { flexDirection: 'row', gap: Spacing.sm },
  comparisonPhoto: { flex: 1 },
  comparisonImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: BorderRadius.md },
  comparisonDate: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
  emptyText: { fontSize: 16, fontWeight: '600' as const, color: Colors.textSecondary, marginTop: Spacing.md },
  emptySubtext: { fontSize: 14, color: Colors.textMuted, marginTop: Spacing.xs },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, marginTop: Spacing.md, gap: Spacing.sm },
  photoCard: { width: '48%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  photoCardSelected: { borderColor: Colors.accent, borderWidth: 2 },
  photoImage: { width: '100%', aspectRatio: 3 / 4 },
  photoDate: { fontSize: 12, color: Colors.textMuted, padding: Spacing.xs, textAlign: 'center' },
  photoNotes: { fontSize: 11, color: Colors.textSecondary, paddingHorizontal: Spacing.xs, paddingBottom: Spacing.xs },
});
