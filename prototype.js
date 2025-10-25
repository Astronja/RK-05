import { setInterval } from 'timers/promises';
import { GatewayIntentBits, Client, ActivityType } from "discord.js";
import { Bilibili } from './platforms/bilibili.js';

export class Qianyu {
    constructor(config, dctoken) {
        this.name = config.name;
        this.discordToken = dctoken;
        this.config = config;
        this.platforms = config.platforms;
        this.prefix = config.prefix;
        this.color = 0x3d6878;
        this.discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageTyping
            ]
        });
    }

    log (message) {
        console.log(`[${this.name}] ${message}`);
    }

    async login() {
        await this.discordClient.login(this.discordToken);
        this.discordClient.once('clientReady', async (c) => {
            this.log(`Logged in as ${c.user.tag}`);
            for await (const _ of setInterval(60000)) await this.updateStatus();
        });
        this.discordClient.on('messageCreate', async (message) => {
            if (message.mentions.has(this.discordClient.user) && message.content.includes('about')) {
                await message.reply(await this.about());
            }
            if (message.content.startsWith(this.prefix)) {
                const command = message.content.replace(this.prefix, '').trim();
                if (command == 'ping') {
                    await message.reply(await this.ping(message));
                }
            }
        });
    }

    async updateStatus () {
        const latestVersion = Object.keys(this.config.versions)[Object.keys(this.config.versions).length - 1];
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const statusString = `🦄 · v${latestVersion}: ${days}d ${hours}h ${minutes}m`;
        this.discordClient.user.setPresence({
            activities: [{ 
                name: statusString,
                type: ActivityType.Custom 
            }]
        });
    }

    async ping() {
        return 'pong!';
    }
    
    async startLoop() {
        const bili = new Bilibili(this.discordClient, this.platforms.bilibili);
        bili.start();
    }

    async about() { //returns a discord embed
        const versionList = this.config.versions;
        const latestVersion = Object.keys(versionList)[Object.keys(versionList).length - 1];
        const attributions = [
            'Art components - Arknights: Endfield 《明日方舟终末地》',
            'Bilibili - space.bilibili.com/1265652806/dynamic',
            'discord.js v14'
        ];
        return {
            embeds: [
                {
                    color: this.color,
                    title: this.name,
                    author: {
                        name: 'Noel A.',
                        icon_url: (await this.discordClient.users.fetch('1023608069063717035')).displayAvatarURL({ format: 'png', dynamic: true })
                    },
                    description: 'Endfield bot! Fetches news and important notifications of Arknights: Endfield from multiple platforms.',
                    thumbnail: {
                        url: 'https://i.imgur.com/cMO9u46.png',
                    },
                    fields: [
                        {
                            name: 'Prefix',
                            value: this.prefix,
                            inline: true
                        },
                        {
                            name: 'Version',
                            value: latestVersion,
                            inline: true
                        },
                        {
                            name: 'Liscence',
                            value: 'CC BY-NC 4.0',
                            inline: true
                        },
                        {
                            name: 'Version info',
                            value: versionList[latestVersion]
                        },
                        {
                            name: 'Attributions',
                            value: attributions.join('\n')
                        }
                    ]
                }
            ]
        }
    }
}