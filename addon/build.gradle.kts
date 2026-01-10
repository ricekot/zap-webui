import org.zaproxy.gradle.addon.AddOnStatus
import org.zaproxy.gradle.addon.misc.ConvertMarkdownToHtml

plugins {
    `java-library`
    id("org.zaproxy.add-on") version "0.13.1"
    id("org.zaproxy.common")
}

description = "A modern web-based UI for ZAP accessible via browser."

val webUiBuildDir = rootProject.layout.buildDirectory.dir("webui")
val copyWebUiToAddon = rootProject.tasks.named("copyWebUiToAddon")

// Register the webui build output as part of the main source set
// This ensures the files get included in the JAR/ZAP file
sourceSets["main"].output.dir(mapOf("builtBy" to copyWebUiToAddon), webUiBuildDir)

zapAddOn {
    addOnId.set("webui")
    addOnName.set("Web UI")
    zapVersion.set("2.16.0")
    addOnStatus.set(AddOnStatus.ALPHA)

    releaseLink.set("https://github.com/zaproxy/zap-webui/compare/v@PREVIOUS_VERSION@...v@CURRENT_VERSION@")
    unreleasedLink.set("https://github.com/zaproxy/zap-webui/compare/v@CURRENT_VERSION@...HEAD")

    manifest {
        author.set("ZAP Dev Team")
        url.set("https://www.zaproxy.org/docs/desktop/addons/webui/")
        repo.set("https://github.com/zaproxy/zap-webui")
        changesFile.set(tasks.named<ConvertMarkdownToHtml>("generateManifestChanges").flatMap { it.html })

        files.from(webUiBuildDir)

        dependencies {
            addOns {
                register("commonlib") {
                    version.set(">= 1.36.0 & < 2.0.0")
                }
            }
        }
    }
}

java {
    val javaVersion = JavaVersion.VERSION_17
    sourceCompatibility = javaVersion
    targetCompatibility = javaVersion
}

// Ensure generateZapAddOnManifest waits for webui files
tasks.named("generateZapAddOnManifest") {
    dependsOn(copyWebUiToAddon)
}

dependencies {
    compileOnly("org.zaproxy.addon:commonlib:1.36.0")
}
