/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, X, Check, Volume2, VolumeX, Sparkles, Activity, Heart } from 'lucide-react';
import { ActivityType, KegelStep } from '../types';
import { audioSynth } from '../utils/audio';

interface ActiveSessionProps {
  type: ActivityType;
  durationMinutes: number;
  soundEnabled: boolean;
  onClose: (completed: boolean) => void;
}

// Kegel pelvic floor steps
const KEGEL_STEPS_3_MIN: KegelStep[] = [
  {
    title: "1. Ativação Gradual",
    description: "Prepare os músculos e faça contrações de intensidade média.",
    durationSeconds: 45,
    instruction: "Sente-se confortavelmente ou deite-se. Respire normalmente. Comece a contrair suavemente os músculos do assoalho pélvico (como se fosse segurar o fluxo de urina), mantendo por 3s e relaxando por 3s.",
    focusArea: "Apenas músculos pélvicos, sem tensionar o abdômen"
  },
  {
    title: "2. Sustentação e Força",
    description: "Aumente a intensidade e o tempo de retenção.",
    durationSeconds: 45,
    focusArea: "Força constante e respiração fluida",
    instruction: "Agora, realize uma contração firme e segure por 5 a 8 segundos. Solte lentamente e descanse pelo mesmo tempo antes de repetir. Sinta a força de sustentação pélvica."
  },
  {
    title: "3. Pulsos Rápidos (Agilidade)",
    description: "Ative as fibras rápidas com contrações dinâmicas.",
    durationSeconds: 45,
    focusArea: "Rapidez e precisão no movimento",
    instruction: "Faça contrações o mais rápido possível: contraia e relaxe imediatamente. Repita este ritmo dinâmico para treinar os reflexos rápidos do assoalho pélvico."
  },
  {
    title: "4. Descompressão e Relaxamento",
    description: "Libere totalmente a tensão acumulada.",
    durationSeconds: 45,
    focusArea: "Relaxamento profundo e respiração abdominal",
    instruction: "Expire todo o ar e relaxe completamente a musculatura. Sinta a sensação de alívio e expansão pélvica a cada inspiração lenta e profunda."
  }
];

const KEGEL_STEPS_2_MIN: KegelStep[] = KEGEL_STEPS_3_MIN.map(step => ({
  ...step,
  durationSeconds: 30
}));

