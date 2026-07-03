package com.kegel.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.*
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            AlarmReceiver.scheduleNextAlarm(this)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Solicita permissão de notificação para o Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                AlarmReceiver.scheduleNextAlarm(this)
            }
        } else {
            AlarmReceiver.scheduleNextAlarm(this)
        }

        setContent {
            KegelAppTheme {
                MainScreen()
            }
        }
    }
}

// CORES E ESTILO DO TEMA (Idêntico ao Web Slate Dark)
val Slate950 = Color(0xFF020617)
val Slate900 = Color(0xFF0F172A)
val Slate800 = Color(0xFF1E293B)
val Slate700 = Color(0xFF334155)
val Slate400 = Color(0xFF94A3B8)
val AccentKegel = Color(0xFFF59E0B) // Amber-500
val AccentMeditation = Color(0xFF0EA5E9) // Sky-500
val AccentSuccess = Color(0xFF10B981) // Emerald-500

@Composable
fun KegelAppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            background = Slate950,
            surface = Slate900,
            primary = AccentKegel,
            secondary = AccentMeditation,
            onBackground = Color.White,
            onSurface = Color.White
        ),
        content = content
    )
}

data class ActivityLogItem(
    val id: String,
    val timestamp: Long,
    val type: String,
    val durationMinutes: Int,
    val completed: Boolean
)

