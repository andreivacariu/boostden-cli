import {Client} from 'discord.js-selfbot-v13';
import chalk from 'chalk';
import inquirer from 'inquirer';
import gradient from 'gradient-string';
import chalkAnimation from 'chalk-animation';
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
    captchaKey: '475df964d3b8ba22c1395b48f2b38037',
    captchaService: 'capmonster',
});

const sleep = (ms = 2000) => new Promise((r) => setTimeout(r, ms));

async function start() {
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
  welcome(proxyOptions);
}
async function welcome(proxyOptions) {
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
    const guildInvite = await inquirer.prompt({
      name: 'guildInvite',
      type: 'input',
      message: 'Enter the guild invite CODE:'
    });
    const guildId = await inquirer.prompt({
      name: 'guildId',
      type: 'input',
      message: 'Enter the guild ID:'
    });
    const channelId = await inquirer.prompt({
      name: 'channelId',
      type: 'input',
      message: 'Enter the guild channel ID:'
    });
    await scrapeMembers(proxyOptions, guildInvite, guildId, channelId);
  }
}
async function scrapeMembers(proxyOptions, guildInvite, guildId, channelId) {
  const spinner = createSpinner('Scraping members...').start();
  try {
    const tokens = await readFile('tokens.txt', 'utf8');
    if (!tokens) {
      spinner.update({ text: 'tokens.txt file is empty. Add some tokens!' });
      spinner.error();
      return;
    }
    const tkn = tokens.split('\n');
    await client.login(tkn[0])
    await client.fetchInvite(guildInvite.guildInvite).then(async invite => {
      await invite.acceptInvite();
    });
    const guild = await client.guilds.cache.get(guildId.guildId);
    // Overlap (slow)
    for (let index = 0; index <= guild.memberCount; index += 100) {
      await guild.members.fetchMemberList(channel, index, index !== 100).catch(() => {});
      await sleep(500);
    }
    spinner.update({ text: `Finished scraping members. Found ${guild.members.cache.size} members` });
    spinner.success();
  } catch (error) {
    spinner.update({ text: 'Error occurred while scraping members:' });
    spinner.error();
    console.error(error);
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

    const promises = tkn.map(async (token) => {
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
          
          let response;
          if (proxyOptions && proxyOptions.ip && proxyOptions.port) {
            response = await new Promise((resolve, reject) => {
              fetch('https://discord.com/api/v9/users/@me', fetchOptions)
                .then(resolve)
                .catch(reject);
            });
          } else {
            response = await fetch('https://discord.com/api/v9/users/@me', fetchOptions);
          }

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
    });

    await Promise.allSettled(promises);
    await writeFile('tokens.txt', validTokens.join('\n'), 'utf8');

    spinner.update({ text: 'Finished checking tokens' });
    spinner.success();
    console.log(`Checked all tokens, ${working}/${total} working. Removed invalid ones.`);
    welcome();
  } catch (error) {
    spinner.update({ text: 'Error occurred while reading tokens file' });
    spinner.error();
    console.error(error);
  }
}
async function boostServer(proxyOptions, numberOfBoosts) {
  const spinner = createSpinner('Boosting server...').start();

  try {
    const serverID = await inquirer.prompt({
      name: 'serverID',
      type: 'input',
      message: 'Enter the server ID:',
    });

    const tokens = await readFile('nitro.txt', 'utf8');
    if (!tokens) {
      spinner.update({ text: 'nitro.txt file is empty. Add some tokens!' });
      spinner.error();
      return;
    }

    const tkn = tokens.split('\n');

    for (const token of tkn) {
      const cleanedToken = token.trim();

      if (cleanedToken) {
        try {
          const joinOptions = {
            method: 'POST',
            headers: {
              'Authorization': cleanedToken
            }
          };

          if (proxyOptions && proxyOptions.ip && proxyOptions.port) {
            const { user, ip, port, password } = proxyOptions;
            const proxyUrl = `http://${user}:${password}@${ip}:${port}`;

            joinOptions.agent = new HttpsProxyAgent(proxyUrl);
          }

          const joinResponse = await fetch(`https://discord.com/api/v9/invites/${serverID.serverID}`, joinOptions);

          if (joinResponse.status === 200) {
            const boostOptions = {
              method: 'GET',
              headers: {
                'Authorization': cleanedToken
              }
            };

            if (proxyOptions && proxyOptions.ip && proxyOptions.port) {
              const { user, ip, port, password } = proxyOptions;
              const proxyUrl = `http://${user}:${password}@${ip}:${port}`;

              boostOptions.agent = new HttpsProxyAgent(proxyUrl);
            }

            const boostResponse = await fetch(`https://discord.com/api/v9/guilds/${serverID.serverID}`, boostOptions);
            const serverData = await boostResponse.json();

            if (boostResponse.status === 200 && !serverData.premium_subscription_count) {
              for (let i = 0; i < numberOfBoosts; i++) {
                const boostOptions = {
                  method: 'POST',
                  headers: {
                    'Authorization': cleanedToken,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    guild_id: serverID.serverID,
                    channel_id: null
                  })
                };

                if (proxyOptions && proxyOptions.ip && proxyOptions.port) {
                  const { user, ip, port, password } = proxyOptions;
                  const proxyUrl = `http://${user}:${password}@${ip}:${port}`;

                  boostOptions.agent = new HttpsProxyAgent(proxyUrl);
                }

                const boostResponse = await fetch('https://discord.com/api/v9/guilds/boost', boostOptions);

                if (boostResponse.status === 204) {
                  spinner.update({ text: `Server boosted using token: ${cleanedToken}` });
                } else {
                  console.error(`Error boosting server using token: ${cleanedToken}`);
                }

                if (!proxyOptions || !proxyOptions.ip) {
                  await sleep(500);
                }
              }
            } else {
              spinner.update({ text: `Server is already boosted using token: ${cleanedToken}` });
            }
          } else {
            console.error(`Error joining server using token: ${cleanedToken}`);
          }
        } catch (error) {
          console.error(`Error occurred while boosting server using token: ${cleanedToken}`);
          console.error(error);
        }
      }
    }

    spinner.update({ text: 'Finished boosting server' });
    spinner.success();
  } catch (error) {
    spinner.update({ text: 'Error occurred while reading tokens file or entering server ID' });
    spinner.error();
    console.error(error);
  }
}

await start();
