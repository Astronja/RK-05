import fs from 'fs/promises';
import { setInterval } from 'timers/promises';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Gryphline {
    constructor (client, config) {
        this.discordClient = client;
    }

    async start () {
        
    }
}