@Composable
fun MainScreen() {
    val context = LocalContext.current
    val sharedPrefs = remember { context.getSharedPreferences("kegel_app_prefs", Context.MODE_PRIVATE) }

    // Estados Reativos do App
    var currentTab by remember { mutableStateOf("dashboard") }
    var wakeTime by remember { mutableStateOf(sharedPrefs.getString("wake_time", "08:00") ?: "08:00") }
    var sleepTime by remember { mutableStateOf(sharedPrefs.getString("sleep_time", "22:00") ?: "22:00") }
    var kegelCount by remember { mutableStateOf(sharedPrefs.getInt("kegel_count", 10)) }
    var kegelDuration by remember { mutableStateOf(sharedPrefs.getInt("kegel_duration", 2)) }
    var meditationCount by remember { mutableStateOf(sharedPrefs.getInt("meditation_count", 2)) }
    var meditationDuration by remember { mutableStateOf(sharedPrefs.getInt("meditation_duration", 5)) }
    var alertsEnabled by remember { mutableStateOf(sharedPrefs.getBoolean("alerts_enabled", true)) }

    // Histórico de Logs
    val logsList = remember { mutableStateListOf<ActivityLogItem>() }
    
    // Sessão Ativa
    var activeSessionType by remember { mutableStateOf<String?>(null) }
    var activeSessionDuration by remember { mutableStateOf(2) }

    // Carregar logs iniciais do cache
    LaunchedEffect(Unit) {
        val count = sharedPrefs.getInt("logs_count", 0)
        for (i in 0 until count) {
            val id = sharedPrefs.getString("log_id_$i", "") ?: ""
            val ts = sharedPrefs.getLong("log_ts_$i", 0L)
            val type = sharedPrefs.getString("log_type_$i", "") ?: ""
            val duration = sharedPrefs.getInt("log_dur_$i", 0)
            val completed = sharedPrefs.getBoolean("log_comp_$i", true)
            if (id.isNotEmpty()) {
                logsList.add(ActivityLogItem(id, ts, type, duration, completed))
            }
        }
    }

    fun saveConfig() {
        sharedPrefs.edit().apply {
            putString("wake_time", wakeTime)
            putString("sleep_time", sleepTime)
            putInt("kegel_count", kegelCount)
            putInt("kegel_duration", kegelDuration)
            putInt("meditation_count", meditationCount)
            putInt("meditation_duration", meditationDuration)
            putBoolean("alerts_enabled", alertsEnabled)
            apply()
        }
        AlarmReceiver.scheduleNextAlarm(context)
    }

    fun addLog(type: String, duration: Int) {
        val newLog = ActivityLogItem(
            id = "log-${System.currentTimeMillis()}",
            timestamp = System.currentTimeMillis(),
            type = type,
            durationMinutes = duration,
            completed = true
        )
        logsList.add(0, newLog)
        
        // Persistir log no sharedPrefs
        sharedPrefs.edit().apply {
            putInt("logs_count", logsList.size)
            for (idx in logsList.indices) {
                val item = logsList[idx]
                putString("log_id_$idx", item.id)
                putLong("log_ts_$idx", item.timestamp)
                putString("log_type_$idx", item.type)
                putInt("log_dur_$idx", item.durationMinutes)
                putBoolean("log_comp_$idx", item.completed)
            }
            apply()
        }
    }

    Scaffold(
        bottomBar = {
            if (activeSessionType == null) {
                NavigationBar(
                    containerColor = Slate900,
                    modifier = Modifier.border(0.5.dp, Slate800, RoundedCornerShape(0.dp))
                ) {
                    NavigationBarItem(
                        selected = currentTab == "dashboard",
                        onClick = { currentTab = "dashboard" },
                        icon = { Icon(Icons.Default.Home, contentDescription = "Dashboard") },
                        label = { Text("Início", fontSize = 10.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = AccentKegel,
                            selectedTextColor = AccentKegel,
                            unselectedIconColor = Slate400,
                            unselectedTextColor = Slate400,
                            indicatorColor = Slate800
                        )
                    )
                    NavigationBarItem(
                        selected = currentTab == "history",
                        onClick = { currentTab = "history" },
                        icon = { Icon(Icons.Default.List, contentDescription = "Histórico") },
                        label = { Text("Histórico", fontSize = 10.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = AccentKegel,
                            selectedTextColor = AccentKegel,
                            unselectedIconColor = Slate400,
                            unselectedTextColor = Slate400,
                            indicatorColor = Slate800
                        )
                    )
                    NavigationBarItem(
                        selected = currentTab == "settings",
                        onClick = { currentTab = "settings" },
                        icon = { Icon(Icons.Default.Settings, contentDescription = "Configurações") },
                        label = { Text("Ajustes", fontSize = 10.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = AccentKegel,
                            selectedTextColor = AccentKegel,
                            unselectedIconColor = Slate400,
                            unselectedTextColor = Slate400,
                            indicatorColor = Slate800
                        )
                    )
                }
            }
        },
        containerColor = Slate950
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Slate950)
        ) {
            if (activeSessionType != null) {
                ActiveSessionScreen(
                    type = activeSessionType!!,
                    durationMinutes = activeSessionDuration,
                    onClose = { completed ->
                        if (completed) {
                            addLog(activeSessionType!!, activeSessionDuration)
                        }
                        activeSessionType = null
                    }
                )
            } else {
                when (currentTab) {
                    "dashboard" -> DashboardView(
                        kegelCount = kegelCount,
                        meditationCount = meditationCount,
                        logs = logsList,
                        alertsEnabled = alertsEnabled,
                        onStartSession = { type, duration ->
                            activeSessionType = type
                            activeSessionDuration = duration
                        }
                    )
                    "history" -> HistoryView(logs = logsList, onClear = {
                        logsList.clear()
                        sharedPrefs.edit().putInt("logs_count", 0).apply()
                    })
                    "settings" -> SettingsView(
                        wakeTime = wakeTime,
                        sleepTime = sleepTime,
                        kegelCount = kegelCount,
                        kegelDuration = kegelDuration,
                        meditationCount = meditationCount,
                        meditationDuration = meditationDuration,
                        alertsEnabled = alertsEnabled,
                        onWakeTimeChange = { wakeTime = it; saveConfig() },
                        onSleepTimeChange = { sleepTime = it; saveConfig() },
                        onKegelCountChange = { kegelCount = it; saveConfig() },
                        onKegelDurationChange = { kegelDuration = it; saveConfig() },
                        onMeditationCountChange = { meditationCount = it; saveConfig() },
                        onMeditationDurationChange = { meditationDuration = it; saveConfig() },
                        onAlertsEnabledChange = { alertsEnabled = it; saveConfig() }
                    )
                }
            }
        }
    }
}

// 1. TELA PRINCIPAL (DASHBOARD)
@Composable
fun DashboardView(
    kegelCount: Int,
    meditationCount: Int,
    logs: List<ActivityLogItem>,
    alertsEnabled: Boolean,
    onStartSession: (String, Int) -> Unit
) {
    val today = remember { Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, 0) }.timeInMillis }
    val todayLogs = logs.filter { it.timestamp >= today && it.completed }
    val kegelDone = todayLogs.count { it.type == "kegel" }
    val meditationDone = todayLogs.count { it.type == "meditation" }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // Cabeçalho
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Olá, Praticante!",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Fortaleça sua saúde e presença hoje.",
                    fontSize = 12.sp,
                    color = Slate400
                )
            }
            // Streak Badge
            Row(
                modifier = Modifier
                    .background(Color(0xFF1E293B), RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Star, contentDescription = "Fogo", tint = AccentKegel, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("3 Dias", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }

        // Card de Visão Geral / Contadores
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Slate900, Slate950)
                    )
                )
                .border(0.5.dp, Slate800, RoundedCornerShape(24.dp))
                .padding(20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text(
                    text = if (alertsEnabled) "Avisos Ativos Hoje" else "Ritmo Diário Livre",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate400,
                    fontFamily = FontFamily.Monospace
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Kegel Progress
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Kegel Concluídos", fontSize = 11.sp, color = Slate400)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("$kegelDone", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = AccentKegel)
                            Text(" / $kegelCount", fontSize = 12.sp, color = Slate700)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        LinearProgressIndicator(
                            progress = if (kegelCount > 0) kegelDone.toFloat() / kegelCount else 0f,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(4.dp)
                                .clip(CircleShape),
                            color = AccentKegel,
                            trackColor = Slate950
                        )
                    }

                    Spacer(modifier = Modifier.width(20.dp))

                    // Meditation Progress
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Meditações", fontSize = 11.sp, color = Slate400)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("$meditationDone", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = AccentMeditation)
                            Text(" / $meditationCount", fontSize = 12.sp, color = Slate700)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        LinearProgressIndicator(
                            progress = if (meditationCount > 0) meditationDone.toFloat() / meditationCount else 0f,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(4.dp)
                                .clip(CircleShape),
                            color = AccentMeditation,
                            trackColor = Slate950
                        )
                    }
                }
            }
        }

        // AÇÕES RÁPIDAS
        Text("Iniciar Sessão Manual", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate400)

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Botão Kegel
            Card(
                onClick = { onStartSession("kegel", 2) },
                modifier = Modifier
                    .weight(1f)
                    .height(96.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Slate900),
                border = CardDefaults.outlinedCardBorder().copy(width = 0.5.dp, brush = SolidColor(Slate800))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(14.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Box(
                        modifier = Modifier
                            .background(AccentKegel.copy(alpha = 0.1f), CircleShape)
                            .padding(6.dp)
                    ) {
                        Icon(Icons.Default.Favorite, contentDescription = "Kegel Icon", tint = AccentKegel, modifier = Modifier.size(16.dp))
                    }
                    Column {
                        Text("Exercício Kegel", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("2 Minutos", fontSize = 9.sp, color = Slate400, fontFamily = FontFamily.Monospace)
                    }
                }
            }

            // Botão Meditação
            Card(
                onClick = { onStartSession("meditation", 5) },
                modifier = Modifier
                    .weight(1f)
                    .height(96.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Slate900),
                border = CardDefaults.outlinedCardBorder().copy(width = 0.5.dp, brush = SolidColor(Slate800))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(14.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Box(
                        modifier = Modifier
                            .background(AccentMeditation.copy(alpha = 0.1f), CircleShape)
                            .padding(6.dp)
                    ) {
                        Icon(Icons.Default.Menu, contentDescription = "Medit Icon", tint = AccentMeditation, modifier = Modifier.size(16.dp))
                    }
                    Column {
                        Text("Meditação", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("5 Minutos", fontSize = 9.sp, color = Slate400, fontFamily = FontFamily.Monospace)
                    }
                }
            }
        }
    }
}

