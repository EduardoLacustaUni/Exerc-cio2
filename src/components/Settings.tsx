/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserConfig } from '../types';
import { Save, RefreshCw, Bell, Volume2, Moon, Sun, ShieldAlert, Sliders } from 'lucide-react';

interface SettingsProps {
  config: UserConfig;
  onSave: (newConfig: UserConfig) => void;
  onRegenerateSchedule: () => void;
}

export function Settings({ config, onSave, onRegenerateSchedule }: SettingsProps) {
  const [wakeTime, setWakeTime] = useState(config.wakeTime);
  const [sleepTime, setSleepTime] = useState(config.sleepTime);
  const [kegelCount, setKegelCount] = useState(config.kegelCount);
  const [kegelDuration, setKegelDuration] = useState(config.kegelDuration);
  const [meditationCount, setMeditationCount] = useState(config.meditationCount);
  const [meditationDuration, setMeditationDuration] = useState(config.meditationDuration);
  const [soundEnabled, setSoundEnabled] = useState(config.soundEnabled);
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState(config.systemNotificationsEnabled);
  const [upcomingAlertsEnabled, setUpcomingAlertsEnabled] = useState(config.upcomingAlertsEnabled ?? true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      wakeTime,
      sleepTime,
      kegelCount: Number(kegelCount),
      kegelDuration: Number(kegelDuration),
      meditationCount: Number(meditationCount),
      meditationDuration: Number(meditationDuration),
      soundEnabled,
      systemNotificationsEnabled,
      upcomingAlertsEnabled,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações de sistema.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setSystemNotificationsEnabled(true);
    } else {
      setSystemNotificationsEnabled(false);
      alert('Permissão de notificações recusada.');
    }
  };

  return (
    <div id="settings-screen" className="flex-1 p-5 space-y-6 text-slate-100 overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
            <Sliders size={20} className="text-amber-500" />
            Configurações
          </h1>
          <p className="text-xs text-slate-400">Configure seu dia e seus treinos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 pb-8">
        {/* WAKING HOURS CARD */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Sun size={14} />
            Período Acordado (Não Dormindo)
          </h3>
          <p className="text-[11px] text-slate-400">
            Os lembretes aleatórios só serão disparados neste intervalo de tempo para não atrapalhar seu sono.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Hora de Acordar</label>
              <input
                id="wake-time-input"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Hora de Dormir</label>
              <input
                id="sleep-time-input"
                type="time"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>
          </div>
        </div>

        {/* ALERTS FREQUENCY */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-2">
            <Bell size={14} />
            Frequência dos Exercícios
          </h3>

          {/* Kegel count */}
          <div className="space-y-3 pb-3 border-b border-slate-800/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-200">Exercício de Kegel (Saúde pélvica)</span>
              <span className="text-xs font-mono text-amber-400 font-bold">{kegelCount} por dia</span>
            </div>
            <input
              id="kegel-count-slider"
              type="range"
              min="2"
              max="15"
              value={kegelCount}
              onChange={(e) => setKegelCount(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Duração de cada sessão:</span>
              <div className="flex space-x-2">
                {[2, 3].map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setKegelDuration(duration)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono border transition-colors ${
                      kegelDuration === duration
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {duration} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Meditation count */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-200">Meditação Guiada (Respiração)</span>
              <span className="text-xs font-mono text-sky-400 font-bold">{meditationCount} por dia</span>
            </div>
            <input
              id="meditation-count-slider"
              type="range"
              min="1"
              max="5"
              value={meditationCount}
              onChange={(e) => setMeditationCount(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Duração de cada sessão:</span>
              <span className="px-3 py-1 bg-sky-500/15 border border-sky-500/30 text-sky-400 rounded-lg text-xs font-mono">
                {meditationDuration} min
              </span>
            </div>
          </div>
        </div>

        {/* NOTIFICATION PREFERENCES & SYSTEM SETUP */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Volume2 size={14} />
            Alertas e Sistema
          </h3>

          <div className="space-y-3.5">
            {/* Upcoming alerts toggle */}
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Avisar Próximos Eventos</span>
                <span className="text-[10px] text-slate-500">Exibe banners/avisos de eventos que vão acontecer</span>
              </div>
              <input
                id="upcoming-alerts-toggle"
                type="checkbox"
                checked={upcomingAlertsEnabled}
                onChange={(e) => setUpcomingAlertsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-700 after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-slate-950 peer-checked:after:border-transparent relative"></div>
            </label>

            {/* Sound Toggle */}
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Sons Ambientais</span>
                <span className="text-[10px] text-slate-500">Ativa som drone e sinos nas sessões</span>
              </div>
              <input
                id="sound-toggle-input"
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-700 after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950 peer-checked:after:border-transparent relative"></div>
            </label>

            {/* Browser System Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Notificações no Dispositivo</span>
                <span className="text-[10px] text-slate-500">Usa a API de Notificações do navegador</span>
              </div>
              <button
                id="system-notif-permission-btn"
                type="button"
                onClick={requestNotificationPermission}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                  systemNotificationsEnabled
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {systemNotificationsEnabled ? 'Ativadas' : 'Ativar'}
              </button>
            </div>
          </div>
        </div>

        {/* REGENERATE ACTION */}
        <div className="p-3 bg-slate-900/40 border border-slate-800/40 rounded-2xl flex items-center justify-between">
          <div className="flex-1 mr-3">
            <span className="text-[11px] font-semibold text-amber-300 block">Gerar Nova Grade Diária</span>
            <span className="text-[9px] text-slate-400 leading-tight block mt-0.5">
              Refaz o sorteio e distribuição dos lembretes aleatórios de hoje.
            </span>
          </div>
          <button
            id="regenerate-schedule-btn"
            type="button"
            onClick={() => {
              onRegenerateSchedule();
              alert('Nova lista de lembretes diários foi sorteada e atualizada com sucesso!');
            }}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 transition-all flex items-center justify-center"
            title="Sortear novamente"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* BUTTONS */}
        <div className="flex space-x-3 pt-2">
          <button
            id="save-settings-btn"
            type="submit"
            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-sky-500 hover:opacity-95 active:scale-98 text-slate-950 font-bold text-xs tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 uppercase"
          >
            <Save size={16} />
            <span>Salvar Preferências</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="text-center text-xs text-emerald-400 font-semibold animate-bounce mt-2">
            Configurações salvas e aplicadas com sucesso!
          </div>
        )}
      </form>
    </div>
  );
}
