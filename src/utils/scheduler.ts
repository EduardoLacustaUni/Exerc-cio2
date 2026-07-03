/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScheduledNotification, UserConfig, ActivityType } from '../types';

// Helper to convert "HH:MM" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper to convert minutes from midnight to "HH:MM"
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.floor(minutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

const KEGEL_MESSAGES = [
  { title: "Kegel: Contrações Rápidas", message: "Hora do treino! Faça contrações rápidas de 1 a 2 segundos do assoalho pélvico, relaxando em seguida." },
  { title: "Kegel: Sustentação Profunda", message: "Fortalecimento ativo: contraia os músculos pélvicos e segure firme de 5 a 10 segundos." },
  { title: "Kegel: O Elevador", message: "Controle gradual: imagine subir um elevador contraindo os músculos aos poucos, e depois desça relaxando devagar." },
  { title: "Kegel: Respiração e Foco", message: "Inspire relaxando e, ao expirar, realize uma contração firme e concentrada do assoalho pélvico." },
  { title: "Kegel: Resistência Ativa", message: "Mantenha uma contração suave de intensidade média por 15 segundos enquanto respira de forma fluida." },
  { title: "Kegel: Pulsos Rápidos", message: "Realize uma série de 10 a 15 contrações rápidas consecutivas para ativar as fibras musculares rápidas." },
  { title: "Kegel: Relaxamento Consciente", message: "Tão importante quanto contrair é relaxar completamente. Respire fundo e solte toda a musculatura pélvica." },
  { title: "Kegel: Postura e Alinhamento", message: "Sente-se de forma ereta e realize 5 contrações profundas mantendo a respiração livre de bloqueios." },
  { title: "Kegel: Coordenação Pélvica", message: "Isole os músculos pélvicos sem contrair o abdômen ou glúteos. Faça contrações precisas de 5 segundos." },
  { title: "Kegel: Integração de Rotina", message: "Uma pausa rápida para cuidar da sua saúde íntima e postura. Realize ciclos de 5s contraindo e 5s relaxando." }
];

const MEDITATION_MESSAGES = [
  { title: "Meditação: Respiração Consciente", message: "Hora de pausar por 5 minutos. Entregue-se ao fluxo natural do seu ar." },
  { title: "Meditação: Presença Plena", message: "Desconecte do mundo externo. Sente-se confortavelmente e observe seus pensamentos passarem." },
  { title: "Meditação: Âncora de Calma", message: "Deixe de lado o que estava fazendo. Faça da sua respiração o seu porto seguro por 5 minutos." },
  { title: "Meditação: Silêncio Interior", message: "Pausa restauradora de 5 minutos. Encontre a paz que habita no espaço entre seus pensamentos." }
];

// Generates well-distributed, non-overlapping random notifications for today
export function generateDailySchedule(config: UserConfig, dateSeed: Date = new Date()): ScheduledNotification[] {
  const startMinutes = timeToMinutes(config.wakeTime);
  let endMinutes = timeToMinutes(config.sleepTime);

  // If sleep time is earlier than wake time (e.g., wake at 08:00, sleep at 01:00 the next day)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Add a day in minutes
  }

  const activeDuration = endMinutes - startMinutes;
  const totalNotifications = config.kegelCount + config.meditationCount;

  if (activeDuration <= 0 || totalNotifications <= 0) {
    return [];
  }

  // Segment duration
  const segmentDuration = activeDuration / totalNotifications;
  
  // Allocate types to segments randomly
  const typesArray: ActivityType[] = [
    ...Array(config.kegelCount).fill('kegel'),
    ...Array(config.meditationCount).fill('meditation')
  ];
  
  // Shuffle types array
  for (let i = typesArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [typesArray[i], typesArray[j]] = [typesArray[j], typesArray[i]];
  }

  const notifications: ScheduledNotification[] = [];
  const baseDay = new Date(dateSeed);
  baseDay.setHours(0, 0, 0, 0);

  let lastMinutes = -999;

  for (let i = 0; i < totalNotifications; i++) {
    // Determine the interval boundary
    const segStart = startMinutes + i * segmentDuration;
    const segEnd = startMinutes + (i + 1) * segmentDuration;

    // Pick a random time inside this segment, avoiding the extreme edges (keep between 15% and 85% of the segment)
    const margin = segmentDuration * 0.15;
    const offset = margin + Math.random() * (segmentDuration - 2 * margin);
    let targetMinutes = Math.floor(segStart + offset);

    // Hard requirement: Ensure they do not overlap and have a minimum spacing of at least 15 minutes
    if (targetMinutes < lastMinutes + 15) {
      targetMinutes = lastMinutes + 15;
    }

    // Make sure it doesn't spill over sleep time
    if (targetMinutes >= endMinutes) {
      targetMinutes = endMinutes - 5;
    }

    lastMinutes = targetMinutes;

    const timeStr = minutesToTime(targetMinutes);
    
    // Create the epoch timestamp
    const triggerDate = new Date(baseDay);
    triggerDate.setMinutes(targetMinutes);
    const timestamp = triggerDate.getTime();

    const type = typesArray[i];
    const durationMinutes = type === 'kegel' ? config.kegelDuration : config.meditationDuration;
    
    // Pick dynamic titles and messages
    let info = { title: "Exercício", message: "Hora de praticar!" };
    if (type === 'kegel') {
      info = KEGEL_MESSAGES[i % KEGEL_MESSAGES.length];
    } else {
      info = MEDITATION_MESSAGES[i % MEDITATION_MESSAGES.length];
    }

    notifications.push({
      id: `${type}-${timestamp}-${i}`,
      time: timeStr,
      timestamp,
      type,
      durationMinutes,
      status: 'pending',
      title: info.title,
      message: info.message
    });
  }

  // Sort by time
  return notifications.sort((a, b) => a.timestamp - b.timestamp);
}
