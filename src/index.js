import github from '@actions/github';
import core from '@actions/core';
import { TicsAnalyzer } from './tics/TicsAnalyzer.js';
import { TicsPublisher } from './tics/TicsPublisher.js';
import { ticsConfig, githubConfig } from './github/configuration.js';
import { createIssueComment } from './github/issues/issues.js';
import { getPRChangedFiles } from './github/pulls/pulls.js';
import { getErrorSummary, getQualityGateSummary, getLinkSummary, getFilesSummary } from './github/summary/index.js';

if (githubConfig.eventName == 'pull_request') {
    run();
} else {
    core.setFailed("This action is running only on pull request events.");
}

export async function run() {
    try {
        core.info(`\u001b[35m > Analysing new pull request for project ${ticsConfig.projectName}.`)
        const ticsAnalyzer = new TicsAnalyzer();
        const exitCode = await ticsAnalyzer.run();

        if (exitCode == 0) {
            core.info("TiCS Github Action run finished with  code " + exitCode);
            const ticsPublisher = new TicsPublisher();
            const qualitygates = await ticsPublisher.run();
            const changedFiles = await getPRChangedFiles();

            let results = {
                explorerUrl: "",
                changeSet: changedFiles,
                qualitygates: qualitygates
            };
            postSummary(results, false);

        } else if (exitCode != 0 && exitCode!= undefined) {
            core.setFailed("TiCS Github Action run failed with a non-zero exit code " + exitCode);
        }

    } catch (error) {
       core.error("Failed to run TiCS Github Action");
       core.error(error);
       core.setFailed(error.message);
    }
}

async function postSummary(summary, isError) {
    let commentBody = {};

    if (isError) {
        commentBody.body = getErrorSummary(summary);
        createIssueComment(commentBody)
    } else {
        commentBody.body = getQualityGateSummary(summary.qualitygates) + getLinkSummary(summary.explorerUrl) + getFilesSummary(summary.changeSet);
        createIssueComment(commentBody);
    }
}