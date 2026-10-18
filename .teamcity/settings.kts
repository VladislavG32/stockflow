import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.triggers.vcs
import jetbrains.buildServer.configs.kotlin.triggers.finishBuildTrigger
import jetbrains.buildServer.configs.kotlin.vcs.GitVcsRoot

// Классические Build Configuration работают в бесплатной On-Premises редакции.
// Настройки читаются из доверенной ветки подготовки, не из произвольного PR.
version = "2026.2"
project {
    vcsRoot(Source)
    buildType(Verify)
    buildType(Publish)
    buildType(Stage)
}
object Source : GitVcsRoot({
    name = "StockFlow GitHub"
    url = "https://github.com/VladislavG32/stockflow.git"
    branch = "refs/heads/dev"
    branchSpec = "+:refs/heads/*"
    // Публичному репозиторию не нужен GitHub PAT для чтения.
})
object Verify : BuildType({
    id("StockFlow_Verify")
    name = "01 Verify all branches"
    maxRunningBuilds = 1
    vcs { checkoutMode = CheckoutMode.ON_AGENT; cleanCheckout = true; root(Source) }
    steps { script { name = "Проверки и Docker build"; scriptContent = "bash scripts/ci/verify.sh" } }
    triggers { vcs { branchFilter = "+:*" } }
    artifactRules = "artifacts/* => checks"
    requirements { equals("teamcity.agent.name", "stockflow-test-agent") }
})
object Publish : BuildType({
    id("StockFlow_Publish")
    name = "02 Publish DEV PROD"
    maxRunningBuilds = 1
    vcs { checkoutMode = CheckoutMode.ON_AGENT; cleanCheckout = true; root(Source); branchFilter = "+:dev\n+:prod" }
    params {
        param("env.CI_BRANCH", "%teamcity.build.branch%")
        param("env.IMAGE_REPO", "SET_DOCKERHUB_USER/stockflow")
        // Password-параметры env.DOCKERHUB_USER и env.DOCKERHUB_TOKEN задаются
        // в UI ТОЛЬКО этой конфигурации: Verify не должен их наследовать.
    }
    dependencies {
        snapshot(Verify) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL }
        artifacts(Verify) { buildRule = sameChain(); artifactRules = "checks/schema.sql => reference\nchecks/migrations.txt => reference" }
    }
    steps { script { name = "Публикация по полному SHA"; scriptContent = "bash scripts/ci/publish.sh" } }
    triggers { finishBuildTrigger { buildType = "${DslContext.projectId.value}_StockFlow_Verify"; successfulOnly = true; branchFilter = "+:dev\n+:prod" } }
    artifactRules = "artifacts/release.env\nreference/* => reference"
    requirements { equals("teamcity.agent.name", "stockflow-test-agent") }
})

object Stage : BuildType({
    id("StockFlow_Stage")
    name = "03 Deploy STAGE from DEV"
    maxRunningBuilds = 1
    vcs { checkoutMode = CheckoutMode.ON_AGENT; cleanCheckout = true; root(Source); branchFilter = "+:dev" }
    dependencies {
        snapshot(Publish) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL }
        artifacts(Publish) { buildRule = sameChain(); artifactRules = "release.env => incoming\nreference/* => reference" }
    }
    steps { script { name = "Обновление STAGE с сохранением БД"; scriptContent = "bash scripts/ci/deliver.sh stage" } }
    triggers { finishBuildTrigger { buildType = "${DslContext.projectId.value}_StockFlow_Publish"; successfulOnly = true; branchFilter = "+:dev" } }
    artifactRules = "artifacts/release.env\nartifacts/stage-reference/* => reference"
    requirements { equals("teamcity.agent.name", "stockflow-test-agent") }
})
