import com.android.build.gradle.LibraryExtension
import org.gradle.api.tasks.javadoc.Javadoc
import org.gradle.jvm.tasks.Jar
import java.util.Properties
import groovy.json.JsonSlurper

plugins {
    id("com.android.library")
    `maven-publish`
}

val defaultCompileSdk = 33
val defaultBuildToolsVersion = "33.0.0"
val defaultMinSdk = 16
val defaultTargetSdk = 33

fun safeExtGet(prop: String, fallback: Int): Int {
    return if (rootProject.extra.has(prop)) rootProject.extra.get(prop) as Int else fallback
}

android {
    compileSdk = safeExtGet("compileSdkVersion", defaultCompileSdk)
    buildToolsVersion = safeExtGet("buildToolsVersion", defaultBuildToolsVersion).toString()

    defaultConfig {
        minSdk = safeExtGet("minSdkVersion", defaultMinSdk)
        targetSdk = safeExtGet("targetSdkVersion", defaultTargetSdk)
        versionCode = 1
        versionName = "1.0"
    }

    lint {
        abortOnError = false
    }
}

repositories {
    mavenLocal()
    maven { url = uri("$rootDir/../node_modules/react-native/android") }
    maven { url = uri("$rootDir/../node_modules/jsc-android/dist") }
    google()
    mavenCentral()
}

dependencies {
    implementation("com.facebook.react:react-native:+") // From node_modules
    implementation("androidx.localbroadcastmanager:localbroadcastmanager:1.0.0")
}

// Publishing (similar to installArchives in Groovy)
afterEvaluate {
    extensions.configure<PublishingExtension>("publishing") {
        publications {
            create<MavenPublication>("release") {
                from(components["release"])

                val packageJsonFile = file("../package.json")
                val packageJson = JsonSlurper().parseText(packageJsonFile.readText()) as Map<*, *>

                groupId = "com.isharaux.ussd"
                artifactId = packageJson["name"] as String
                version = packageJson["version"] as String

                pom {
                    name.set(packageJson["title"] as String)
                    description.set(packageJson["description"] as String)
                    url.set((packageJson["repository"] as Map<*, *>)["baseUrl"] as String)

                    licenses {
                        license {
                            name.set(packageJson["license"] as String)
                            url.set(
                                "${(packageJson["repository"] as Map<*, *>)["baseUrl"]}/blob/master/${
                                    packageJson["licenseFilename"]
                                }"
                            )
                            distribution.set("repo")
                        }
                    }

                    developers {
                        developer {
                            id.set(((packageJson["author"] as Map<*, *>)["username"] ?: "") as String)
                            name.set(((packageJson["author"] as Map<*, *>)["name"] ?: "") as String)
                        }
                    }
                }
            }
        }

        repositories {
            maven {
                url = uri("file://${projectDir}/../android/maven")
            }
        }
    }
}
