import { exec, execFile } from 'child_process';
import util from 'node:util';
import fs from 'fs';
import path from 'path';
import core from '@actions/core';
import { ticsConfig, githubConfig } from '../github/configuration.js';
import { getTiobewebBaseUrlFromGivenUrl, doHttpRequest } from "./ApiHelper.js";
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
        const {stdout, stderr} = await execWithPromise(this.runCommand(bootstrapCommand, ticsAnalysisCommand));

        return 0;
    }

    getTicsClientArgs() {
        let execString = 'TICS ';
        const ticsCalcWithGate = ticsConfig.calc.includes("GATE") ? ticsConfig.calc : "GATE"; 
        execString += ticsConfig.calc ? `-calc ${ticsCalcWithGate} -changed `: '-calc ALL -changed ';
        execString += ticsConfig.projectName ? `-project ${ticsConfig.projectName} ` : '';
        execString += ticsConfig.clientToken ? `-cdtoken ${ticsConfig.clientToken} ` : '';
        execString += ticsConfig.tmpDir ? `-tmpdir ${ticsConfig.tmpDir} ` : '';
        execString += ticsConfig.branchDir ? `${ticsConfig.branchDir} ` : ' .';
        return execString;
    }

    getBootstrapCmd = (installTicsUrl) => {
        if (this.isLinux) {
            return `source <(curl -s \\\"${installTicsUrl}\\\")`;
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
                    body: JSON.stringify(data.links.installTics), //FIX ME; do a check
                };

                return response;
            });
            let configObj = JSON.parse(configInfo.body);
            
            let installTICSUrlTemp = decodeURI(decodeURIComponent(configObj));

            return installTICSUrlTemp;

        } catch (error) {
            core.setFailed("An error occured when trying to retrieve configuration information " + error);
        }
    }
}
