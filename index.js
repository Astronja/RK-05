import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();
import { Qianyu } from './prototype.js';

async function start (option) {
    let config = JSON.parse(await fs.readFile('./config.json', 'utf8'));
    let token = process.env.token;
    if (option === 'test') {
        token = process.env.ada;
        config['platforms'] = config['test_platforms'];
    }
    const prototype = new Qianyu(config, token);
    await prototype.login();
    await delay(3000);
    prototype.startLoop();
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

start();