// 2. TELA DE SESSÃO ATIVA (Simulador Visual Elegante)
data class ExerciseStep(
    val title: String,
    val instruction: String,
    val durationSeconds: Int
)

val KegelSteps = listOf(
    ExerciseStep("1. Ativação Gradual", "Comece a contrair suavemente os músculos do assoalho pélvico. Segure por 3s e solte devagar.", 30),
    ExerciseStep("2. Sustentação e Força", "Contraia com firmeza e mantenha os músculos tensionados. Respire livremente.", 30),
    ExerciseStep("3. Agilidade Pélvica", "Faça ciclos rápidos de contração e relaxamento consecutivos de 1 segundo.", 30),
    ExerciseStep("4. Relaxamento Total", "Sinta a descompressão e relaxe completamente a musculatura pélvica profunda.", 30)
)

val MeditationSteps = listOf(
    ExerciseStep("1. Inspire de Devagar", "Puxe o ar suavemente pelas narinas enchendo os pulmões de oxigênio vital.", 75),
    ExerciseStep("2. Expire e Solte", "Solte todo o ar lentamente esvaziando a mente de qualquer peso.", 75),
    ExerciseStep("3. Presença Pura", "Permaneça em silêncio absoluto apenas observando a pulsação do seu ser.", 150)
)

