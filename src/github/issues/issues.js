import { Octokit } from "@octokit/action"; //GitHub API client for GitHub Actions
import core from '@actions/core';
import { githubConfig } from '../configuration.js';

//Octokit client is authenticated
const octokit = new Octokit();
let processEnv = process.env.GITHUB_EVENT_PATH;

/* Helper functions to construct a checkrun */
const getParams = (inputparams) => {
    let parameters = {};

    parameters = {
        accept: 'application/vnd.github.v3+json',
        owner: githubConfig.owner,
        repo: githubConfig.reponame,
        issue_number: processEnv.pull_request.number,
        comment_id: inputparams.comment_id ?  inputparams.comment_id : '',
        body: inputparams.body ? inputparams.body : ''
    }
    
    return parameters;
}

export const createIssueComment =  async(params) => {
    try {
        core.info(`\u001b[35m > Posting pull request decoration`);
        console.log(params);
        await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', getParams(params))
    } catch(e) {
        console.log("Create issue comment failed: ", e)
    }
};