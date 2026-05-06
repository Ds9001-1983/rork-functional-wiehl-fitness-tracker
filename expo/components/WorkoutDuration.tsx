import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';

interface Props {
  startDate: string;
  style?: TextStyle | TextStyle[];
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Eigener Component damit der 1s-Tick nur dieses <Text> re-rendert,
// nicht den ganzen ActiveWorkoutScreen mit allen Sätzen + Timer-Animation.
export function WorkoutDuration({ startDate, style }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const seconds = Math.floor((now - new Date(startDate).getTime()) / 1000);
  return <Text style={style}>{formatDuration(seconds)}</Text>;
}
