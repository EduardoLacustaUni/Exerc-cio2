/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ActivityLog } from '../types';
import { Calendar, CheckCircle2, Award, Flame, Trash2, ShieldCheck, Heart, Activity } from 'lucide-react';

interface HistoryListProps {
  logs: ActivityLog[];
  onClearLogs: () => void;
}

export function HistoryList({ logs, onClearLogs }: HistoryListProps) {
  // Sort logs: newest first
  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

  // Statistics
  const kegelCount = logs.filter(l => l.type === 'kegel' && l.completed).length;
  const meditationCount = logs.filter(l => l.type === 'meditation' && l.completed).length;
  const totalCompleted = kegelCount + meditationCount;

  // Calculate Streak (consecutive days of practice)
  const calculateStreak = () => {
    if (logs.length === 0) return 0;
    
    // Group logs by local date string
    const uniqueDays = new Set(
      logs
        .filter(l => l.completed)
        .map(l => new Date(l.timestamp).toDateString())
    );

    const sortedDays = Array.from(uniqueDays).map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime());
    
    if (sortedDays.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // If latest practice isn't today or yesterday, streak is broken
    const latestDay = sortedDays[0];
    latestDay.setHours(0,0,0,0);

    if (latestDay.getTime() !== today.getTime() && latestDay.getTime() !== yesterday.getTime()) {
      return 0;
    }

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
        break; // Streak broken
      }
    }

    return streak;
  };

  const streak = calculateStreak();

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    return `${d.toLocaleDateString('pt-BR', dateOptions)} às ${d.toLocaleTimeString('pt-BR', timeOptions)}`;
  };

  const handleResetLogs = () => {
    if (confirm('Deseja realmente apagar todo o histórico de exercícios?')) {
      onClearLogs();
    }
  };

  return (
    <div id="history-screen" className="flex-1 p-5 space-y-6 text-slate-100 overflow-y-auto">
      <div>
        <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
          <Calendar size={20} className="text-emerald-500" />
          Seu Histórico
        </h1>
        <p className="text-xs text-slate-400">Acompanhe seu progresso e sua constância</p>
      </div>

      {/* STREAK & STATS BENTO CARDS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500 mb-2">
            <Flame size={20} className={streak > 0 ? 'animate-bounce' : ''} />
          </div>
          <span className="text-2xl font-mono font-bold text-white">{streak}</span>
          <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider mt-1">
            Dias Seguidos
          </span>
        </div>

        <div className="bg-gradient-to-br from-sky-500/10 to-blue-500/5 border border-sky-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-sky-500/15 flex items-center justify-center text-sky-500 mb-2">
            <Award size={20} />
          </div>
          <span className="text-2xl font-mono font-bold text-white">{totalCompleted}</span>
          <span className="text-[10px] text-sky-300 font-semibold uppercase tracking-wider mt-1">
            Práticas Feitas
          </span>
        </div>
      </div>

      {/* DETAIL BUBBLES */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3.5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Distribuição</h3>
        
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
              <span className="text-slate-300 font-medium">Kegel (Fortalecimento)</span>
            </div>
            <span className="font-mono text-slate-200 font-bold">{kegelCount} concluídos</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-sky-500 rounded-full"></span>
              <span className="text-slate-300 font-medium">Meditação (Foco)</span>
            </div>
            <span className="font-mono text-slate-200 font-bold">{meditationCount} concluídos</span>
          </div>
        </div>
      </div>

      {/* TIMELINE OF LOGS */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Atividades Recentes</h3>
          {logs.length > 0 && (
            <button
              id="clear-logs-btn"
              onClick={handleResetLogs}
              className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <Trash2 size={12} />
              Limpar Tudo
            </button>
          )}
        </div>

        {sortedLogs.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800/80">
            <ShieldCheck size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Nenhuma atividade registrada ainda.</p>
            <p className="text-[10px] text-slate-600 mt-1">Complete um exercício para ver os registros aqui!</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {sortedLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center"
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg ${
                    log.type === 'kegel' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'
                  }`}>
                    {log.type === 'kegel' ? <Activity size={14} /> : <Heart size={14} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">
                      {log.type === 'kegel' ? 'Treino Kegel' : 'Meditação 5min'}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">{formatDate(log.timestamp)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-mono font-semibold text-slate-400 mr-1">
                    +{log.durationMinutes}m
                  </span>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
