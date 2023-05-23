#!/usr/bin/env node
import { program } from 'commander';
import { Octokit } from '@octokit/rest';
import * as input from "./src/inputUtil.js";
import * as shell from 'shelljs';
import * as fs from "fs"
import * as os from "os"
import * as path from "path"

program
  .version('1.0.0')
  .description('AWS SDK v3 CLI');

program
.option('--no-cache', 'Use cached results', false)
.action((cmd) => {
    console.log('Search keyword:', cmd.query);
    searchReadmeFiles(cmd.cached);
  })
  .parse(process.argv);


async function searchReadmeFiles(nocache) {
  if (!process.env.GITHUB_TOKEN) {
    console.log("Please set GITHUB_TOKEN environment variable. Create one here https://github.com/settings/tokens");
    process.exit(1);
  }
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const cachePath = path.join(os.homedir(), ".aws-sdk-cli", "cache.json");
  let choices;
  if (fs.existsSync(cachePath) && !nocache) {
    console.log("Using cached results. To refresh, run with --no-cache");
    choices = JSON.parse(fs.readFileSync(cachePath).toString("utf-8"));
  } else {
    const response = await octokit.repos.getContent({
      owner: 'aws',
      repo: 'aws-sdk-js-v3',
      path: '/clients',
    });

    const files = response.data.filter((item) => item.type === 'dir');

    const fileChoices = files.map(async (file) => {
      const readme = await octokit.repos.getContent({
        owner: 'aws',
        repo: 'aws-sdk-js-v3',
        path: `/clients/${file.name}/README.md`,
      });

      const readmeContent = Buffer.from(readme.data.content, 'base64').toString();
      return {
        name: `@aws-sdk/${file.name}`,
        value: { name: file.name, readme: readmeContent },
      };
    });
    choices = await Promise.all(fileChoices);
    if (!fs.existsSync(path.dirname(cachePath))) {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(choices));
  }
  const selectedClient = await input.default.autocomplete('Search client:', choices);


  const npmCommand = `npm install ${selectedClient.name}`;
  console.log(`Running '${npmCommand}'`);
  shell.default.exec(npmCommand);

}

