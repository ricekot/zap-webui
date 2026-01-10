import org.gradle.nativeplatform.platform.internal.DefaultNativePlatform

plugins {
    base
    id("com.diffplug.spotless")
}

val os: OperatingSystem = DefaultNativePlatform.getCurrentOperatingSystem()

val webUiBuildDir = layout.buildDirectory.dir("webui")
val webUiBuildTasksGroup = "ZAP Web UI Build"

fun Exec.npmCommand(vararg args: String) {
    workingDir = file("webui")
    val npmArgs = listOf("npm") + args.toList()
    if (os.isWindows) {
        commandLine(listOf("cmd", "/c") + npmArgs)
    } else {
        commandLine(listOf("/bin/sh", "-c", npmArgs.joinToString(" ")))
    }
}

val installWebUiDependencies by tasks.registering(Exec::class) {
    group = webUiBuildTasksGroup
    description = "Installs npm dependencies for the web UI"
    npmCommand("ci")

    inputs.file("webui/package.json")
    inputs.file("webui/package-lock.json")
    outputs.dir("webui/node_modules")
}

val lintWebUi by tasks.registering(Exec::class) {
    group = webUiBuildTasksGroup
    description = "Runs ESLint on the web UI"
    dependsOn(installWebUiDependencies)
    npmCommand("run", "lint")
}

val buildWebUi by tasks.registering(Exec::class) {
    group = webUiBuildTasksGroup
    description = "Builds the web UI for production"
    dependsOn(installWebUiDependencies)
    npmCommand("run", "build")

    inputs.dir("webui/src")
    inputs.file("webui/index.html")
    inputs.file("webui/vite.config.ts")
    inputs.file("webui/tsconfig.json")
    inputs.file("webui/tsconfig.app.json")
    inputs.file("webui/tailwind.config.js")
    inputs.file("webui/postcss.config.js")
    outputs.dir("webui/dist")
}

val copyWebUiToAddon by tasks.registering(Copy::class) {
    group = webUiBuildTasksGroup
    description = "Copies the built web UI to the addon build directory"
    dependsOn(buildWebUi)

    from("webui/dist")
    into(webUiBuildDir.map { it.dir("webui") })
}

tasks.named(LifecycleBasePlugin.CHECK_TASK_NAME) {
    dependsOn(lintWebUi)
}

allprojects {
    apply(plugin = "com.diffplug.spotless")

    spotless {
        kotlinGradle {
            ktlint()
        }
    }
}
