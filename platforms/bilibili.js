// Note that this file is entirely copied from Croissant project on Sept 3rd, 2025.
// Modified on Sept 4th.

import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';
import { setInterval } from 'timers/promises';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Bilibili {
    constructor(client, config) {
        this.userid = config.userid;
        this.delay = config.delay;
        this.postChannel = config.postchannel;
        this.debugChannel = config.debugchannel;
        this.discordClient = client;
        this.color = 0xfb7299;
        this.cookies = {
            SESSDATA: '5bf9ec61%2C1771381267%2C51093%2A82CjD28wos2fBtR-7iSk8nJS8aN6Ab6vdQ3DhYa4P36Wo_NxsUW9qQveB8HiGIA83nZc4SVmtxSWhFVUlrMWpTUHRLM2p6UTB6OWhPY19VRDdnVDN5dUc3ZmVVQ0oyd0hDYnlpdk5fWkpKMzhMQnRTbzl5RVhYaEdZMFJmdXFBaEpjVl9Qai1icXRnIIEC',
            _uuid: 'A88B2B5A-E45A-6745-F7DE-D43CF172610EA17124infoc',
            bili_jct: '44fb277f4a25d69ff373a495d03ce408',
            DedeUserID: '551987502',
            DedeUserID__ckMd5: 'd19ce1fced86f021',
            sid: '8p3aste3',
            buvid3: '550511FB-3071-FC5B-B8CF-E9A68B0F501B16949infoc',
            buvid4: '4A0B6D1C-6723-5FD0-034A-E0910DE941C417477-025082210-dErTmYRM2i1JNjENHtIU2g%3D%3D',
            buvid_fp: '8b25f11adc36afad803968a731369f17',
            fingerprint: '08aa79309dc7d0198570a8b8669a6f1d',
        };
        this.recentPostsId = [];
        this.wbiKeys = {};
    }


    async getDynamicDetail(dynamicId) {
        try {
            // Initialize WBI keys if not set
            if (!this.wbiKeys.img_key) {
                await this.initWbiKeys();
            }

            // Generate signed API URL
            const params = {
                host_mid: this.userid,
                timezone: '-480',
                offset: '',
                // Add required parameters:
                platform: 'web',
                web_location: '1550101'
            };

            const signedQuery = this.generateSignature(params);

            const response = await axios.get(`https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail?${signedQuery}`, {
                params: {
                    dynamic_id: dynamicId
                },
                headers: {
                    'Cookie': this.getCookieString(),
                    'Referer': `https://space.bilibili.com/${this.userid}/dynamic`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Origin': 'https://space.bilibili.com',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching dynamic detail:', error);
            return null;
        }
    }

    getCookieString() {
        return Object.entries(this.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
    }

    async initWbiKeys() {
        try {
            const response = await axios.get('https://api.bilibili.com/x/web-interface/nav', {
                headers: {
                    'Cookie': this.getCookieString(),
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Origin': 'https://www.bilibili.com',
                    'Referer': 'https://www.bilibili.com/',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site'
                },
                timeout: 10000
            });

            if (response.data.code !== 0) {
                console.error('Auth Error Details:', response.data);
                throw new Error(`WBI init failed: ${response.data.message} (code: ${response.data.code})`);
            }

            const wbi_img = response.data.data.wbi_img;
            this.wbiKeys = {
                img_key: wbi_img.img_url.split('/').pop().split('.')[0],
                sub_key: wbi_img.sub_url.split('/').pop().split('.')[0]
            };
        } catch (error) {
            console.error('WBI Key Initialization Failed:', error.message);

            // Detailed troubleshooting
            if (error.response) {
                console.error('API Response:', {
                    status: error.response.status,
                    data: error.response.data
                });
            }

            throw error;
        }
    }

    generateSignature(params) {
        const mixinKeyEncTab = [
            46, 47, 18, 2, 53, 8, 23, 32,
            15, 50, 10, 31, 58, 3, 45, 35,
            27, 43, 5, 49, 33, 9, 42, 19,
            29, 28, 14, 39, 12, 38, 41, 13,
            37, 48, 7, 16, 24, 55, 40, 61,
            26, 17, 0, 1, 60, 51, 30, 4,
            22, 25, 54, 21, 56, 59, 6, 63,
            57, 62, 11, 36, 20, 34, 44, 52
        ];

        const orig = this.wbiKeys.img_key + this.wbiKeys.sub_key;
        const mixinKey = mixinKeyEncTab.map(i => orig[i]).slice(0, 32).join('');

        const signedParams = {
            ...params,
            wts: Math.floor(Date.now() / 1000)
        };

        const query = Object.entries(signedParams)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .filter(([_, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');

        const w_rid = crypto.createHash('md5')
            .update(query + mixinKey)
            .digest('hex');

        return `${query}&w_rid=${w_rid}`;
    }

    async fetchPost() {
        try {
            // Initialize WBI keys if not set
            if (!this.wbiKeys.img_key) {
                await this.initWbiKeys();
            }

            // Generate signed API URL
            const params = {
                host_mid: this.userid,
                timezone: '-480',
                offset: '',
                // Add required parameters:
                platform: 'web',
                web_location: '1550101'
            };

            const signedQuery = this.generateSignature(params);
            const apiUrl = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${signedQuery}`;

            // Make API request with security headers
            const response = await axios.get(apiUrl, {
                headers: {
                    'Cookie': this.getCookieString(),
                    'Referer': `https://space.bilibili.com/${this.userid}/dynamic`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Origin': 'https://space.bilibili.com',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                },
                timeout: 15000
            });

            // Handle API errors
            if (response.data.code !== 0) {
                throw new Error(`API Error ${response.data.code}: ${response.data.message}`);
            }

            // Process posts
            const items = response.data?.data?.items || [];
            if (items.length === 0) return null;

            return items;

        } catch (error) {
            console.error('Fetch Error:', error.message);

            // Detailed error diagnostics
            if (error.response && cookieUnexpired) {
                console.error('Bilibili API Response:', {
                    status: error.response.status,
                    code: error.response.data?.code,
                    message: error.response.data?.message
                });
            }

            // Add specific handling for authentication errors
            if ((error.response?.data?.code === -101 || error.message.includes('未登录')) && cookieUnexpired) {
                //await alert(`[-101] Cookies values are expired, refresh them asap.`);
                cookieUnexpired = false;
            }

            return null;
        }
    }

    async newPost() {
        try {
            const posts = await this.fetchPost();
            var maxValue = -1;
            var maxIndex = 0;
            if (posts) {
                posts.forEach((obj, index) => {
                    if (obj['modules']['module_author']['pub_ts'] > maxValue) {
                        maxValue = obj['modules']['module_author']['pub_ts'];
                        maxIndex = index;
                    }
                });
            } else return null;
            
            const sortedIndices = posts
                .map((obj, index) => ({ index, pub_ts: obj.modules.module_author.pub_ts }))
                .sort((a, b) => b.pub_ts - a.pub_ts)
                .map(item => item.index);
            const latestPost = posts[maxIndex];
            let toReturn = true;
            if (!this.recentPostsId.includes(latestPost.id_str) && this.recentPostsId.length > 0) {
                console.log(`New Post Detected: ${latestPost.id_str}`);
            } else {
                toReturn = false;
            }
            this.recentPostsId = [];
            for (var i = 0; i < 5; i++) {
                this.recentPostsId.push(posts[sortedIndices[i]]['id_str']);
            }
            if (toReturn) {
                const dynDetail = await this.getDynamicDetail(latestPost.id_str);
                await fs.writeFile(__dirname + '/lastpost.json', JSON.stringify(dynDetail, null, 2), 'utf8');
                return {
                    post: dynDetail,
                    dynamicId: latestPost.id_str
                };
            } else return undefined;
        } catch (error) {
            console.error('Post Check Failed:', error);
        }
    }

    async modifyPost(data) {
        const parentUser = await this.discordClient.users.fetch('1023608069063717035');
        const parentAvatar = parentUser.displayAvatarURL({ format: 'png', dynamic: true });
        let embed = { 
            color: this.color, 
            title: "New Post by 明日方舟终末地", 
            url: `https://www.bilibili.com/opus/${data.dynamicId}`,
            footer: {
                text: 'Content fetched from Bilibili.', 
                icon_url: parentAvatar
            }
        };
        let message = "";
        const post = JSON.parse(data.post.data.card.card);
        let type = '';
        if (post.title != undefined) {
            if (post.summary != undefined) {
                type = 'article';
                article();
            } else if (post.videos != undefined) {
                type = 'video';
                video();
            } else {
                type = 'unknown';
                await this.alert('Unknown post type.');
                return false;
            }
        } else {
            if (post.origin != undefined) {
                type = 'forward';
                forward();
            } else {
                type = 'dynamic';
                dynamic();
            }
        }

        let result = { content: message, embeds: [embed] }
        
        if (result.embeds[0].description.includes("恭喜") && result.embeds[0].description.includes("中奖")) return false;

        return result;

        function dynamic () {
            embed.author = {
                name: post.user.name,
                icon_url: post.user.head_url,
                url: `https://space.bilibili.com/${post.user.uid}/dynamic`,
            };
            embed.description = post.item.description;
            if (post.item.pictures) {
                embed.image = { url: post.item.pictures[0]['img_src'] };
            }
            embed.timestamp = (new Date(post.item.upload_time*1000)).toISOString();
            message = `New Post by ${post.user.name}`;
        }
        function video () {
            embed.author = {
                name: post.owner.name,
                icon_url: post.owner.face,
                url: `https://space.bilibili.com/${post.owner.mid}/dynamic`,
            };
            embed.title = `New Post by ${post.owner.name}`;
            embed.description = post.dynamic || post.desc;
            embed.image = { url: post.pic };
            embed.timestamp = (new Date(post.pubdate*1000)).toISOString();
            message = `New Video by ${post.owner.name} [▶](https://vxbilibili.com/video/${data.post.data.card.desc.bvid}?lang=en)`;
        }
        function forward () {
            embed.author = {
                name: post.user.uname,
                icon_url: post.user.face,
                url: `https://space.bilibili.com/${post.user.uid}/dynamic`,
            };
            embed.description = post.item.content;
            if (post.item.pictures) {
                embed.image = { url: post.item.pictures[0]['img_src'] };
            }
            // Bilibili does not return unix timestamp when dealing with reposts.
            //embed.timestamp = (new Date(post.item.upload_time*1000)).toISOString();
            embed.fields = [{
                name: "Original Post:",
                value: `> **${post.origin_user.info.uname}**\n> ` + JSON.parse(post.origin).item.description.split('\n').join('\n> ')
            }]
            message = `New Post by ${post.user.uname}`;
        }
        function article () {
            embed.author = {
                name: post.author.name,
                icon_url: post.author.face,
                url: `https://space.bilibili.com/${post.author.mid}/dynamic`,
            };
            embed.title = `New Post by ${post.author.name}`;
            embed.description = `**${post.title}**`;
            embed.fields = [{
                name: 'article',
                value: post.summary.split(' ').join('\n')
            }];
            embed.image = { url: post.image_urls[0] };
            embed.timestamp = (new Date(post.publish_time*1000)).toISOString();
            message = `New Article by ${post.author.name}`;
        }
    }

    async sendPost(message) {
        await this.rawPost();
        for (let item of this.postChannel) {
            const channel = this.discordClient.channels.cache.get(item);
            await channel.send(message);
        }
    }

    async rawPost() {
        const channel = this.discordClient.channels.cache.get(this.debugChannel);
        await channel.send({
            files:[
                __dirname + '/lastpost.json'
            ]
        });
        await fs.unlink(__dirname + '/lastpost.json');
    }

    async start() {
        const channel = this.discordClient.channels.cache.get(this.debugChannel);
        await channel.send(`[Bilibili] Listening dynamics of user with buid \`\`${this.userid}\`\`.`);
        for await (const _ of setInterval(this.delay)) {
            const response = await this.newPost();
            if (response != undefined) {
                const result = await this.modifyPost(response);
                if (result) {
                    this.sendPost(result);
                }
            }
        }
    }
}
