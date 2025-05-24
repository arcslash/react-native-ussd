buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.1.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.0")
    }
}

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    `maven-publish`
    id("org.jlleitschuh.gradle.ktlint") version "11.6.1"
}

val defaultCompileSdk = 33
val defaultMinSdk = 31
val defaultTargetSdk = 33

android {
    namespace = "com.isharaux.ussd"
    compileSdk = defaultCompileSdk

    defaultConfig {
        minSdk = defaultMinSdk
        targetSdk = defaultTargetSdk
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        buildConfig = true
    }

    lint {
        abortOnError = false
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }
}

repositories {
    google()
    mavenCentral()
    mavenLocal()
    maven { url = uri("$rootDir/../node_modules/react-native/android") }
}

dependencies {
    implementation("com.facebook.react:react-native:+") // from node_modules
    implementation("androidx.localbroadcastmanager:localbroadcastmanager:1.0.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("io.mockk:mockk:1.13.3")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.1")
    testImplementation("org.robolectric:robolectric:4.11.1")
}

ktlint {
    version.set("0.49.1")
    verbose.set(true)
    android.set(true)
    outputToConsole.set(true)
    reporters {
        reporter(org.jlleitschuh.gradle.ktlint.reporter.ReporterType.PLAIN)
        reporter(org.jlleitschuh.gradle.ktlint.reporter.ReporterType.CHECKSTYLE)
    }
}
