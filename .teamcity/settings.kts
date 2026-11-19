import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.buildFeatures.XmlReport
import jetbrains.buildServer.configs.kotlin.buildFeatures.xmlReport
import jetbrains.buildServer.configs.kotlin.triggers.vcs
import jetbrains.buildServer.configs.kotlin.triggers.finishBuildTrigger
import jetbrains.buildServer.configs.kotlin.vcs.GitVcsRoot

// Фактически Server обнаружен на TEST http://192.168.56.11:8111.
// Build-agent также запускался на TEST; имена/доступность перепроверить после старта VM.
version = "2026.2"
project {
    vcsRoot(Source)
    buildType(Verify)
    buildType(Acceptance)
    buildType(Publish)
    buildType(Stage)
}
object Stage : BuildType({
    id("StockFlow_Stage")
    name = "03 Deploy STAGE from DEV"
    maxRunningBuilds = 1
    vcs { checkoutMode = CheckoutMode.ON_AGENT; cleanCheckout = true; root(Source); branchFilter = "+:dev\n+:<default>" }
    params { param("env.CI_BRANCH", "%teamcity.build.vcs.branch.${DslContext.projectId.value}_Source%") }
    dependencies {
        snapshot(Publish) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL }
        artifacts(Publish) { buildRule = sameChain(); cleanDestination = true; artifactRules = "release.env => incoming" }
    }
    steps { script { name = "TEST: доставка проверенных digest на STAGE"; scriptContent = "bash scripts/ci/deliver.sh stage" } }
    // До проверки VM доставка также запускается только вручную.
    triggers { finishBuildTrigger { enabled = false; buildType = "${DslContext.projectId.value}_StockFlow_Publish"; successfulOnly = true; branchFilter = "+:dev\n+:<default>" } }
    requirements { equals("teamcity.agent.name", "stockflow-test-agent") }
})
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
    failureConditions { nonZeroExitCode = true; testFailure = true }
    steps {
        script {
            id = "Lab6_ESLint"
            name = "Static Analysis — ESLint"
            scriptContent = "bash scripts/ci/lint.sh"
        }
        script {
            id = "Lab6_Gitleaks"
            name = "Secret Scan — Gitleaks"
            scriptContent = "bash scripts/ci/static.sh"
        }
        script {
            id = "Lab8_SQL"
            name = "SQL Security — PostgreSQL migrations"
            scriptContent = "bash scripts/ci/sql.sh"
        }
        script {
            id = "Lab7_Unit"
            name = "Unit tests — Node.js"
            scriptContent = """
                if [ -f scripts/ci/unit.sh ]; then
                  bash scripts/ci/unit.sh
                else
                  echo 'Unit tests are included in the Verify script at this revision.'
                fi
            """.trimIndent()
        }
        script {
            id = "Verify_Build"
            name = "Linux CI: проверки, сборка и архив образов"
            scriptContent = "bash scripts/ci/verify.sh"
        }
    }
    features { xmlReport { reportType = XmlReport.XmlReportType.JUNIT; rules = "+:artifacts/unit.junit.xml" } }
    artifactRules = "artifacts/* => checks"
    requirements { equals("teamcity.agent.name", "stockflow-build-agent") }
})
object Acceptance : BuildType({
    id("StockFlow_Acceptance")
    name = "Acceptance — PostgreSQL 17"
    maxRunningBuilds = 1
    vcs { checkoutMode = CheckoutMode.ON_AGENT; cleanCheckout = true; root(Source) }
    failureConditions { nonZeroExitCode = true; testFailure = true }
    dependencies {
        snapshot(Verify) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL }
        artifacts(Verify) { buildRule = sameChain(); cleanDestination = true; artifactRules = "checks/ci-images.* => incoming" }
    }
    steps {
        script {
            id = "Lab7_Integration"
            name = "Integration tests — HTTP and isolated PostgreSQL 17"
            scriptContent = "bash scripts/ci/integration.sh"
        }
    }
    features { xmlReport { reportType = XmlReport.XmlReportType.JUNIT; rules = "+:artifacts/integration.junit.xml\n+:artifacts/persistence.junit.xml" } }
    triggers {
        vcs {
            branchFilter = "+:<default>\n+:prod\n+:feature/*\n+:fix/*"
            watchChangesInDependencies = true
        }
    }
    artifactRules = "artifacts/* => acceptance"
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
        snapshot(Verify) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL }
        artifacts(Verify) { buildRule = sameChain(); cleanDestination = true; artifactRules = "checks/ci-images.* => incoming" }
    }
    steps { script { name = "Linux CI: push проверенных образов без rebuild"; scriptContent = "bash scripts/ci/publish.sh" } }
    // Подготовка перед ЛР №5: Publish доступен вручную, автоматический запуск запрещён.
    triggers { finishBuildTrigger { enabled = false; buildType = "${DslContext.projectId.value}_StockFlow_Verify"; successfulOnly = true; branchFilter = "+:dev\n+:<default>\n+:prod" } }
    artifactRules = "artifacts/release.env"
    requirements { equals("teamcity.agent.name", "stockflow-build-agent") }
})
