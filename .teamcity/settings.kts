import jetbrains.buildServer.configs.kotlin.*
import jetbrains.buildServer.configs.kotlin.buildSteps.script
import jetbrains.buildServer.configs.kotlin.triggers.vcs
import jetbrains.buildServer.configs.kotlin.triggers.finishBuildTrigger
import jetbrains.buildServer.configs.kotlin.vcs.GitVcsRoot

// РљР»Р°СЃСЃРёС‡РµСЃРєРёРµ Build Configuration СЂР°Р±РѕС‚Р°СЋС‚ РІ Р±РµСЃРїР»Р°С‚РЅРѕР№ On-Premises СЂРµРґР°РєС†РёРё.
// РќР°СЃС‚СЂРѕР№РєРё С‡РёС‚Р°СЋС‚СЃСЏ РёР· РґРѕРІРµСЂРµРЅРЅРѕР№ РІРµС‚РєРё РїРѕРґРіРѕС‚РѕРІРєРё, РЅРµ РёР· РїСЂРѕРёР·РІРѕР»СЊРЅРѕРіРѕ PR.
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
    // РџСѓР±Р»РёС‡РЅРѕРјСѓ СЂРµРїРѕР·РёС‚РѕСЂРёСЋ РЅРµ РЅСѓР¶РµРЅ GitHub PAT РґР»СЏ С‡С‚РµРЅРёСЏ.
})
object Verify : BuildType({
    id("StockFlow_Verify")
    name = "01 Verify all branches"
    maxRunningBuilds = 1
    vcs { root(Source) }
    steps { script { name = "РџСЂРѕРІРµСЂРєРё Рё Docker build"; scriptContent = "bash scripts/ci/verify.sh" } }
    triggers { vcs { branchFilter = "+:*" } }
    artifactRules = "artifacts/** => checks"
    requirements { equals("teamcity.agent.name", "stockflow-test-agent") }
})
object Publish : BuildType({
    id("StockFlow_Publish")
    name = "02 Publish DEV PROD"
    maxRunningBuilds = 1
    vcs { root(Source); branchFilter = "+:dev\n+:prod" }
    params {
        param("env.CI_BRANCH", "%teamcity.build.branch%")
        param("env.IMAGE_REPO", "SET_DOCKERHUB_USER/stockflow")
        // Password-РїР°СЂР°РјРµС‚СЂС‹ env.DOCKERHUB_USER Рё env.DOCKERHUB_TOKEN Р·Р°РґР°СЋС‚СЃСЏ
        // РІ UI РўРћР›Р¬РљРћ СЌС‚РѕР№ РєРѕРЅС„РёРіСѓСЂР°С†РёРё: Verify РЅРµ РґРѕР»Р¶РµРЅ РёС… РЅР°СЃР»РµРґРѕРІР°С‚СЊ.
    }
    dependencies { snapshot(Verify) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL } }
    steps { script { name = "РџСѓР±Р»РёРєР°С†РёСЏ РїРѕ РїРѕР»РЅРѕРјСѓ SHA"; scriptContent = "bash scripts/ci/publish.sh" } }
    triggers { finishBuildTrigger { buildType = "StockFlow_Verify"; successfulOnly = true; branchFilter = "+:dev\n+:prod" } }
    artifactRules = "artifacts/release.env"
    requirements { equals("teamcity.agent.name", "stockflow-test-agent") }
})

object Stage : BuildType({
    id("StockFlow_Stage")
    name = "03 Deploy STAGE from DEV"
    maxRunningBuilds = 1
    vcs { root(Source); branchFilter = "+:dev" }
    dependencies {
        snapshot(Publish) { onDependencyFailure = FailureAction.FAIL_TO_START; onDependencyCancel = FailureAction.CANCEL }
        artifacts(Publish) { buildRule = sameChain(); artifactRules = "release.env => incoming" }
    }
    steps { script { name = "Обновление STAGE с сохранением БД"; scriptContent = "bash scripts/ci/deliver.sh stage" } }
    triggers { finishBuildTrigger { buildType = "StockFlow_Publish"; successfulOnly = true; branchFilter = "+:dev" } }
    requirements { equals("teamcity.agent.name", "stockflow-test-agent") }
})
