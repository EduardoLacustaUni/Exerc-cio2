pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
    versionCatalogs {
        create("libs") {
            version("androidGradlePlugin", "8.2.2")
            version("kotlin", "1.9.24")
            version("compose", "1.5.4")
            version("composeCompiler", "1.5.14")
            version("activityCompose", "1.8.2")
            version("coreKtx", "1.12.0")
            version("lifecycle", "2.7.0")
            version("material3", "1.1.2")

            plugin("android-application", "com.android.application").versionRef("androidGradlePlugin")
            plugin("kotlin-android", "org.jetbrains.kotlin.android").versionRef("kotlin")
        }
    }
}

rootProject.name = "KegelMeditation"
include(":app")
