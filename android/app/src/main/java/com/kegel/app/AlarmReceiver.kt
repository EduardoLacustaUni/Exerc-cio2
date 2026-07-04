package com.kegel.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import java.util.Calendar
import java.util.Date

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val type = intent.getStringExtra("type") ?: "kegel"
        val title = intent.getStringExtra("title") ?: "Hora do Treino Kegel"
        val message = intent.getStringExtra("message") ?: "Faça sua série rápida para fortalecer sua musculatura."
        val durationMinutes = intent.getIntExtra("duration", 2)

        // 1. Dispara a Notificação Local
        showNotification(context, title, message, type)

        // 2. Reagenda o próximo lembrete aleatório para hoje ou amanhã
        scheduleNextAlarm(context)
    }

    private fun showNotification(context: Context, title: String, message: String, type: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "kegel_reminders_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Lembretes de Exercícios",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notificações para exercícios pélvicos de Kegel e meditação guiada"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400)
                
                val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                setSound(alarmSound, audioAttributes)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Abre o app nativo ao clicar na notificação
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("launch_session_type", type)
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm) // Substituir pelo ícone de launcher personalizado
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 400, 200, 400))
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    companion object {
        fun scheduleNextAlarm(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val sharedPrefs = context.getSharedPreferences("kegel_app_prefs", Context.MODE_PRIVATE)
            val wakeTime = sharedPrefs.getString("wake_time", "08:00") ?: "08:00"
            val sleepTime = sharedPrefs.getString("sleep_time", "22:00") ?: "22:00"
            val kegelCount = sharedPrefs.getInt("kegel_count", 10)
            val kegelDuration = sharedPrefs.getInt("kegel_duration", 2)
            val meditationCount = sharedPrefs.getInt("meditation_count", 2)
            val meditationDuration = sharedPrefs.getInt("meditation_duration", 5)
            val alertsEnabled = sharedPrefs.getBoolean("alerts_enabled", true)

            val intent = Intent(context, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                999,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            if (!alertsEnabled) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
                return
            }

            val config = UserConfig(
                wakeTime = wakeTime,
                sleepTime = sleepTime,
                kegelCount = kegelCount,
                kegelDurationMinutes = kegelDuration,
                meditationCount = meditationCount,
                meditationDurationMinutes = meditationDuration,
                soundEnabled = true,
                upcomingAlertsEnabled = true
            )

            val now = System.currentTimeMillis()
            var dailySchedule = SchedulerUtils.generateDailySchedule(config)

            // Filtra os eventos futuros para hoje
            var nextNotif = dailySchedule.firstOrNull { it.timestamp > now }

            // Se não houver mais eventos hoje, gera o cronograma para amanhã
            if (nextNotif == null) {
                val calendarTomorrow = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, 1)
                }
                dailySchedule = SchedulerUtils.generateDailySchedule(config, calendarTomorrow.time)
                nextNotif = dailySchedule.firstOrNull { it.timestamp > now }
            }

            if (nextNotif != null) {
                val alarmIntent = Intent(context, AlarmReceiver::class.java).apply {
                    putExtra("type", nextNotif.type.name.lowercase())
                    putExtra("title", nextNotif.title)
                    putExtra("message", nextNotif.message)
                    putExtra("duration", nextNotif.durationMinutes)
                }

                val alarmPendingIntent = PendingIntent.getBroadcast(
                    context,
                    999,
                    alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        nextNotif.timestamp,
                        alarmPendingIntent
                    )
                } else {
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        nextNotif.timestamp,
                        alarmPendingIntent
                    )
                }
            }
        }
    }
}