@Composable
fun ActiveSessionScreen(
    type: String,
    durationMinutes: Int,
    onClose: (Boolean) -> Unit
) {
    val steps = if (type == "kegel") KegelSteps else MeditationSteps
    val totalSeconds = durationMinutes * 60
    var secondsRemaining by remember { mutableStateOf(totalSeconds) }
    var isPlaying by remember { mutableStateOf(true) }
    var currentStepIdx by remember { mutableStateOf(0) }
    var showSuccess by remember { mutableStateOf(false) }

    // Calcula qual step está ativo com base nos segundos restantes
    LaunchedEffect(secondsRemaining, isPlaying) {
        if (isPlaying && secondsRemaining > 0) {
            delay(1000L)
            secondsRemaining--
            
            val elapsed = totalSeconds - secondsRemaining
            val stepDur = totalSeconds / steps.size
            currentStepIdx = (elapsed / stepDur).coerceIn(0, steps.size - 1)
        } else if (secondsRemaining == 0) {
            showSuccess = true
        }
    }

    val progress = secondsRemaining.toFloat() / totalSeconds.toFloat()
    val animatedProgress by animateFloatAsState(targetValue = progress, animationSpec = tween(500))

    val colorAccent = if (type == "kegel") AccentKegel else AccentMeditation

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Topo da tela
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .background(colorAccent.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
                        .padding(8.dp)
                ) {
                    Icon(
                        if (type == "kegel") Icons.Default.Favorite else Icons.Default.Add,
                        contentDescription = "Session",
                        tint = colorAccent,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = if (type == "kegel") "Treino de Kegel" else "Meditação Guiada",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text("$durationMinutes Minutos", fontSize = 10.sp, color = Slate400)
                }
            }
            IconButton(onClick = { onClose(false) }) {
                Icon(Icons.Default.Close, contentDescription = "Fechar", tint = Slate400)
            }
        }

        if (showSuccess) {
            // Sucesso
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(AccentSuccess.copy(alpha = 0.15f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Check, contentDescription = "Concluído", tint = AccentSuccess, modifier = Modifier.size(32.dp))
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text("Sessão Concluída!", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Incrível! Você concluiu sua série com sucesso. Isso eleva seu bem-estar e fortalece sua saúde.",
                    fontSize = 12.sp,
                    color = Slate400,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = { onClose(true) },
                    colors = ButtonDefaults.buttonColors(containerColor = colorAccent)
                ) {
                    Text("Voltar ao Painel", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate950)
                }
            }
        } else {
            // Cronômetro Circular
            Box(
                modifier = Modifier
                    .size(200.dp)
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                androidx.compose.foundation.Canvas(modifier = Modifier.size(180.dp)) {
                    drawCircle(color = Slate900, radius = size.minDimension / 2, style = Stroke(width = 6.dp.toPx()))
                    drawArc(
                        color = colorAccent,
                        startAngle = -90f,
                        sweepAngle = animatedProgress * 360f,
                        useCenter = false,
                        style = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round)
                    )
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    val minutes = secondsRemaining / 60
                    val seconds = secondsRemaining % 60
                    Text(
                        text = String.format("%02d:%02d", minutes, seconds),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontFamily = FontFamily.Monospace
                    )
                    Text("Faltando", fontSize = 10.sp, color = Slate400)
                }
            }

            // Instruções do Step Ativo
            val activeStep = steps[currentStepIdx]
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                colors = CardDefaults.cardColors(containerColor = Slate900),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(activeStep.title, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colorAccent)
                    Text(activeStep.instruction, fontSize = 11.sp, color = Color.White, lineHeight = 16.sp)
                }
            }

            // Controles de Play/Pause
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                FloatingActionButton(
                    onClick = { isPlaying = !isPlaying },
                    containerColor = if (isPlaying) Slate900 else colorAccent,
                    contentColor = if (isPlaying) Color.White else Slate950,
                    shape = CircleShape,
                    modifier = Modifier.size(56.dp)
                ) {
                    Icon(
                        if (isPlaying) Icons.Default.PlayArrow else Icons.Default.PlayArrow, // Substituir pelo correto em produção
                        contentDescription = "PlayPause"
                    )
                }
            }
        }
    }
}

