## TICS GitHub Action
The TiCS Github action integrates TICS Client analysis to measure your code quality. The incorporated Quality gating feature enables you to analyze and decorate pull requests.

### Prerequisites
- This action requires a valid TiCS license.
- You need to have a TICS Viewer running somewhere on the network that is HTTP accessible by the runner on which you want to execute the action.

### Restrictions
- This action should only be triggered on a pull request.
- It is not working for forked repositories.

### Adding the TiCS Action to a GitHub Workflow

```
- name: Run TICS Action
  uses: tiobe/tics-github-action@v1.0.0
  env: 
    GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
  with:
    projectName: 'myproject' 
    ticsViewerUrl: 'http://myviewer:20212/tiobeweb/section/api/cfg?name=myconfiguration'          
    clientToken: 'mycdtoken'                                        
```

### Example workflow 
The workflow YAML file will usually look something like this:

```
name: Main Workflow 

on:
  pull_request: 
        types: [ opened, edited, synchronize, reopened ] 

jobs:
  TiCS-CI:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - namee: TiCS Analysis and Quality check
        uses: tiobe/tics-github-action@v1.0.0
        env: 
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
          TICSAUTHTOKEN: ${{secrets.TICSAUTHTOKEN}}
        with:
          projectName: 'myproject'
          ticsConfiguration: 'https:/myviewer/tiobeweb/section/api/cfg?name=myconfiguration'
          clientToken: 'myclienttoken'
          calc: 'GATE'
          installTics: true
```

### Environment Variables
The environment variables that are necessary for the action to function:

```
env: 
    GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
    TICSAUTHTOKEN: ${{secrets.TICSAUTHTOKEN}}
```

- `TICSAUTHTOKEN` - It is mandatory only when the TiCS viewer is not publicly available and requires authentication.
- `GITHUB_TOKEN` – Provided by Github (see [Authenticating with the GITHUB_TOKEN](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token)).


### Action Parameters
The following inputs are available for this action:

 |Input|Description|
 |---|---|
 |`projectName`| **Required** - Name of the TICS project present in the TICS Viewer|
 |`branchName`|Name of the branch in TICS| 
 |`branchDir`|Location of the files to analyze|
 |`calc`| Comma-separated list of metrics to be used. GATE metric is supported for TiCS Viewers higher 2022.2.x. If not specified, GATE will be used by default. |  
 |`clientToken`|A custom client-data token for the purpose of the Client Viewer functionality.|  
 |`tmpDir`| Location to store debug information | 
 | `installTics`| Boolean parameter to install TICS command-line tools on a runner before executing the analysis. If not specified, TICS should be installed manually on the machine that runs this job. | 
 |`ticsConfiguration`| A URL pointing to the "cfg" API endpoint of the TICS Viewer. It contains the name of the TICS Analyzer Configuration or "-" in case of the default configuration | 
 
