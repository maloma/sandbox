import org.gradle.api.tasks.Sync

plugins {
    id("com.android.application")
}

val voiceLocaleTag = providers.gradleProperty("voiceLocaleTag").orElse("")
val repoRoot = rootProject.projectDir.parentFile.parentFile
val generatedWebAssets = layout.buildDirectory.dir("generated/familypilotWebAssets")

val prepareFamilyPilotWebAssets by tasks.registering(Sync::class) {
    from(repoRoot) {
        include("index.html")
        include("familypilot-*.js")
    }
    into(generatedWebAssets)
}

android {
    namespace = "com.familypilot.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.familypilot.app"
        minSdk = 31
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "FAMILY_PILOT_VOICE_LOCALE", "\"${voiceLocaleTag.get()}\"")
    }

    buildFeatures {
        buildConfig = true
    }

    sourceSets["main"].kotlin.srcDir("../../android")
    sourceSets["main"].assets.srcDir(generatedWebAssets.get().asFile)

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

tasks.named("preBuild").configure {
    dependsOn(prepareFamilyPilotWebAssets)
}

dependencies {
    implementation("androidx.activity:activity:1.10.1")
    implementation("androidx.core:core-ktx:1.19.0")
    implementation("androidx.webkit:webkit:1.17.0")
}
