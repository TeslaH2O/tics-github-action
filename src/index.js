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
        const result = await ticsAnalyzer.run();

        if (result) {
            core.info(result);

            let locateExplorerUrl = result.match(/http.*Explorer.*/g);
            let explorerUrl = "";
            
            if (!!locateExplorerUrl) {
                explorerUrl = locateExplorerUrl.slice(-1).pop();
                core.info(`\u001b[35m > Explorer url retrieved ${explorerUrl}`); 
            } else {
                postSummary("There is a problem while running TICS Client Viewer", true);
                core.setFailed("There is a problem while running TICS Client Viewer.");
                return;
            }

            const ticsPublisher = new TicsPublisher();
            const qualitygates = await ticsPublisher.run();
            const changedFiles = await getPRChangedFiles();

            let results = {
                explorerUrl: explorerUrl,
                changeSet: changedFiles,
                qualitygates: qualitygates
            };
            postSummary(results, false);
        }

    } catch (error) {
       core.error("Failed to run TiCS Github Action");
       core.error(error);
       core.setFailed(error.message);
    }
}

export async function postSummary(summary, isError) {
    let commentBody = {};

    if (isError) {
        commentBody.body = getErrorSummary(summary);
        createIssueComment(commentBody)
    } else {
        commentBody.body = getQualityGateSummary(summary.qualitygates) + getLinkSummary(summary.explorerUrl) + getFilesSummary(summary.changeSet);
        createIssueComment(commentBody);
    }
}