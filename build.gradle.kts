import org.gradle.nativeplatform.platform.internal.DefaultNativePlatform

plugins {
    base
    id("com.diffplug.spotless")
}

val os: OperatingSystem = DefaultNativePlatform.getCurrentOperatingSystem()

val webUiBuildDir = layout.buildDirectory.dir("webui")
val webUiBuildTasksGroup = "ZAP Web UI Build"

fun Exec.bunCommand(vararg args: String) {
    workingDir = file("webui")
    val bunArgs = listOf("bun") + args.toList()
    if (os.isWindows) {
        commandLine(listOf("cmd", "/c") + bunArgs)
    } else {
        commandLine(listOf("/bin/sh", "-c", bunArgs.joinToString(" ")))
    }
}

val installWebUiDependencies by tasks.registering(Exec::class) {
    group = webUiBuildTasksGroup
    description = "Installs bun dependencies for the web UI"
    bunCommand("install", "--frozen-lockfile")

    inputs.file("webui/package.json")
    inputs.file("webui/bun.lock")
    outputs.dir("webui/node_modules")
}

val lintWebUi by tasks.registering(Exec::class) {
    group = webUiBuildTasksGroup
    description = "Runs ESLint on the web UI"
    dependsOn(installWebUiDependencies)
    bunCommand("run", "lint")
}

val testWebUi by tasks.registering(Exec::class) {
    group = webUiBuildTasksGroup
    description = "Runs unit tests for the web UI"
    dependsOn(installWebUiDependencies)
    bunCommand("run", "test")

    inputs.dir("webui/src")
    inputs.file("webui/vitest.config.ts")
}

val lintFixWebUi by tasks.registering(Exec::class) {
    group = webUiBuildTasksGroup
    description = "Runs ESLint on the web UI with auto-fix"
    dependsOn(installWebUiDependencies)
    bunCommand("run", "lint", "--", "--fix")
}

val buildWebUi by tasks.registering(Exec::class) {
    group = webUiBuildTasksGroup
    description = "Builds the web UI for production"
    dependsOn(installWebUiDependencies)
    bunCommand("run", "build")

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

val formatCheckWebUi by tasks.registering(Exec::class) {
    group = webUiBuildTasksGroup
    description = "Checks formatting of the web UI with Prettier"
    dependsOn(installWebUiDependencies)
    bunCommand("run", "format:check")
}

tasks.named(LifecycleBasePlugin.CHECK_TASK_NAME) {
    dependsOn(lintWebUi)
    dependsOn(testWebUi)
    dependsOn(formatCheckWebUi)
}

allprojects {
    apply(plugin = "com.diffplug.spotless")

    spotless {
        kotlinGradle {
            ktlint()
        }
    }
}
