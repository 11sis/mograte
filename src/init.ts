import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { stringify } from "javascript-stringify";
const inquirer = require('inquirer');

export const writeMogrationConfig = async () => {
    // const config: any = {};
    const result = await inquirer.prompt([{
            name: 'language',
            message: 'Is yours a typescript or javascript project? (js | ts)',
            default: 'ts',
            choices: ['ts', 'js'],
            validate: (input: string) => {
                switch((input || '').toLowerCase()) {
                    case 'ts':
                    case 'js':
                        return true;
                    default:
                        return false;
                }
            }
        }, {
            name: 'format',
            message: 'Choose config target: (.js | .ts | .json | package.json)',
            default: '.ts',
            choices: ['.ts', '.js', '.json', 'package.json'],
            validate: (input: string) => {
                switch((input || '').toLowerCase()) {
                    case '.ts':
                    case '.js':
                    case '.json':
                    case 'package.json':
                        return true;
                    default:
                        return false;
                }
            }
        }, {
            name:'migrationsDir',
            message: 'What is the relative path to your migrations directory?',
            default: './src/db/migrations'
        }, {
            name:'migrationsTable',
            message: 'What would you like the name of your migrations table to be?',
            default: 'migrations'
        }, {
            name:'awsConfig',
            message: 'Do you want to use an aws profile? (yes | no)',
            default: 'y',
            choices: ['yes', 'no', 'y', 'n']
        }
    ]);

    let awsConfig: any = {};
    let dangerousPath = false;
    if (~result.awsConfig.indexOf('y')) {
        awsConfig = await inquirer.prompt([{
            name:'profile',
            message: 'Provide the aws profile you\'d like to use:',
            validate: (input: string) => {
                return input.length > 0;
            }
        }]);
    } else {
        dangerousPath = true;
        awsConfig = await inquirer.prompt([{
                name:'accessKeyId',
                type: 'password',
                message: 'Provide your aws access key id:',
                validate: (input: string) => {
                    return input.length > 0;
                }
            },{
                name:'secretAccessKey',
                type: 'password',
                message: 'Provide your aws secret access key:',
                validate: (input: string) => {
                    return input.length > 0;
                }
            },{
                name:'region',
                type: 'password',
                message: 'Provide your default aws region:',
                validate: (input: string) => {
                    return input.length > 0;
                }
            }
        ]);
    }
    const format = result.format;
    delete result.format;
    result.awsConfig = awsConfig;
    result.user = () => require('os').userInfo().username || 'unknown';

    const stringResult = stringify(result, null, 4);
    const prefixHash = {
        ['.ts']: `export default ${stringResult}`,
        ['.js']: `module.exports = ${stringResult}`,
        ['.json']: JSON.stringify({ ...result, user: result.user.toString() }, null, 4),
        ['package.json']: JSON.stringify({ mograte: { ...result, user: result.user.toString() }, ...require(path.resolve(process.cwd(), 'package.json')) }, null, 4),
    };

    const fileName = format !== 'package.json' ? `.mogrc${format}` : format;
    const filePath = path.resolve(process.cwd(), fileName);
    fs.writeFileSync(filePath, prefixHash[format]);

    logger.log(`Wrote **${filePath}**`);

    if (dangerousPath) {
        logger.warn('I wouldn\'t go leaving your aws secrets laying around. Perhaps you should load them via environment variables.');
    }
}