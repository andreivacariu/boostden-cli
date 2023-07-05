import {Client} from 'discord.js-selfbot-v13';
import chalk from 'chalk';
import inquirer from 'inquirer';
import gradient from 'gradient-string';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';
import fetch from 'node-fetch';
import fs from 'fs';
import { promisify } from 'util';
import * as HttpsProxyAgent from 'https-proxy-agent' 
import setTitle from 'console-title';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const client = new Client({
    checkUpdate: false,
    captchaKey: 'capmonster-key',
    captchaService: 'capmonster',
});

const sleep = (ms = 2000) => new Promise((r) => setTimeout(r, ms));

async function welcome() {
  console.clear();
  setTitle(`Made by Andrei Vacariu | discord.gg/boostden | last update 5/6/23`);
  figlet(`BoostDen . com`, (err, data) => {
    console.log(gradient.passion.multiline(data) + '\n');
    console.log(
      chalk.magenta(
        `Welcome to ${gradient.morning(`BoostDen CLI`)}, a server and member boosting service!`
      )
    );
  });
  await sleep(200);

  const useProxy = await inquirer.prompt({
    name: 'useProxy',
    type: 'confirm',
    message: 'Do you have a proxy? (Rotating or Static)',
  });

  let proxyOptions = {};

  if (useProxy.useProxy) {
    const proxyDetails = await inquirer.prompt([
      {
        name: 'proxyUser',
        type: 'input',
        message: 'Enter the proxy username:',
      },
      {
        name: 'proxyIP',
        type: 'input',
        message: 'Enter the proxy IP address:',
      },
      {
        name: 'proxyPort',
        type: 'input',
        message: 'Enter the proxy port:',
      },
      {
        name: 'proxyPassword',
        type: 'password',
        message: 'Enter the proxy password:',
        mask: '*',
      },
    ]);

    proxyOptions = {
      user: proxyDetails.proxyUser,
      ip: proxyDetails.proxyIP,
      port: proxyDetails.proxyPort,
      password: proxyDetails.proxyPassword,
    };
  }

  const task = await inquirer.prompt({
    name: 'todo',
    type: 'list',
    message: 'What do you want to do today?\n',
    choices: [
      { name: 'Check Tokens', value: 1 },
      { name: 'Boost Server', value: 2 },
      { name: 'Scrape Members', value: 3 },
    ],
  });

  if (task.todo === 1) {
    await checkTokens(proxyOptions);
  } else if (task.todo === 2) {
    const numberOfBoosts = await inquirer.prompt({
      name: 'numberOfBoosts',
      type: 'input',
      message: 'Enter the number of boosts:',
      validate: (input) => {
        const number = parseInt(input);
        return Number.isInteger(number) && number > 0;
      },
    });
    await boostServer(proxyOptions, numberOfBoosts.numberOfBoosts);
  } else if (task.todo === 3) {
    await scrapeMembers(proxyOptions);
  }
}

async function checkTokens(proxyOptions) {
  const spinner = createSpinner('Checking tokens...').start();
  let working = 0;
  let total = 0;
  let validTokens = [];

  try {
    const tokens = await readFile('tokens.txt', 'utf8');
    if (!tokens) {
      spinner.update({ text: 'tokens.txt file is empty. Add some tokens!' });
      spinner.error();
      return;
    }

    const tkn = tokens.split('\n');

    for (const token of tkn) {
      const cleanedToken = token.trim();

      if (cleanedToken) {
        try {
          const fetchOptions = {
            method: 'GET',
            headers: {
              'Authorization': cleanedToken
            }
          };
          
          if (proxyOptions && proxyOptions.ip && proxyOptions.port) {
            const { user, ip, port, password } = proxyOptions;
            const proxyUrl = `http://${user}:${password}@${ip}:${port}`;
          
            fetchOptions.agent = new HttpsProxyAgent.HttpsProxyAgent(proxyUrl);
          }
          
          
          const response = await fetch('https://discord.com/api/v9/users/@me', fetchOptions);

          if (response.status === 200) {
            working++;
            validTokens.push(cleanedToken);
          }
          total++;

          if (!proxyOptions || !proxyOptions.ip) {
            await sleep(500);
          }
        } catch (error) {
          console.error(`Error occurred while checking token: ${cleanedToken}`);
          console.error(error);
        }
      }
    }
    await writeFile('tokens.txt', validTokens.join('\n'), 'utf8');

    spinner.update({ text: 'Finished checking tokens' });
    spinner.success();
    console.log(`Checked all tokens, ${working}/${total} working. Removed invalid ones.`);
  } catch (error) {
    spinner.update({ text: 'Error occurred while reading tokens file' });
    spinner.error();
    console.error(error);
  }
}

await welcome();
