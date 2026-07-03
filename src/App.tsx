/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PhoneContainer } from './components/PhoneContainer';
import { Dashboard } from './components/Dashboard';
import { HistoryList } from './components/HistoryList';
import { Settings } from './components/Settings';
import { ActiveSession } from './components/ActiveSession';
import { generateDailySchedule } from './utils/scheduler';
import { UserConfig, ScheduledNotification, ActivityLog, ActivityType } from './types';
import { Home, Calendar, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

const DEFAULT_CONFIG: UserConfig = {
  wakeTime: '08:00',
  sleepTime: '22:00',
  kegelCount: 10,
  kegelDuration: 2,
  meditationCount: 2,
  meditationDuration: 5,
  soundEnabled: true,
  systemNotificationsEnabled: false,
  upcomingAlertsEnabled: true
};

export default function App() {
  const [config, setConfig] = useState<UserConfig>(DEFAULT_CONFIG);
  const [schedule, setSchedule] = useState<ScheduledNotification[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [activeSession, setActiveSession] = useState<{ type: ActivityType; durationMinutes: number } | null>(null);

  // Initialize data from LocalStorage
  useEffect(() => {
    // 1. Config
    const savedConfig = localStorage.getItem('kegel_user_config');
    let currentConfig = DEFAULT_CONFIG;
    if (savedConfig) {
      try {
        currentConfig = JSON.parse(savedConfig);
        setConfig(currentConfig);
      } catch (e) {
        console.error('Error parsing config', e);
      }
    }

    // 2. Logs
    const savedLogs = localStorage.getItem('kegel_activity_logs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error('Error parsing logs', e);
      }
    }

    // 3. Schedule for today
    const savedSchedule = localStorage.getItem('kegel_daily_schedule');
    const savedScheduleDate = localStorage.getItem('kegel_schedule_date');
    const todayString = new Date().toDateString();

    if (savedSchedule && savedScheduleDate === todayString) {
      try {
        setSchedule(JSON.parse(savedSchedule));
      } catch (e) {
        console.error('Error parsing schedule', e);
        // Fallback
        const newSched = generateDailySchedule(currentConfig);
        setSchedule(newSched);
        localStorage.setItem('kegel_daily_schedule', JSON.stringify(newSched));
        localStorage.setItem('kegel_schedule_date', todayString);
      }
    } else {
      // Generate a fresh schedule for today
      const newSched = generateDailySchedule(currentConfig);
      setSchedule(newSched);
      localStorage.setItem('kegel_daily_schedule', JSON.stringify(newSched));
      localStorage.setItem('kegel_schedule_date', todayString);
    }
  }, []);

  // Save Config and regenerate schedule
  const handleSaveConfig = (newConfig: UserConfig) => {
    setConfig(newConfig);
    localStorage.setItem('kegel_user_config', JSON.stringify(newConfig));

    // After updating config, let's regenerate the schedule to match new wake/sleep parameters or notification counts!
    const newSched = generateDailySchedule(newConfig);
    setSchedule(newSched);
    localStorage.setItem('kegel_daily_schedule', JSON.stringify(newSched));
    localStorage.setItem('kegel_schedule_date', new Date().toDateString());
  };

  // Re-generate schedule manually
  const handleRegenerateSchedule = () => {
    const newSched = generateDailySchedule(config);
    setSchedule(newSched);
    localStorage.setItem('kegel_daily_schedule', JSON.stringify(newSched));
    localStorage.setItem('kegel_schedule_date', new Date().toDateString());
  };

  // Trigger an active exercise session
  const handleStartSession = (type: ActivityType, durationMinutes: number) => {
    setActiveSession({ type, durationMinutes });
  };

  // Handle completed session
  const handleCloseSession = (completed: boolean) => {
    if (completed && activeSession) {
      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        type: activeSession.type,
        durationMinutes: activeSession.durationMinutes,
        completed: true
      };

      const updatedLogs = [...logs, newLog];
      setLogs(updatedLogs);
      localStorage.setItem('kegel_activity_logs', JSON.stringify(updatedLogs));

      // Check if this matched any of today's pending scheduled alerts in the schedule
      // We look for a pending notification of the same type that was scheduled around now
      const now = Date.now();
      const matchIndex = schedule.findIndex(
        item => item.type === activeSession.type && 
        item.status === 'pending' && 
        Math.abs(item.timestamp - now) < 60 * 60 * 1000 // Scheduled within the last hour or next hour
      );

      if (matchIndex !== -1) {
        const updatedSchedule = [...schedule];
        updatedSchedule[matchIndex].status = 'completed';
        setSchedule(updatedSchedule);
        localStorage.setItem('kegel_daily_schedule', JSON.stringify(updatedSchedule));
      } else {
        // Just find the nearest preceding pending notification and mark it complete to keep the UI aligned
        const upcomingIndex = schedule.findIndex(item => item.type === activeSession.type && item.status === 'pending');
        if (upcomingIndex !== -1) {
          const updatedSchedule = [...schedule];
          updatedSchedule[upcomingIndex].status = 'completed';
          setSchedule(updatedSchedule);
          localStorage.setItem('kegel_daily_schedule', JSON.stringify(updatedSchedule));
        }
      }
    }
    setActiveSession(null);
  };

  // Mark notification as completed by ID directly
  const handleCompleteNotification = (notifId: string) => {
    const updatedSchedule = schedule.map(item => {
      if (item.id === notifId) {
        const matchedType = item.type;
        const matchedDuration = item.durationMinutes;

        // Also add to completed logs for immediate user feedback and tracking!
        const newLog: ActivityLog = {
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          type: matchedType,
          durationMinutes: matchedDuration,
          completed: true
        };
        const updatedLogs = [...logs, newLog];
        setLogs(updatedLogs);
        localStorage.setItem('kegel_activity_logs', JSON.stringify(updatedLogs));

        return { ...item, status: 'completed' as const };
      }
      return item;
    });
    setSchedule(updatedSchedule);
    localStorage.setItem('kegel_daily_schedule', JSON.stringify(updatedSchedule));
  };

  // Clear all logs
  const handleClearLogs = () => {
    setLogs([]);
    localStorage.removeItem('kegel_activity_logs');
  };

  return (
    <PhoneContainer>
      {/* Active exercise player overlay */}
      {activeSession && (
        <ActiveSession
          type={activeSession.type}
          durationMinutes={activeSession.durationMinutes}
          soundEnabled={config.soundEnabled}
          onClose={handleCloseSession}
        />
      )}

      {/* Screen Header */}
      <div className="h-14 bg-slate-950 flex items-center justify-between px-5 border-b border-slate-900 select-none z-30 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
          <span className="font-sans font-bold text-sm tracking-wide text-white uppercase">
            Kegel & Meditação
          </span>
        </div>
        <div className="flex items-center text-slate-400 space-x-1 text-[11px] font-mono">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Foco Ativo</span>
        </div>
      </div>

      {/* Dynamic Tab Screen Body */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
        {activeTab === 'dashboard' && (
          <Dashboard
            config={config}
            schedule={schedule}
            logs={logs}
            onStartSession={handleStartSession}
            onCompleteNotification={handleCompleteNotification}
          />
        )}

        {activeTab === 'history' && (
          <HistoryList
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            config={config}
            onSave={handleSaveConfig}
            onRegenerateSchedule={handleRegenerateSchedule}
          />
        )}
      </div>

      {/* Mobile-style Tab Bar */}
      <div className="h-16 bg-slate-950 border-t border-slate-900 flex justify-around items-center px-4 shrink-0 z-30">
        <button
          id="dashboard-tab-btn"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 w-16 transition-all ${
            activeTab === 'dashboard' ? 'text-amber-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Home size={18} />
          <span className="text-[10px] font-bold tracking-tight">Início</span>
        </button>

        <button
          id="history-tab-btn"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 w-16 transition-all ${
            activeTab === 'history' ? 'text-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Calendar size={18} />
          <span className="text-[10px] font-bold tracking-tight">Histórico</span>
        </button>

        <button
          id="settings-tab-btn"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 w-16 transition-all ${
            activeTab === 'settings' ? 'text-sky-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <SettingsIcon size={18} />
          <span className="text-[10px] font-bold tracking-tight">Opções</span>
        </button>
      </div>
    </PhoneContainer>
  );
}

