import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { openExternalUrl } from '@/lib/open-url';
import { Play, ExternalLink, WifiOff } from 'lucide-react-native';
import { Spacing, BorderRadius } from '@/constants/colors';
import { useColors } from '@/hooks/use-colors';

interface YouTubePlayerProps {
  videoUrl: string;
  autoPlay?: boolean;
}

/**
 * Extract YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYouTubeThumbnail(videoUrl: string): string | null {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoUrl,
  autoPlay = false,
}) => {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [showPlayer, setShowPlayer] = useState(autoPlay);
  const [loadError, setLoadError] = useState(false);

  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    return (
      <TouchableOpacity
        style={styles.fallbackButton}
        onPress={() => { openExternalUrl(videoUrl); }}
      >
        <ExternalLink size={18} color={Colors.text} />
        <Text style={styles.fallbackText}>Video extern öffnen</Text>
      </TouchableOpacity>
    );
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`;

  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <WifiOff size={24} color={Colors.textMuted} />
        <Text style={styles.errorText}>Video nicht verfügbar</Text>
        <TouchableOpacity
          style={styles.errorRetry}
          onPress={() => { setLoadError(false); setShowPlayer(false); }}
        >
          <Text style={styles.errorRetryText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Web: render iframe
  if (Platform.OS === 'web' && showPlayer) {
    return (
      <View style={styles.playerContainer}>
        <iframe
          src={embedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 8,
          }}
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
          onError={() => setLoadError(true)}
        />
      </View>
    );
  }

  // Thumbnail with play button (web before play, native always)
  return (
    <TouchableOpacity
      style={styles.thumbnailContainer}
      onPress={() => {
        if (Platform.OS === 'web') {
          setShowPlayer(true);
        } else {
          openExternalUrl(videoUrl);
        }
      }}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: thumbnailUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
        onError={() => setLoadError(true)}
      />
      <View style={styles.playOverlay}>
        <View style={styles.playButton}>
          <Play size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
        </View>
      </View>
      {Platform.OS !== 'web' && (
        <View style={styles.externalBadge}>
          <ExternalLink size={12} color={Colors.text} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (Colors: any) => StyleSheet.create({
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: Spacing.md,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  externalBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  fallbackText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500' as const,
    marginLeft: Spacing.sm,
  },
  errorContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  errorRetry: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  errorRetryText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
