# Projeto Android Nativo - Lembretes de Kegel & Meditação

Este diretório contém os códigos-fonte em **Kotlin puro** e **Jetpack Compose** para o aplicativo Android nativo. 

Como navegadores de celular suspendem abas em segundo plano (limitando o agendamento no React do navegador), a solução definitiva para o Android é rodar nativamente usando **`AlarmManager`** e **`BroadcastReceiver`**. Essa arquitetura garante o disparo preciso de notificações aleatórias mesmo com o aparelho bloqueado, em modo Doze ou após reiniciar o celular (idêntico ao app "Desencoste seus dentes").

## O que está incluso nesta pasta:
1. **`MainActivity.kt`**: Interface em Jetpack Compose que recria perfeitamente o visual dark slate moderno do nosso simulador Web (com anéis de progresso, tela de exercício ativo e abas).
2. **`AlarmReceiver.kt`**: Gerenciador que acorda em segundo plano para enviar a notificação (com vibração/som) e reagendar de forma inteligente o próximo alerta aleatório.
3. **`SchedulerUtils.kt`**: Algoritmo portado do TypeScript que calcula os intervalos aleatórios sem sobreposição e respeita o período de sono acordado.
4. **`AndroidManifest.xml`**: Configurações de permissões cruciais do Android (`SCHEDULE_EXACT_ALARM`, `POST_NOTIFICATIONS` e `RECEIVE_BOOT_COMPLETED`).

## Como exportar e abrir no Android Studio:
1. Clique no menu de configurações do **Google AI Studio** no canto superior direito.
2. Selecione **Export to ZIP** (ou vincule ao seu **GitHub**).
3. Extraia o conteúdo e abra a pasta `android` diretamente no **Android Studio**.
4. Configure as dependências padrão no seu `build.gradle.kts` (Jetpack Compose, Core KTX e Navigation).
