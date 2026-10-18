import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.triggers.vcs
import jetbrains.buildServer.configs.kotlin.triggers.finishBuildTrigger
import jetbrains.buildServer.configs.kotlin.vcs.GitVcsRoot

// Server и тяжёлый build-agent находятся на отдельном Linux CI-хосте.
// TEST имеет только агент готовых контейнеров/доставки; Windows — SSH/Git/браузер.
version = "2026.2"
project {
    vcsRoot(Source)
    buildType(Verify)
    buildType(Acceptance)
    buildType(Publish)
    buildType(Stage)
    buildType(Prod)
}
object Source : GitVcsRoot({
    name = "StockFlow GitHub"
    url = "https://github.com/VladislavG32/stockflow.git"
    branch = "refs/heads/dev"
    branchSpec = "+:refs/heads/(*)"
})
object Verify : BuildType({
    id("StockFlow_Verify")
    name = "01 Verify all branches"
    maxRunningBuilds = 1
    vcs { checkoutMode = CheckoutMode.ON_AGENT; cleanCheckout = true; root(Source) }
    steps { script { name = "Linux CI: анализ, unit, build и архив образов"; scriptContent = "bash scripts/ci/verify.sh" } }
    triggers { vcs { branchFilter = "+:*" } }
    artifactRules = "artifacts/* => checks"
    requirements { equals("teamcity.agent.name", "stockflow-build-agent") }
})
// Строгая sameChain переносит именно собранные образы. На TEST нет docker build/npm ci.
object Acceptance : BuildType({
    id("StockFlow_Acceptance")
    name = "01b Acceptance PostgreSQL on TEST"
    maxRunningBuilds = 1
    vcs { checkoutMode = CheckoutMode.ON_AGENT; cleanCheckout = true; root(Source) }
    dependencies {
        snapshot(Verify) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL }
        artifacts(Verify) { buildRule = sameChain(); cleanDestination = true; artifactRules = "checks/ci-images.* => incoming" }
    }
    steps { script { name = "TEST: загрузить образы и проверить HTTP/PostgreSQL"; scriptContent = "bash scripts/ci/acceptance.sh" } }
    triggers { finishBuildTrigger { buildType = "${DslContext.projectId.value}_StockFlow_Verify"; successfulOnly = true; branchFilter = "+:*" } }
    artifactRules = "artifacts/* => checks"
    requirements { equals("teamcity.agent.name", "stockflow-test-agent") }
})
object Publish : BuildType({
    id("StockFlow_Publish")
    name = "02 Publish DEV PROD"
    maxRunningBuilds = 1
    vcs { checkoutMode = CheckoutMode.ON_AGENT; cleanCheckout = true; root(Source); branchFilter = "+:dev\n+:<default>\n+:prod" }
    params {
        param("env.CI_BRANCH", "%teamcity.build.vcs.branch.${DslContext.projectId.value}_Source%")
        param("env.IMAGE_REPO", "SET_DOCKERHUB_USER/stockflow")
        // Только здесь задать Password env.DOCKERHUB_USER и env.DOCKERHUB_TOKEN
        // через UI/credentialsJSON. Не наследовать секреты в Verify/Acceptance.
    }
    dependencies {
        snapshot(Acceptance) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL }
        artifacts(Verify) { buildRule = sameChain(); cleanDestination = true; artifactRules = "checks/ci-images.* => incoming" }
        artifacts(Acceptance) { buildRule = sameChain(); cleanDestination = true; artifactRules = "checks/schema.sql => reference\nchecks/migrations.txt => reference" }
    }
    steps { script { name = "Linux CI: push проверенных образов без rebuild"; scriptContent = "bash scripts/ci/publish.sh" } }
    triggers { finishBuildTrigger { buildType = "${DslContext.projectId.value}_StockFlow_Acceptance"; successfulOnly = true; branchFilter = "+:dev\n+:<default>\n+:prod" } }
    artifactRules = "artifacts/release.env\nreference/* => reference"
    requirements { equals("teamcity.agent.name", "stockflow-build-agent") }
})
object Stage : BuildType({
    id("StockFlow_Stage")
    name = "03 Deploy STAGE from DEV"
    maxRunningBuilds = 1
    vcs { checkoutMode = CheckoutMode.ON_AGENT; cleanCheckout = true; root(Source); branchFilter = "+:dev\n+:<default>" }
    dependencies {
        snapshot(Publish) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL }
        artifacts(Publish) { buildRule = sameChain(); cleanDestination = true; artifactRules = "release.env => incoming\nreference/* => reference" }
    }
    steps { script { name = "TEST: SSH-доставка на STAGE"; scriptContent = "bash scripts/ci/deliver.sh stage" } }
    triggers { finishBuildTrigger { buildType = "${DslContext.projectId.value}_StockFlow_Publish"; successfulOnly = true; branchFilter = "+:dev\n+:<default>" } }
    artifactRules = "artifacts/release.env\nartifacts/stage-reference/* => reference"
    requirements { equals("teamcity.agent.name", "stockflow-test-agent") }
})
object Prod : BuildType({
    id("StockFlow_Prod")
    name = "04 Promote verified STAGE to PROD MANUAL"
    maxRunningBuilds = 1
    vcs { checkoutMode = CheckoutMode.ON_AGENT; cleanCheckout = true; root(Source); branchFilter = "+:dev\n+:<default>" }
    dependencies {
        snapshot(Stage) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL }
        artifacts(Stage) { buildRule = sameChain(); cleanDestination = true; artifactRules = "release.env => incoming\nreference/* => reference" }
    }
    // Только ручной Promote успешной STAGE-сборки; триггер намеренно отсутствует.
    steps { script { name = "TEST: backup/rehearsal и доставка PROD"; scriptContent = "bash scripts/ci/deliver.sh prod" } }
    requirements { equals("teamcity.agent.name", "stockflow-test-agent") }
})
