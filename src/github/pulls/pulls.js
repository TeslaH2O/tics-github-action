import { Octokit } from "@octokit/action"; //GitHub API client for GitHub Actions
import { githubConfig } from '../configuration.js';
import core from '@actions/core';

//Octokit client is authenticated
const octokit = new Octokit();

/* Helper functions to get all changed files params of a pull request */
const getParams = () => {

    let parameters = {
        accept: 'application/vnd.github.v3+json',
        owner: githubConfig.owner,
        repo: githubConfig.reponame,
        pull_number: githubConfig.eventpayload.pull_request.number,
        per_page: 100,
        page: 1,
    }

    return parameters;
}

export const getPRChangedFiles =  async() => {

    let changedFiles = "";

    try {
       await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', getParams()).then((response) => {
            core.debug(`Getting the changed files list ${response.data}`)

            response.data && response.data.map((item) => {
                changedFiles += item.filename + " ,"
            })

            changedFiles = changedFiles.slice(0, -1); // remove the last comma

            return changedFiles; 
        })
    } catch(e) {
        core.error(`We cannot retrieve the files that changed in this PR: ${e}`)
    }

    return changedFiles;
};
