import { exec, execFile } from 'child_process';
import util from 'node:util';
import fs from 'fs';
import path from 'path';
import core from '@actions/core';
import { ticsConfig, githubConfig } from '../github/configuration.js';
import { getTiobewebBaseUrlFromGivenUrl, doHttpRequest } from "./ApiHelper.js";
import { postSummary } from "../index.js";
import { getPRChangedFiles } from '../github/pulls/pulls.js';
import { TicsPublisher } from '../tics/TicsPublisher.js';

const execWithPromise = util.promisify(exec);

export class TicsAnalyzer {

    run = async()  => {
        let exitCode = 0;
        let installTicsApiFullUrl = "";

        try {
            if (ticsConfig.installTics == 'true') {
                const tiobeWebBaseUrl = getTiobewebBaseUrlFromGivenUrl(ticsConfig.ticsConfiguration);
                const ticsInstallApiBaseUrl = this.getInstallTicsApiUrl(tiobeWebBaseUrl, githubConfig.runnerOS.toLowerCase());
                let installTicsUrl = await this.retrieveInstallTics(ticsInstallApiBaseUrl);
                installTicsApiFullUrl = tiobeWebBaseUrl + installTicsUrl;
            }
            exitCode = this.runTICSClient(installTicsApiFullUrl).then((exitCode)=> {
                return exitCode;
            });
        } catch (error) {
           core.setFailed(error.message);
        }
        return exitCode;
    }

    runTICSClient = async(url) => {
        const bootstrapCommand =  ticsConfig.installTics == 'true' ? this.getBootstrapCmd(url) : "";
        const ticsAnalysisCommand = this.getTicsClientArgs();

        core.info(`Invoking: ${this.runCommand(bootstrapCommand, ticsAnalysisCommand)}`);
        const {stdout, stderr} = await execWithPromise(this.runCommand(bootstrapCommand, ticsAnalysisCommand), (err, stdout, stderr) => {
            if (err && err.code != 0) {
                core.info(stderr);
                core.info(stdout);
                let errorList = stdout.match(/\[ERROR.*/g);
                
                if (errorList) {
                    postSummary(errorList, true);
                } else {
                    postSummary(stderr, true);
                }
                core.setFailed("There is a problem while running TICS Client Viewer. Please check that TICS is configured and all required parameters have been set in your workflow.");
                return;
            } else {
                core.info(stdout);
                let locateExplorerUrl = stdout.match(/http.*Explorer.*/g);
                let explorerUrl = "";
                
                if (!!locateExplorerUrl) {
                    explorerUrl = locateExplorerUrl.slice(-1).pop();
                    core.info(`\u001b[35m > Explorer url retrieved ${explorerUrl}`); 
                } else {
                    postSummary("There is a problem while running TICS Client Viewer", true);
                    core.setFailed("There is a problem while running TICS Client Viewer.");
                    return;
                }

                getPRChangedFiles().then((changeSet) => {
                    core.info(`\u001b[35m > Retrieving changed files to analyse`);
                    core.info(`Changed files list retrieved: ${changeSet}`);
                    return changeSet;
                }).then((changeSet) => {
                    const ticsPublisher = new TicsPublisher();
                    ticsPublisher.run().then((qualitygates) => {
                        core.info(`\u001b[35m > Retrieved quality gates results`);

                        return qualitygates;
                    }).then((qualitygates) => {
                        let results = {
                            explorerUrl: explorerUrl,
                            changeSet: changeSet,
                            qualitygates: qualitygates
                        };

                        postSummary(results, false);
                    })
                });
            }
        });
    }

    getTicsClientArgs() {
        let execString = 'TICS ';
        execString += ticsConfig.calc.includes("GATE") ? '' : '-viewer ';
        execString += ticsConfig.calc ? `-calc ${ticsConfig.calc} -changed `: '-calc ALL -changed ';
        execString += ticsConfig.projectName ? `-project ${ticsConfig.projectName} ` : '';
        execString += ticsConfig.clientToken ? `-cdtoken ${ticsConfig.clientToken} ` : '';
        execString += ticsConfig.tmpDir ? `-tmpdir ${ticsConfig.tmpDir} ` : '';
        execString += ticsConfig.branchDir ? `${ticsConfig.branchDir} ` : ' .';
        return execString;
    }

    getBootstrapCmd = (installTicsUrl) => {
        if (this.isLinux) {
            return `source <(curl --insecure -k -s \\\"${installTicsUrl}\\\")`;
        } else {
            return `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('${installTicsUrl}'))`;
        }
    }

    runCommand = (bootstrapCmd, ticsAnalysisCmd) => {
        if (this.isLinux) {
            return `bash -c \"${bootstrapCmd} && ${ticsAnalysisCmd}\"`;
        } else {
            return `powershell \"${bootstrapCmd}; if ($LASTEXITCODE -eq 0) { ${ticsAnalysisCmd} }\"`;
        }
     }

    getInstallTicsApiUrl = (tiobeWebBaseUrl, os) => {
        let installTICSAPI = new URL(ticsConfig.ticsConfiguration);
        installTICSAPI.searchParams.append('platform', os);
        installTICSAPI.searchParams.append('url', tiobeWebBaseUrl);

        return installTICSAPI.href;
    }

    isLinux() {
        return githubConfig.runnerOS == 'Linux';
    }

    retrieveInstallTics = async(installTicsApiFullUrl) => {
        try {
            console.log("\u001b[35m > Trying to retrieve configuration information from: ", installTicsApiFullUrl)

            let configInfo = await doHttpRequest(installTicsApiFullUrl).then((data) => {
                let response = {
                    statusCode: 200,
                    body: JSON.stringify(data.links.installTics),
                };

                return response;
            });
            let configObj = JSON.parse(configInfo.body);
            
            let installTICSUrlTemp = decodeURI(decodeURIComponent(configObj));

            return installTICSUrlTemp;

        } catch (error) {
            core.setFailed("An error occurred when trying to retrieve configuration information " + error);
        }
    }
}
