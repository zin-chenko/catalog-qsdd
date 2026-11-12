HashMap<String, Object> pipelineParameters = new HashMap<>()

pipelineParameters.put("devops_docker_usebuildkit", "true")
pipelineParameters.put("devops_installation_autotest_1", "qrun.autotest-qedms")
pipelineParameters.put("devops_installation_1", "qrun.dev-qedms")
if (BRANCH_NAME == "main" || BRANCH_NAME == "master") {
    pipelineParameters.put("devops_installation_1", "qrun.prod-qedms")
}
pipelineParameters.put("build_tool", "npm")
pipelineParameters.put("metadata_type", "pbcui")
pipelineParameters.put("pbcui_bundle_name_1", "QSDDUI")
pipelineParameters.put("pbcui_nvm_node_version", "22")
pipelineParameters.put("pbcui_build_command_bundle", 'cd "[BASE_DIRECTORY][PBC_DIRECTORY]" && node scripts/prepare-jenkins.mjs ..')
pipelineParameters.put("pbcui_repository_landingarchetype_url", "")
pipelineParameters.put("pbcui_repository_infopbc_url", "")

dsMsaPipeline(pipelineParameters)
