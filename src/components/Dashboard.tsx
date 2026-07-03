/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScheduledNotification, UserConfig, ActivityType, ActivityLog } from '../types';
import { Play, Bell, Calendar, Flame, AlertCircle, Heart, Activity, Check, Volume2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioSynth } from '../utils/audio';

interface DashboardProps {
  config: UserConfig;
  schedule: ScheduledNotification[];
  logs: ActivityLog[];
  onStartSession: (type: ActivityType, durationMinutes: number) => void;
  onCompleteNotification: (notifId: string) => void;
}

export function Dashboard({
  config,
  schedule,
  logs,
  onStartSession,
  onCompleteNotification
}: DashboardProps) {
  const [nextNotif, setNextNotif] = useState<ScheduledNotification | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [showSimulatedBanner, setShowSimulatedBanner] = useState(false);
  const [simulatedNotif, setSimulatedNotif] = useState<ScheduledNotification | null>(null);

  // Calculate today's tallies
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayLogs = logs.filter(l => l.timestamp >= todayStart.getTime() && l.completed);
  const kegelTodayCount = todayLogs.filter(l => l.type === 'kegel').length;
  const meditationTodayCount = todayLogs.filter(l => l.type === 'meditation').length;

  // Streak calculation
  const getStreak = () => {
    if (logs.length === 0) return 0;
    const uniqueDays = new Set(
      logs.filter(l => l.completed).map(l => new Date(l.timestamp).toDateString())
    );
    const sortedDays = Array.from(uniqueDays).map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime());
    if (sortedDays.length === 0) return 0;

    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const latestDay = sortedDays[0];
    latestDay.setHours(0,0,0,0);

    if (latestDay.getTime() !== today.getTime() && latestDay.getTime() !== yesterday.getTime()) {
      return 0;
    }

    let streak = 0;
    let currentCheck = new Date(latestDay);
    streak = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      const prevExpected = new Date(currentCheck);
      prevExpected.setDate(prevExpected.getDate() - 1);
      prevExpected.setHours(0,0,0,0);

      const actualPrev = new Date(sortedDays[i]);
      actualPrev.setHours(0,0,0,0);

      if (actualPrev.getTime() === prevExpected.getTime()) {
        streak++;
        currentCheck = actualPrev;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = getStreak();

  // Find next pending notification
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const pending = schedule
        .filter(n => n.status === 'pending' && n.timestamp > now)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (pending.length > 0) {
        const next = pending[0];
        setNextNotif(next);

        // Compute difference
        const diffMs = next.timestamp - now;
        const totalSec = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;

        let str = '';
        if (hours > 0) str += `${hours}h `;
        str += `${mins}m ${secs}s`;
        setTimeLeftStr(str);

        // Check if just triggered in real-time
        if (diffMs <= 1000 && diffMs > -2000) {
          triggerNotificationSimulation(next);
        }
      } else {
        setNextNotif(null);
        setTimeLeftStr('Encerrado por hoje');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [schedule]);

  // Handle trigger notification simulation
  const triggerNotificationSimulation = (notif: ScheduledNotification) => {
    setSimulatedNotif(notif);
    setShowSimulatedBanner(true);
    if (config.soundEnabled) {
      audioSynth.playChime();
    }
    // Attempt system notification if permission given
    if (config.systemNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notif.title, {
          body: notif.message,
          icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        });
      } catch (e) {
        console.warn('System Notification failed', e);
      }
    }
  };

  const handleSimulateRandomAlert = () => {
    const isKegel = Math.random() > 0.3;
    const type = isKegel ? 'kegel' : 'meditation';
    const fakeNotif: ScheduledNotification = {
      id: `simulated-${Date.now()}`,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      type,
      durationMinutes: type === 'kegel' ? config.kegelDuration : config.meditationDuration,
      status: 'pending',
      title: isKegel ? "Kegel: Contrações Rápidas" : "Meditação: Respiração Guiada",
      message: isKegel 
        ? "Hora de treinar os músculos do assoalho pélvico por 2 minutos!" 
        : "Faça uma pausa de 5 minutos para se equilibrar com a respiração quadrada."
    };
    triggerNotificationSimulation(fakeNotif);
  };

  const handleAcceptSimulation = () => {
    setShowSimulatedBanner(false);
    if (simulatedNotif) {
      // Mark as completed in state or schedule if it belongs to schedule
      const matchedScheduleItem = schedule.find(s => s.id === simulatedNotif.id);
      if (matchedScheduleItem) {
        onCompleteNotification(matchedScheduleItem.id);
      }
      onStartSession(simulatedNotif.type, simulatedNotif.durationMinutes);
    }
  };

  return (
    <div id="dashboard-screen" className="flex-1 p-5 space-y-6 text-slate-100 overflow-y-auto relative">
      
      {/* Dynamic Simulated Notification Banner Overlay (Android Style Pop-up) */}
      <AnimatePresence>
        {showSimulatedBanner && simulatedNotif && (
          <motion.div
            id="simulation-alert-banner"
            initial={{ opacity: 0, y: -80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 0.95 }}
            className="absolute top-3 left-4 right-4 bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 shadow-2xl z-50 flex flex-col space-y-3"
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-xl mt-0.5 ${
                simulatedNotif.type === 'kegel' ? 'bg-amber-500/15 text-amber-400' : 'bg-sky-500/15 text-sky-400'
              }`}>
                {simulatedNotif.type === 'kegel' ? <Activity size={18} /> : <Heart size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">
                  Notificação do Sistema
                </span>
                <h4 className="text-xs font-bold text-white leading-tight">
                  {simulatedNotif.title}
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal mt-1 line-clamp-2">
                  {simulatedNotif.message}
                </p>
              </div>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                id="reject-banner-btn"
                onClick={() => setShowSimulatedBanner(false)}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
              >
                Ignorar
              </button>
              <button
                id="accept-banner-btn"
                onClick={handleAcceptSimulation}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-950 transition-all flex items-center justify-center space-x-1 ${
                  simulatedNotif.type === 'kegel' ? 'bg-amber-400 hover:bg-amber-300' : 'bg-sky-400 hover:bg-sky-300'
                }`}
              >
                <Play size={10} strokeWidth={3} />
                <span>Praticar Agora</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold font-sans text-white tracking-tight">Olá, Praticante!</h2>
          <p className="text-xs text-slate-400 mt-0.5">Fortaleça sua saúde e presença hoje.</p>
        </div>
        
        {/* Streak chip */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/10 rounded-full border border-amber-500/20">
          <Flame size={14} className="text-amber-500 animate-pulse" />
          <span className="text-xs font-mono font-bold text-amber-400">{streak} Dias</span>
        </div>
      </div>

      {/* TODAY'S COUNTDOWN / HERO TARGET CARD (Only shown or detailed if alerts enabled) */}
      {config.upcomingAlertsEnabled ? (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/80 rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles size={120} className="text-amber-500" />
          </div>

          <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest block">Próximo Alerta em</span>
          
          <div className="mt-1 flex items-baseline space-x-2">
            <h1 className="text-2xl font-mono font-bold text-white tracking-tight">
              {timeLeftStr}
            </h1>
            {nextNotif && (
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                nextNotif.type === 'kegel' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'
              }`}>
                {nextNotif.time}
              </span>
            )}
          </div>

          {nextNotif ? (
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {nextNotif.type === 'kegel' ? 'Exercício Kegel' : 'Meditação 5min'} - {nextNotif.title}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">
              Meta do dia cumprida ou fora do período acordado! Dormir bem é essencial.
            </p>
          )}

          {/* PROGRESS TALLIES */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/60">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block">Kegel Concluídos</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-mono font-bold text-amber-400">{kegelTodayCount}</span>
                <span className="text-xs text-slate-600">/ {config.kegelCount}</span>
                {kegelTodayCount >= config.kegelCount && <Check size={12} className="text-emerald-500" />}
              </div>
              {/* Visual thin indicator bar */}
              <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (kegelTodayCount / config.kegelCount) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block">Meditações Concluídas</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-mono font-bold text-sky-400">{meditationTodayCount}</span>
                <span className="text-xs text-slate-600">/ {config.meditationCount}</span>
                {meditationTodayCount >= config.meditationCount && <Check size={12} className="text-emerald-500" />}
              </div>
              {/* Visual thin indicator bar */}
              <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (meditationTodayCount / config.meditationCount) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-indigo-950/30 to-slate-900 border border-slate-800/60 rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Prática Atenta & Livre</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Os avisos de próximos eventos estão desativados. Siga o seu próprio ritmo diário!
              </p>
            </div>
          </div>

          {/* PROGRESS TALLIES REGARDLESS */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/40">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block">Kegel Concluídos</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-mono font-bold text-amber-400">{kegelTodayCount}</span>
                <span className="text-xs text-slate-600">/ {config.kegelCount}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase block">Meditações Concluídas</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-mono font-bold text-sky-400">{meditationTodayCount}</span>
                <span className="text-xs text-slate-600">/ {config.meditationCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK LAUNCH ACTIONS */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fazer Exercício Agora</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            id="launch-quick-kegel-btn"
            onClick={() => onStartSession('kegel', config.kegelDuration)}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800/80 rounded-2xl p-3 text-left transition-all active:scale-98 group flex flex-col justify-between h-24"
          >
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 w-fit">
              <Activity size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-amber-400 transition-colors">
                Kegel
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {config.kegelDuration} Minutos
              </span>
            </div>
          </button>

          <button
            id="launch-quick-meditation-btn"
            onClick={() => onStartSession('meditation', config.meditationDuration)}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800/80 rounded-2xl p-3 text-left transition-all active:scale-98 group flex flex-col justify-between h-24"
          >
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 w-fit">
              <Heart size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-sky-400 transition-colors">
                Meditação
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {config.meditationDuration} Minutos
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* TODAY'S SCHEDULED ALERTS */}
      {config.upcomingAlertsEnabled && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lembretes Programados para Hoje</h3>
          
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {schedule.map((notif, idx) => {
              const isCompleted = notif.status === 'completed';
              const isMissed = notif.status === 'missed';
              const now = Date.now();
              const isUpcoming = notif.timestamp > now && notif.status === 'pending';

              return (
                <div
                  key={notif.id}
                  className={`flex flex-col p-3 rounded-xl border transition-all ${
                    isCompleted 
                      ? 'bg-emerald-500/5 border-emerald-500/15 opacity-70' 
                      : isMissed
                      ? 'bg-rose-500/5 border-rose-500/15 opacity-50'
                      : isUpcoming
                      ? 'bg-slate-900 border-slate-800/80'
                      : 'bg-slate-900/50 border-slate-900/40 opacity-40'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-lg ${
                        notif.type === 'kegel' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'
                      }`}>
                        {notif.type === 'kegel' ? <Activity size={14} /> : <Heart size={14} />}
                      </div>

                      <div>
                        <h4 className={`text-xs font-bold ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-200'
                        }`}>
                          {notif.type === 'kegel' ? 'Exercício Kegel' : 'Meditação'}
                        </h4>
                        <p className="text-[9px] text-slate-500 mt-0.5 max-w-[150px] truncate leading-tight">
                          {notif.title}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-300 block">{notif.time}</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {notif.durationMinutes}m
                      </span>
                    </div>
                  </div>

                  {/* Actions Area: User Cumpriu ou Não a Tarefa */}
                  <div className="flex items-center justify-end space-x-2 mt-2.5 pt-2 border-t border-slate-800/40">
                    {isCompleted ? (
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold uppercase">
                        ✓ Cumprido
                      </span>
                    ) : isMissed ? (
                      <span className="text-[9px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded font-bold uppercase">
                        ✗ Não Feito
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            // Quick play
                            onStartSession(notif.type, notif.durationMinutes);
                          }}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-850 rounded text-[9px] font-bold text-slate-400 hover:text-white uppercase transition-colors"
                        >
                          Iniciar
                        </button>
                        <button
                          onClick={() => {
                            // Complete action directly
                            onCompleteNotification(notif.id);
                          }}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold uppercase transition-colors"
                        >
                          Cumpri
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SIMULATOR TOOL BAR */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <AlertCircle size={16} className="text-amber-500 animate-pulse" />
          <h4 className="text-xs font-bold text-amber-500 font-sans uppercase">Centro de Teste Android</h4>
        </div>
        <p className="text-[10px] text-slate-400 leading-normal">
          Para ver como o seu smartphone Android irá vibrar e exibir os lembretes do dia, use o botão de simulação imediata abaixo.
        </p>
        <button
          id="trigger-simulated-alert-btn"
          onClick={handleSimulateRandomAlert}
          className="w-full py-2 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-sans font-bold text-xs tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
        >
          <Volume2 size={14} />
          <span>Simular Alerta Imediato</span>
        </button>
      </div>
    </div>
  );
}
