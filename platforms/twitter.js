import fs from 'fs/promises';
import { setInterval } from 'timers/promises';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import dotenv from 'dotenv';
dotenv.config({path: __dirname + '/.env'});

const apiKey = process.env.TWITTER_API_KEY;
const apiSecretKey = process.env.TWITTER_API_SECRET_KEY;

export class Twitter {
    constructor (client, config) {
        this.discordClient = client;
        this.username = config.username;
        this.delay = config.delay;
        this.postChannel = config.postchannel;
        this.debugChannel = config.debugchannel;
        this.color = 0x2488e0;
    }


    /** Create a discord embed and send to discord channels.
     * @param {object} data Consist datas of the tweet
     */
    async sendPost(data) {
        const parentUser = await this.discordClient.users.fetch('1023608069063717035');
        const parentAvatar = parentUser.displayAvatarURL({ format: 'png', dynamic: true });
        const embed = {
            color: this.color,
            title: `New Post by AKEndfield`,
            url: `https://x.com/AKEndfield/status/1960250871369040147`,
            author: {
                name: data.author.name,
                icon_url: data.author.avatarUrl,
                url: `https://x.com/${data.author.username}`
            },
            description: data.content.text,
            image: {
                url: data.content.mediaUrls[0]
            },
            footer: {
                text: 'Content fetched from X.',
                icon: parentAvatar
            }
        }

        await this.rawPost();
        for (let item of this.postChannel) {
            const channel = this.discordClient.channels.cache.get(item);
            await channel.send({embeds:[embed]});
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

    /**
     * Fetches tweet details including author information, content, and publish time
     * @param {string} tweetId - The ID of the tweet to retrieve
     * @returns {Promise<Object>} Object containing tweet details
     */
    async getTweetDetails(tweetId) {
        // Construct API URL with necessary fields and expansions
        const url = `https://api.twitter.com/2/tweets/${tweetId}?` +
                    `tweet.fields=created_at,text,attachments,author_id&` +
                    `expansions=author_id,attachments.media_keys&` +
                    `user.fields=name,username,profile_image_url&` +
                    `media.fields=url,type`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.bearer}`,
                    'Content-Type': 'application/json'
                }
            });

            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                switch (response.status) {
                    case 401:
                        throw new Error('Authentication failed. Check your Bearer token');
                    case 404:
                        throw new Error('Tweet not found. It may have been deleted or the ID is incorrect');
                    case 429:
                        throw new Error('Rate limit exceeded. Try again later');
                    default:
                        throw new Error(`Twitter API error: ${response.status} - ${JSON.stringify(errorData)}`);
                }
            }

            const data = await response.json();
            
            await fs.writeFile( __dirname + '/lastpost.json', JSON.stringify(data, null, 2), 'utf8');

            // Extract author information from includes
            const author = data.includes?.users?.[0];
            if (!author) {
                throw new Error('Author information not found in response');
            }
            
            // Extract media information if available
            let mediaUrls = [];
            if (data.includes?.media && data.data.attachments?.media_keys) {
                mediaUrls = data.data.attachments.media_keys.map(key => {
                    const mediaItem = data.includes.media.find(m => m.media_key === key);
                    return mediaItem?.type === 'photo' ? mediaItem.url : null;
                }).filter(url => url !== null);
            }
            
            // Format the response
            return {
                author: {
                    name: author.name,
                    username: author.username,
                    avatarUrl: author.profile_image_url
                },
                content: {
                    text: data.data.text,
                    mediaUrls: mediaUrls
                },
                publishTime: data.data.created_at,
                tweetId: data.data.id
            };
            
        } catch (error) {
            console.error('Error fetching tweet details:', error);
            throw error;
        }
    }

    /**
     * Fetches latest tweets using Twitter API v2 and fetch()
     * @param {string} userId - Twitter username (e.g., "AKEndfield") or numeric ID
     * @returns {Promise<Array>} Array of tweet objects
     */
    async getLatest(userId) {
        // Convert username to numeric ID if needed (optional step; API v2 can use usernames in some endpoints)
        const url = `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,text,public_metrics`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.bearer}`,
                    'Content-Type': 'application/json',
                },
            });

            // Handle HTTP errors
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data || []; // Return tweets array or empty array if no data
        } catch (error) {
            console.error('Error fetching tweets:', error);
            throw error; // Re-throw for caller handling
        }
    }

    /**
     * Returns a numeric ID of a Twitter user
     * @param {string} username The proper username of a Twitter user (e.g., "AKEndfield")
     * @returns {Promise<string>} String of numeric ID of a Twitter user
     */
    async getUserId(username) {
        const url = `https://api.twitter.com/2/users/by/username/${username}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.bearer}` }
        });
        const data = await response.json();
        return data.data.id; // Returns numeric ID (e.g., "44196397")
    }

    /**
     * Obtain a Bearer Token from Twitter API using OAuth 2.0 client credentials flow
     * @returns {Promise<void>}
     */
    async getBearer() {
        // Encode credentials in Base64 for Basic Auth
        const credentials = Buffer.from(`${apiKey}:${apiSecretKey}`).toString('base64');
        
        try {
            const response = await fetch('https://api.x.com/oauth2/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.token_type !== 'bearer') {
                throw new Error('Unexpected token type received');
            }
            
            this.bearer = data.access_token;
        } catch (error) {
            console.error('Error obtaining bearer token:', error);
            throw error;
        }
    }

    async start () {
        const channel = this.discordClient.channels.cache.get(this.debugChannel);
        await channel.send(`[Twitter] Listening dynamics of user with xusername \`\`${this.userid}\`\`.`);
        for await (const _ of setInterval(this.delay)) {
            const response = await this.newPost();
            if (response != undefined) {
                
            }
        }
    }
}