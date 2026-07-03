/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ActivityType = 'kegel' | 'meditation';

export interface UserConfig {
  wakeTime: string; // "07:30"
  sleepTime: string; // "22:30"
  kegelCount: number; // e.g., 10
  kegelDuration: number; // 2 or 3
  meditationCount: number; // e.g., 2
  meditationDuration: number; // 5
  soundEnabled: boolean;
  systemNotificationsEnabled: boolean;
  upcomingAlertsEnabled: boolean; // Option to warn or notify about upcoming events
}

export interface ScheduledNotification {
  id: string;
  time: string; // "HH:MM"
  timestamp: number; // Epoch timestamp for the trigger time
  type: ActivityType;
  durationMinutes: number;
  status: 'pending' | 'triggered' | 'completed' | 'missed';
  title: string;
  message: string;
}

export interface ActivityLog {
  id: string;
  timestamp: number; // Date.now()
  type: ActivityType;
  durationMinutes: number;
  completed: boolean;
}

export interface KegelStep {
  title: string;
  description: string;
  durationSeconds: number;
  instruction: string;
  focusArea: string;
}
