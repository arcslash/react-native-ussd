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
}

val defaultCompileSdk = 33
val defaultMinSdk = 21
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
}
