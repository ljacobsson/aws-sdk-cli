#!/usr/bin/env node
import { program } from 'commander';
import { Octokit } from '@octokit/rest';
import * as input from "./src/inputUtil.js";
import * as shell from 'shelljs';
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { fileURLToPath } from 'url';
import * as inquirer from "inquirer";
import { bundles } from "./src/bundles.js";
const inq = inquirer.default;

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json")).toString("utf-8"));
program
  .version(pkg.version)
  .description('AWS SDK v3 CLI');

program
  .option('--no-cache', 'Use cached results', true)
  .option('-D --dev', 'Install as dev dependency', false)
  .action((cmd) => {
    searchReadmeFiles(cmd.cache, cmd.dev);
  })
  .parse(process.argv);


async function searchReadmeFiles(cache, devMode) {
  const token = fs.existsSync(os.homedir() + "/.aws-sdk-cli/token") ? fs.readFileSync(os.homedir() + "/.aws-sdk-cli/token").toString("utf-8") : process.env.GITHUB_TOKEN;

  if (!token) {
    console.log("Please set GITHUB_TOKEN environment variable. Create one here https://github.com/settings/tokens");
    const token = await input.default.text("...or enter a GitHub token here (public repo read access is enough):");
    if (!token || token.length === 0) {
      process.exit(1);
    } else {
      if (!fs.existsSync(os.homedir() + "/.aws-sdk-cli")) {
        fs.mkdirSync(os.homedir() + "/.aws-sdk-cli");
      }
      fs.writeFileSync(os.homedir() + "/.aws-sdk-cli/token", token);
    }
  }
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const cachePath = path.join(os.homedir(), ".aws-sdk-cli", "cache.json");
  let choices;
  if (fs.existsSync(cachePath) && cache) {
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
        value: { name: `@aws-sdk/${file.name}`, readme: readmeContent },
      };
    });
    choices = await Promise.all(fileChoices);
    if (!fs.existsSync(path.dirname(cachePath))) {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(choices));
  }

  choices.unshift(new inq.Separator("Clients"))
  for (const bundle of bundles) {
    choices.unshift({ name: bundle.name, value: { name: bundle.packages.join(" "), readme: bundle.keywords.join(" ") } });
  }

  choices.unshift(new inq.Separator("Bundles"));

  console.log("Tip: Use quotes to search for exact matches. Example: \"dynamodb\"");
  
  const selectedClient = await input.default.autocomplete('Enter search:', choices);

  const npmCommand = `npm install ${selectedClient.name} ${devMode ? "--save-dev" : "--save"}`;
  console.log(`Running '${npmCommand}'`);
  shell.default.exec(npmCommand);

}

