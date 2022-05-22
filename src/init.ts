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
      }, {
        when: (answers) => ~answers.awsConfig.indexOf('y'),
        name:'awsConfig.profile',
        message: 'Provide the aws profile you\'d like to use:',
        validate: (input: string) => input.length > 0
      }, 
      {
        when: (answers) => typeof answers.awsConfig === 'string' && !~answers.awsConfig.indexOf('y'),
        name:'awsConfig.accessKeyId',
        type: 'password',
        message: 'Provide your aws access key id:',
        validate: (input: string) => input.length > 0
      },{
        when: (answers) => answers.awsConfig.accessKeyId,
        name:'awsConfig.secretAccessKey',
        type: 'password',
        message: 'Provide your aws secret access key:',
        validate: (input: string) => input.length > 0
      },{
        when: (answers) => answers.awsConfig.secretAccessKey,
        name:'awsConfig.region',
        type: 'password',
        message: 'Provide your default aws region:',
        validate: (input: string) => input.length > 0
      }, {
        when: (answers) => answers.format.toLowerCase() === '.ts',
        name:'specifyTsConfig',
        message: 'Do you want to specify a tsconfig? (yes | no)',
        default: 'y',
        choices: ['yes', 'no', 'y', 'n']
      }, {
        when: (answers) => ~answers.specifyTsConfig.indexOf('y'),
        validate: function (input: string) {
          const done = this.async();

          setTimeout(function() {
            const tsfile = path.resolve(process.cwd(), input);
            if (!fs.existsSync(tsfile)) {
              done(`${tsfile} does not exist`);
              return;
            }
            done(null, true);
          }, 250);
        },
        name:'tsconfig',
        message: 'What is the relative path to your tsconfig file?',
      }
    ]);

    const format = result.format;
    delete result.format;
    delete result.specifyTsConfig;
    result.user = () => require('os').userInfo().username || 'unknown';

    const stringResult = stringify(result, null, 2);
    const prefixHash = {
      ['.ts']: `export default ${stringResult}`,
      ['.js']: `module.exports = ${stringResult}`,
      ['.json']: JSON.stringify({ ...result, user: result.user.toString() }, null, 2),
      ['package.json']: JSON.stringify({ mograte: { ...result, user: result.user.toString() }, ...require(path.resolve(process.cwd(), 'package.json')) }, null, 2),
    };

    const fileName = format !== 'package.json' ? `.mogrc${format}` : format;
    const filePath = path.resolve(process.cwd(), fileName);
    fs.writeFileSync(filePath, prefixHash[format]);

    logger.log(`Wrote **${filePath}**`);

    if (result.awsConfig.secretAccessKey) {
      logger.warn('**I see you live dangerously... Be careful not to check your secrets into your repo.**');
    }
}