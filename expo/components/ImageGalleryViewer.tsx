import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Text,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/colors';

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function toUri(image: string): string {
  return image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
}

export default function ImageGalleryViewer({ visible, images, initialIndex = 0, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<string>>(null);

  const safeImages = images.filter(Boolean);
  if (safeImages.length === 0) return null;
  const startIndex = Math.min(Math.max(initialIndex, 0), safeImages.length - 1);

  const onScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== currentIndex) setCurrentIndex(idx);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      {Platform.OS !== 'web' && <StatusBar barStyle="light-content" backgroundColor="#000" />}
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <FlatList
          ref={listRef}
          data={safeImages}
          keyExtractor={(_, i) => `gallery-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          onMomentumScrollEnd={onScrollEnd}
          onLayout={() => {
            if (startIndex > 0 && listRef.current) {
              listRef.current.scrollToIndex({ index: startIndex, animated: false });
            }
          }}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image
                source={{ uri: toUri(item) }}
                style={styles.image}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          )}
        />

        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={12}
          accessibilityLabel="Galerie schließen"
        >
          <X size={28} color={Colors.text} />
        </TouchableOpacity>

        {safeImages.length > 1 && (
          <View style={styles.indicatorWrap}>
            <Text style={styles.indicatorText}>
              {currentIndex + 1} / {safeImages.length}
            </Text>
            <View style={styles.dots}>
              {safeImages.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === currentIndex && styles.dotActive]}
                />
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorWrap: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  indicatorText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 12,
  },
});
