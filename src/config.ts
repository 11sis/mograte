import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DynamoTableDefinition, MograteConfig } from './types';
import { logger } from './logger';
import stripJsonTrailingCommas from 'strip-json-trailing-commas';
const webpack = require('webpack');

const getMigrationsTableParams = (tableName: string): DynamoTableDefinition => {
    return {
        KeySchema: [
            {
                AttributeName: 'id',
                KeyType: 'HASH'
            }
        ],
        AttributeDefinitions: [
            {
                AttributeName: 'id',
                AttributeType: 'N'
            }
        ],
        BillingMode: 'PAY_PER_REQUEST',
        TableName: tableName,
        StreamSpecification: {
            StreamEnabled: false
        }
    };
}

const getPackageConfig = (): any => {
    const packageJsonExists = fs.existsSync('package.json');
    if (packageJsonExists) {
        let packageMograteConfig = (require(path.resolve(process.cwd(), 'package.json')) || {}).mograte;
        if (packageMograteConfig){
            packageMograteConfig.user = setUserFn(packageMograteConfig);
            return packageMograteConfig as MograteConfig;
        }
    }
}

const setUserFn = (json: any) => {
    if (typeof json.user === 'function') {
        return json.user;
    }

    if (json.user && typeof json.user === 'string') {
        try {
            json.user = eval(json.user);
            json.user();
        } catch(z) {
            json.user = require('os').userInfo().username || 'unknown';
        }
    }
    return json.user;
}

const getNodeModulesDirectory = () => {
    let currentDir = process.cwd();
    while (currentDir !== path.parse(currentDir).root) {
        const possibleNodeModulesPath = path.join(currentDir, 'node_modules');
        if (fs.existsSync(possibleNodeModulesPath)) {
            return possibleNodeModulesPath;
        }
        currentDir = path.dirname(currentDir);
    }
    return null;
}

const getTSConfig = async (filename: string): Promise<any> => {
  const filePath = path.resolve(process.cwd(), filename);
  const tmpDir = path.join(os.tmpdir(), '.tmp');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir);
  const webpackConfig = require(path.resolve(__dirname, 'templates/webpack.config'));
  const tsconfigContents = require(path.resolve(__dirname, 'templates/tsconfig.json'));
  const tsconfigFilePath = path.resolve(tmpDir, 'tsconfig.json');

  const jsFile = path.resolve(tmpDir, path.basename(filename).replace('.ts', '.js'));
  webpackConfig.output.filename = path.basename(filename).replace('.ts', '.js');
  webpackConfig.entry = filePath;
  webpackConfig.output.path = tmpDir;
  webpackConfig.module.rules[0].options = {
    configFile: tsconfigFilePath
  }
  tsconfigContents.files = [filePath];
  const typeRoot= path.resolve(__dirname, '@types/node');
  if (!tsconfigContents.compilerOptions.typeRoots.includes(typeRoot)) {
    tsconfigContents.compilerOptions.typeRoots.push(typeRoot);
    tsconfigContents.compilerOptions.typeRoots.push(path.dirname(typeRoot))
  }

  // symlink node_modules
  const nodeModulesDir = getNodeModulesDirectory() as string;
  fs.symlinkSync(nodeModulesDir, path.join(tmpDir, 'node_modules'), 'dir');

  // write tsconfig
  fs.writeFileSync(tsconfigFilePath, JSON.stringify(tsconfigContents, null, 2));

  const prom = new Promise((resolve, reject) => {
    webpack(webpackConfig, (error, stats) => {
      if (error || stats.hasErrors()) {
        return reject({ error, stats });
      }
      resolve(jsFile);
    });
  });
  
  try {
    await prom;
  }catch(err: any) {

    for(let i = 0; i < err.stats.compilation.errors.length; i++){ 
      const error = err.stats.compilation.errors[i];
      logger.error(error.stack);
    }
    process.exit(1);
  }

  const module = require(jsFile);
  return module.default ? module.default : module;
}

const getFileConfig = async (filename: string, checkTs = false): Promise<any> => {
  const mogrcFileExists = fs.existsSync(filename);
  if (mogrcFileExists) {
    let mogrc;
    if (checkTs) {
      mogrc = await getTSConfig(filename) as any;
    } else {
      mogrc = require(path.resolve(process.cwd(), filename));
    }
    if (mogrc) { 
      if (typeof mogrc === 'function') {
        mogrc = mogrc();
        if (mogrc.then) {
          mogrc = await (mogrc as any);
        }
      }
      mogrc.user = setUserFn(mogrc);
      if (!path.isAbsolute(mogrc.migrationsDir)) {
        const parent = path.resolve(process.cwd(), path.dirname(filename))
        mogrc.migrationsDir = path.resolve(parent, mogrc.migrationsDir);
      }
      return mogrc as MograteConfig;
    }
  }
}

