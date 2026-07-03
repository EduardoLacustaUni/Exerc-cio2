package com.kegel.app

import java.util.Calendar
import java.util.Date
import kotlin.random.Random

enum class ActivityType {
    KEGEL, MEDITATION
}

data class UserConfig(
    val wakeTime: String = "08:00", // Formato "HH:MM"
    val sleepTime: String = "22:00", // Formato "HH:MM"
    val kegelCount: Int = 10,
    val kegelDurationMinutes: Int = 2,
    val meditationCount: Int = 2,
    val meditationDurationMinutes: Int = 5,
    val soundEnabled: Boolean = true,
    val upcomingAlertsEnabled: Boolean = true
)

data class ScheduledNotification(
    val id: String,
    val timeStr: String,
    val timestamp: Long,
    val type: ActivityType,
    val durationMinutes: Int,
    val title: String,
    val message: String
)

object SchedulerUtils {
    private val KEGEL_MESSAGES = listOf(
        Pair("Kegel: Contrações Rápidas", "Hora do treino! Faça contrações rápidas de 1 a 2 segundos do assoalho pélvico, relaxando em seguida."),
        Pair("Kegel: Sustentação Profunda", "Fortalecimento ativo: contraia os músculos pélvicos e segure firme de 5 a 10 segundos."),
        Pair("Kegel: O Elevador", "Controle gradual: imagine subir um elevador contraindo os músculos aos poucos, e depois desça relaxando devagar."),
        Pair("Kegel: Respiração e Foco", "Inspire relaxando e, ao expirar, realize uma contração firme e concentrada do assoalho pélvico."),
        Pair("Kegel: Resistência Ativa", "Mantenha uma contração suave de intensidade média por 15 segundos enquanto respira de forma fluida."),
        Pair("Kegel: Relaxamento Consciente", "Tão importante quanto contrair é relaxar completamente. Solte toda a musculatura pélvica.")
    )

    private val MEDITATION_MESSAGES = listOf(
        Pair("Meditação: Respiração Consciente", "Faça uma pausa de 5 minutos. Inspire em 4 segundos, segure por 4, expire em 4 e segure vazio."),
        Pair("Meditação: Silêncio Interior", "Pausa restauradora de 5 minutos. Encontre a paz que habita no espaço entre seus pensamentos.")
    )

    fun timeToMinutes(timeStr: String): Int {
        val parts = timeStr.split(":")
        if (parts.size < 2) return 480 // 08:00 default
        return parts[0].toIntOrNull() ?: 8 * 60 + (parts[1].toIntOrNull() ?: 0)
    }

    fun minutesToTime(minutes: Int): String {
        val hours = minutes / 60
        val mins = minutes % 60
        return String.format("%02d:%02d", hours, mins)
    }

    fun generateDailySchedule(config: UserConfig, baseDate: Date = Date()): List<ScheduledNotification> {
        val startMinutes = timeToMinutes(config.wakeTime)
        var endMinutes = timeToMinutes(config.sleepTime)
        if (endMinutes <= startMinutes) {
            endMinutes += 24 * 60
        }

        val activeDuration = endMinutes - startMinutes
        val totalNotifications = config.kegelCount + config.meditationCount

        if (activeDuration <= 0 || totalNotifications <= 0) return emptyList()

        val segmentDuration = activeDuration / totalNotifications
        val types = mutableListOf<ActivityType>().apply {
            repeat(config.kegelCount) { add(ActivityType.KEGEL) }
            repeat(config.meditationCount) { add(ActivityType.MEDITATION) }
        }
        types.shuffle()

        val notifications = mutableListOf<ScheduledNotification>()
        val calendar = Calendar.getInstance().apply {
            time = baseDate
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val midnightTimestamp = calendar.timeInMillis

        var lastMinutes = -999

        for (i in 0 until totalNotifications) {
            val segStart = startMinutes + i * segmentDuration
            val margin = (segmentDuration * 0.15).toInt()
            val offset = margin + if (segmentDuration - 2 * margin > 1) {
                Random.nextInt(segmentDuration - 2 * margin)
            } else {
                0
            }
            var targetMinutes = segStart + offset

            // Forçar espaçamento mínimo de 15 minutos entre lembretes
            if (targetMinutes < lastMinutes + 15) {
                targetMinutes = lastMinutes + 15
            }

            if (targetMinutes >= endMinutes) {
                targetMinutes = endMinutes - 5
            }

            lastMinutes = targetMinutes

            val timeStr = minutesToTime(targetMinutes % (24 * 60))
            val triggerTimestamp = midnightTimestamp + (targetMinutes * 60 * 1000L)

            val type = types[i]
            val duration = if (type == ActivityType.KEGEL) config.kegelDurationMinutes else config.meditationDurationMinutes

            val info = if (type == ActivityType.KEGEL) {
                KEGEL_MESSAGES[i % KEGEL_MESSAGES.size]
            } else {
                MEDITATION_MESSAGES[i % MEDITATION_MESSAGES.size]
            }

            notifications.add(
                ScheduledNotification(
                    id = "notif-$triggerTimestamp",
                    timeStr = timeStr,
                    timestamp = triggerTimestamp,
                    type = type,
                    durationMinutes = duration,
                    title = info.first,
                    message = info.second
                )
            )
        }

        return notifications.sortedBy { it.timestamp }
    }
}