export function ActiveSession({ type, durationMinutes, soundEnabled, onClose }: ActiveSessionProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(durationMinutes * 60);
  const [soundActive, setSoundActive] = useState(soundEnabled);
  const [isSuccess, setIsSuccess] = useState(false);

  // Meditation breath cycle states (4s inhale, 4s hold, 4s exhale, 4s hold)
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');
  const [breathSeconds, setBreathSeconds] = useState(4);

  const steps: KegelStep[] = durationMinutes === 2 ? KEGEL_STEPS_2_MIN : KEGEL_STEPS_3_MIN;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate Kegel active step
  const getKegelStepIndex = (secRemaining: number) => {
    const totalDuration = durationMinutes * 60;
    const elapsed = totalDuration - secRemaining;
    const stepDuration = totalDuration / steps.length;
    const index = Math.floor(elapsed / stepDuration);
    return Math.min(index, steps.length - 1);
  };

  // Manage Meditation Sound Drone
  useEffect(() => {
    if (type === 'meditation' && isPlaying && soundActive && !isSuccess) {
      audioSynth.startAmbientDrone();
    } else {
      audioSynth.stopAmbientDrone();
    }
    return () => {
      audioSynth.stopAmbientDrone();
    };
  }, [type, isPlaying, soundActive, isSuccess]);

  // Main timer tick
  useEffect(() => {
    if (isPlaying && !isSuccess) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsSuccess(true);
            audioSynth.playChime();
            return 0;
          }
          return prev - 1;
        });

        // For meditation, update breathing phase cycle
        if (type === 'meditation') {
          setBreathSeconds(prevSec => {
            if (prevSec <= 1) {
              // Cycle phases
              setBreathPhase(prevPhase => {
                switch (prevPhase) {
                  case 'inhale': return 'holdIn';
                  case 'holdIn': return 'exhale';
                  case 'exhale': return 'holdOut';
                  case 'holdOut': return 'inhale';
                }
              });
              return 4; // Reset phase duration to 4 seconds
            }
            return prevSec - 1;
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, type, isSuccess]);

  // Update steps based on time left for Kegel exercises
  useEffect(() => {
    if (type === 'kegel') {
      const idx = getKegelStepIndex(secondsRemaining);
      setCurrentStepIndex(idx);
    }
  }, [secondsRemaining, type]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleToggleSound = () => {
    setSoundActive(!soundActive);
  };

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentStep = steps[currentStepIndex];
  const progressPercent = ((durationMinutes * 60 - secondsRemaining) / (durationMinutes * 60)) * 100;

  // Render meditation-specific breathing circle text/instructions
  const getMeditationGuide = () => {
    switch (breathPhase) {
      case 'inhale':
        return { text: "Inspire", color: "text-emerald-400", scale: 1.5, bg: "bg-emerald-500/10" };
      case 'holdIn':
        return { text: "Retenha o ar", color: "text-amber-400", scale: 1.5, bg: "bg-amber-500/10" };
      case 'exhale':
        return { text: "Expire lentamente", color: "text-sky-400", scale: 1.0, bg: "bg-sky-500/10" };
      case 'holdOut':
        return { text: "Mantenha vazio", color: "text-indigo-400", scale: 1.0, bg: "bg-indigo-500/10" };
    }
  };

  const medGuide = getMeditationGuide();

  return (
    <div id="active-session-screen" className="fixed inset-0 bg-slate-950 text-white z-50 flex flex-col justify-between p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-xl ${type === 'kegel' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'}`}>
            {type === 'kegel' ? <Activity size={20} /> : <Heart size={20} />}
          </div>
          <div>
            <h2 className="font-sans font-semibold text-sm tracking-tight text-slate-300 uppercase">
              {type === 'kegel' ? 'Exercício de Kegel' : 'Meditação Guiada'}
            </h2>
            <p className="text-xs text-slate-400">{durationMinutes} Minutos</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {type === 'meditation' && (
            <button
              id="toggle-session-sound-btn"
              onClick={handleToggleSound}
              className="p-2.5 rounded-full bg-slate-900 text-slate-400 hover:text-white transition-colors"
              title={soundActive ? "Desativar som ambiente" : "Ativar som ambiente"}
            >
              {soundActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          <button
            id="cancel-session-btn"
            onClick={() => onClose(false)}
            className="p-2.5 rounded-full bg-slate-900 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main visual display */}
      <div className="flex-1 flex flex-col items-center justify-center my-6">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="active-session-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm flex flex-col items-center"
            >
              {/* Timer Circle */}
              <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                {/* Background Ring */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    className="stroke-slate-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="84"
                    className={type === 'kegel' ? 'stroke-amber-500' : 'stroke-sky-500'}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 84}
                    animate={{ strokeDashoffset: 2 * Math.PI * 84 * (1 - progressPercent / 100) }}
                    transition={{ ease: "linear", duration: 0.5 }}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Inner Breathing Guide Circle for Meditation */}
                {type === 'meditation' && isPlaying && (
                  <motion.div
                    className={`absolute rounded-full w-32 h-32 ${medGuide.bg} flex flex-col items-center justify-center border border-sky-500/10`}
                    animate={{ scale: medGuide.scale }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                  >
                    <span className={`text-xs font-semibold tracking-wide uppercase ${medGuide.color}`}>
                      {medGuide.text}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">
                      {breathSeconds}s
                    </span>
                  </motion.div>
                )}

                {/* Simple Text Timer (Always visible) */}
                {(type === 'kegel' || !isPlaying) && (
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-mono font-bold tracking-tight">
                      {formatTime(secondsRemaining)}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                      {isPlaying ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                )}
              </div>

              {/* Dynamic steps for Kegel */}
              {type === 'kegel' && currentStep && (
                <motion.div
                  key={currentStepIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center px-4"
                >
                  <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
                    {currentStep.title}
                  </span>
                  <p className="mt-4 text-base font-semibold text-slate-200">
                    {currentStep.description}
                  </p>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed text-balance min-h-[72px]">
                    {currentStep.instruction}
                  </p>
                  <div className="mt-4 p-2 bg-slate-900/60 rounded-xl border border-slate-800 inline-block">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Foco mental</span>
                    <span className="text-xs text-amber-300 font-medium">{currentStep.focusArea}</span>
                  </div>
                </motion.div>
              )}

              {/* Box breathing instruction for meditation */}
              {type === 'meditation' && (
                <div className="text-center px-4">
                  <span className="text-xs bg-sky-500/10 border border-sky-500/20 text-sky-400 px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
                    Ciclo Quadrado (Sama Vritti)
                  </span>
                  <p className="mt-4 text-xs text-slate-400 leading-relaxed max-w-xs mx-auto text-balance">
                    Sincronize sua respiração com o círculo pulsante. Inspirar por 4s, prender com pulmões cheios por 4s, expirar por 4s, e prender com pulmões vazios por 4s.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            /* Success State */
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center px-6 flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
                <Sparkles size={36} className="animate-pulse" />
              </div>
              <h2 className="text-2xl font-sans font-bold tracking-tight text-white">
                Sessão Concluída!
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-xs leading-relaxed text-balance">
                Incrível. Você concluiu com sucesso sua prática de {type === 'kegel' ? 'Kegel' : 'Meditação'}. Cada minuto dedicado eleva seu bem-estar e fortalece sua saúde.
              </p>

              <div className="mt-8 p-4 bg-slate-900/80 rounded-2xl border border-slate-800 text-left w-full max-w-xs space-y-2">
                <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Atividade:</span>
                  <span className="font-semibold text-slate-200 uppercase">{type === 'kegel' ? 'Kegel' : 'Meditação'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Duração:</span>
                  <span className="font-mono text-slate-200">{durationMinutes} minutos</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer controls */}
      <div className="flex justify-center items-center py-4">
        {!isSuccess ? (
          <div className="flex items-center space-x-6">
            <button
              id="pause-resume-btn"
              onClick={handleTogglePlay}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
                isPlaying 
                  ? 'bg-slate-800 border border-slate-700 hover:bg-slate-700' 
                  : type === 'kegel' ? 'bg-amber-500 hover:bg-amber-400' : 'bg-sky-500 hover:bg-sky-400'
              }`}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <button
              id="quick-finish-btn"
              onClick={() => {
                setIsSuccess(true);
                audioSynth.playChime();
              }}
              className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium tracking-wide transition-colors"
            >
              Concluir Cedo
            </button>
          </div>
        ) : (
          <button
            id="close-session-success-btn"
            onClick={() => onClose(true)}
            className="w-full max-w-xs py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-bold text-sm tracking-wide rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center space-x-2"
          >
            <Check size={18} strokeWidth={3} />
            <span>Voltar ao Início</span>
          </button>
        )}
      </div>
    </div>
  );
}