const getConfig = async (): Promise<MograteConfig> => {

    var argv = require('minimist')(process.argv.slice(2));
    const [command,] = argv._;

     /**
     * 
     * load user-provided config file
     *
     **/
    if (argv.config) {
        const configFileContents = await getFileConfig(argv.config, argv.config.split('.').includes('ts'));
        if (configFileContents) {
            return configFileContents;
        }

        logger.error(`${argv.config} does not exist.`);
        return process.exit(1);
    }

    /**
     * 
     * Default config file support (.json, .js, .ts) -->
     *
     **/

    // check package.json first
    const packageJson = await getPackageConfig();
    if (packageJson) {
        return packageJson;
    }

    const mogrc = '.mogrc';

    // check for .mogrc.json
    const morgrcJsonFileJson = await getFileConfig(`${mogrc}.json`);
    if (morgrcJsonFileJson) {
        return morgrcJsonFileJson;
    }

    // check for .mogrc.js
    const morgrcJsFileObj = await getFileConfig(`${mogrc}.js`);
    if (morgrcJsFileObj) {
        return morgrcJsFileObj;
    }

    // check for .mogrc.ts
    const morgrcTsFileObj = await getFileConfig(`${mogrc}.ts`, true);
    if (morgrcTsFileObj) {
        return morgrcTsFileObj;
    }

    if (!command || (command !== 'help' && command !== 'init')) {
        logger.error(`Found no **${mogrc}.ts**, **${mogrc}.js**, nor **${mogrc}.json** file and no '**mograte**' key in package.json.`);
        logger.info(`Run **mograte init** to create your .mogrc config`);
        return process.exit(1);
    }

    return { skipValidation: true } as any;
}

const validateConfig = (config: MograteConfig): MograteConfig => {
  if (config.skipValidation) {
    return {} as any;
  }

  if (config.awsConfig) {
    if (!(config.awsConfig as any).profile) {
      if (
        !(config.awsConfig as any).secretAccessKey ||
        !(config.awsConfig as any).accessKeyId
      ) {
        logger.error(`You must specify 'awsConfig' in config. See documentation`);
        process.exit(1);
      } else if (!(config.awsConfig as any).region) {
        (config.awsConfig as any).region = 'us-east-1';
      }
      process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || (config.awsConfig as any).accessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || (config.awsConfig as any).secretAccessKey;
      process.env.AWS_REGION = process.env.AWS_REGION || (config.awsConfig as any).region;
    } else {
      process.env.AWS_SDK_LOAD_CONFIG = 'true';
      process.env.AWS_PROFILE = process.env.AWS_PROFILE || (config.awsConfig as any).profile;
    }
  } else {
    if (
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION
    ) {
        delete process.env.AWS_SDK_LOAD_CONFIG;
        (config as any).awsConfig = {} as any;
        (config.awsConfig as any).accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        (config.awsConfig as any).secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        (config.awsConfig as any).region = process.env.AWS_REGION
    } else {
      if (process.env.AWS_PROFILE) {
        process.env.AWS_SDK_LOAD_CONFIG = 'true';
        (config.awsConfig as any).profile = process.env.AWS_PROFILE;
      } else {
        logger.error(`No **awsConfig** in configuration, and aws environment variables are inadequate to connect`);
        process.exit(1);
      }
    }
  }

  if (!config.language) {
    config.language = 'js';
  } else {
    if (config.language === 'ts') {
      const defaultTsconfigPath =  path.resolve(__dirname, 'templates/tsconfig.json');

      if (!config.tsconfig) {
        config.tsconfig = defaultTsconfigPath;
      } else if (!fs.existsSync(config.tsconfig)) {
        config.tsconfig = defaultTsconfigPath;
      }

      const defaultTsConfig = JSON.parse(stripJsonTrailingCommas(fs.readFileSync(defaultTsconfigPath, { encoding:'utf-8' })));
      const tsconfig = JSON.parse(stripJsonTrailingCommas(fs.readFileSync(config.tsconfig, { encoding:'utf-8' })));

      config.tsconfig = path.resolve(require('os').tmpdir(), 'tsconfig.json');
      const configObj = {
        ...tsconfig,
        ...defaultTsConfig
      };
      fs.writeFileSync(config.tsconfig, JSON.stringify(configObj));
    }
  }

  if (!config.migrationsDir) {
    config.migrationsDir = './src/db/migrations';
  }

  if (typeof config.migrationsTable === 'string' || !config.migrationsTable) {
    config.migrationsTableDef = getMigrationsTableParams(config.migrationsTable as string || 'migrations');
  } else if (typeof config.migrationsTable === 'object') {
    config.migrationsTableDef = config.migrationsTable;
  }

  config.keepJS = config.keepJS === undefined ? false: true;

  return config;
}

export class Config {
  private static  _config;
  static get() {
    return this._config;
  }
  static async init() {
    const c = await getConfig();
    this._config = validateConfig(c);
  }
}
