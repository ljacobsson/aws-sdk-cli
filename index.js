#!/usr/bin/env node
import { program } from 'commander';
import { Octokit } from '@octokit/rest';
import * as input from "./src/inputUtil.js";
import * as shell from 'shelljs';
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json")).toString("utf-8"));
program
  .version(pkg.version)
  .description('AWS SDK v3 CLI');

program
.option('--no-cache', 'Use cached results', true)
.action((cmd) => {

    searchReadmeFiles(cmd.cache);
  })
  .parse(process.argv);


async function searchReadmeFiles(cache) {
  if (!process.env.GITHUB_TOKEN) {
    console.log("Please set GITHUB_TOKEN environment variable. Create one here https://github.com/settings/tokens");
    process.exit(1);
  }
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const cachePath = path.join(os.homedir(), ".aws-sdk-cli", "cache.json");
  let choice;
  if (fs.existsSync(cachePath) && cache) {
    console.log("Using cached results. To refresh, run with --no-cache");
    choice = JSON.parse(fs.readFileSync(cachePath).toString("utf-8"));
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
        value: { name: `@aws-sdk/${file.name}`, readme: readmeContent },
      };
    });
    choice = await Promise.all(fileChoices);
    if (!fs.existsSync(path.dirname(cachePath))) {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(choice));
  }
  const selectedClient = await input.default.autocomplete('Search client:', choice);


  const npmCommand = `npm install ${selectedClient.name}`;
  console.log(`Running '${npmCommand}'`);
  shell.default.exec(npmCommand);

}