// 3. ABA HISTÓRICO
@Composable
fun HistoryView(logs: List<ActivityLogItem>, onClear: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Seu Histórico", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
            if (logs.isNotEmpty()) {
                Text(
                    "Limpar Tudo",
                    fontSize = 11.sp,
                    color = Color.Red,
                    modifier = Modifier.clickable { onClear() }
                )
            }
        }

        if (logs.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text("Nenhum exercício registrado hoje.", fontSize = 12.sp, color = Slate400)
            }
        } else {
            val sdf = remember { SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()) }
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(logs) { log ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Slate900, RoundedCornerShape(12.dp))
                            .border(0.5.dp, Slate800, RoundedCornerShape(12.dp))
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .background(
                                        if (log.type == "kegel") AccentKegel.copy(alpha = 0.1f) else AccentMeditation.copy(alpha = 0.1f),
                                        CircleShape
                                    )
                                    .padding(6.dp)
                            ) {
                                Icon(
                                    if (log.type == "kegel") Icons.Default.Favorite else Icons.Default.Add,
                                    contentDescription = "Log Type",
                                    tint = if (log.type == "kegel") AccentKegel else AccentMeditation,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    if (log.type == "kegel") "Treino de Kegel" else "Meditação",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(sdf.format(Date(log.timestamp)), fontSize = 9.sp, color = Slate400)
                            }
                        }
                        Text("+${log.durationMinutes}m", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AccentSuccess, fontFamily = FontFamily.Monospace)
                    }
                }
            }
        }
    }
}

// 4. ABA AJUSTES (SETTINGS)
@Composable
fun SettingsView(
    wakeTime: String,
    sleepTime: String,
    kegelCount: Int,
    kegelDuration: Int,
    meditationCount: Int,
    meditationDuration: Int,
    alertsEnabled: Boolean,
    onWakeTimeChange: (String) -> Unit,
    onSleepTimeChange: (String) -> Unit,
    onKegelCountChange: (Int) -> Unit,
    onKegelDurationChange: (Int) -> Unit,
    onMeditationCountChange: (Int) -> Unit,
    onMeditationDurationChange: (Int) -> Unit,
    onAlertsEnabledChange: (Boolean) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Configurações", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)

        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Período de Acordado
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate900),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Período Ativo", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = wakeTime,
                                onValueChange = onWakeTimeChange,
                                label = { Text("Acordar", fontSize = 9.sp) },
                                modifier = Modifier.weight(1f),
                                textStyle = LocalTextStyle.current.copy(fontSize = 11.sp)
                            )
                            OutlinedTextField(
                                value = sleepTime,
                                onValueChange = onSleepTimeChange,
                                label = { Text("Dormir", fontSize = 9.sp) },
                                modifier = Modifier.weight(1f),
                                textStyle = LocalTextStyle.current.copy(fontSize = 11.sp)
                            )
                        }
                    }
                }
            }

            // Metas Diárias de Frequência
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate900),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Metas Diárias", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)

                        // Kegel Slider
                        Column {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Lembretes Kegel", fontSize = 11.sp, color = Slate400)
                                Text("$kegelCount por dia", fontSize = 11.sp, color = AccentKegel, fontWeight = FontWeight.Bold)
                            }
                            Slider(
                                value = kegelCount.toFloat(),
                                onValueChange = { onKegelCountChange(it.toInt()) },
                                valueRange = 2f..15f,
                                colors = SliderDefaults.colors(activeTrackColor = AccentKegel, thumbColor = AccentKegel)
                            )
                        }

                        // Meditation Slider
                        Column {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Lembretes Meditação", fontSize = 11.sp, color = Slate400)
                                Text("$meditationCount por dia", fontSize = 11.sp, color = AccentMeditation, fontWeight = FontWeight.Bold)
                            }
                            Slider(
                                value = meditationCount.toFloat(),
                                onValueChange = { onMeditationCountChange(it.toInt()) },
                                valueRange = 1f..5f,
                                colors = SliderDefaults.colors(activeTrackColor = AccentMeditation, thumbColor = AccentMeditation)
                            )
                        }
                    }
                }
            }

            // Notificações / Agendamento em segundo plano
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate900),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Avisar Próximos Eventos", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            Text("Dispara alertas e vibração nativos", fontSize = 10.sp, color = Slate400)
                        }
                        Switch(
                            checked = alertsEnabled,
                            onCheckedChange = onAlertsEnabledChange,
                            colors = SwitchDefaults.colors(checkedThumbColor = AccentKegel, checkedTrackColor = AccentKegel.copy(alpha = 0.5f))
                        )
                    }
                }
            }
        }
    }
}
