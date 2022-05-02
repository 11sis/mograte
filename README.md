#### dyna

# Mograte

A simple little utility that provides DynamoDB context to store migrations state in a DynamoDB table, and migrate tables and seed data for your application -- up and down.

It's so simple that when it migrates up, it really just reads files in a particular order, reads records from a DynamoDB table, and then pairs them together. If a given file hasn't been run, this will run them, and add a record to the DynamoDB table. When it migrates down, any existing records are deleted from the DynamoDB table. Bingo bango wango tango. That's all she wrote. Bob's your uncle.

## Installation

  ```
  $ npm install -g mograte
  ```
  ... **or** ...
  ```
  $ npm install mograte --save-dev
  ```


## Getting Started

  If you installed as a global npm package, you should call

    $ mograte init

  If you installed as a local project dependency, you should call

    $ npx mograte init

> You will be taken through a series of questions in an interactive shell in order to generate the `.mogrc` file that will be used to drive your migrations behaviors. 
>
> You may select between the following formats: `.js`, `.ts`, `.json`, or `package.json`.
>
> Make a note: generated configuration will be called `mogConfig` in the rest of this document.
>
> If you installed as a package dependency, prefix all calls mentioned in this doc with `npx`.

Your `mogConfig` will look something like this when you're done:
```typescript
    export default {
      language: 'ts', // determines the format of the migrations generated
      migrationsDir: './src/db/migrations', // determines where to read and write migrations to/from
      migrationsTable: 'migrations', // name of the DynamoDB table to write migrations info to
      awsConfig: {
        profile: 'SomeCoolProfileName', // mutually exclusive with other properties in same hash; may also be read from process.env.AWS_PROFILE
        accessKeyId: '*******', // may also be read from process.env.AWS_ACCESS_KEY_ID
        secretAccessKey: '*******', // may also be read from process.env.AWS_SECRET_ACCESS_KEY;
        region: '**-****-*', // may also be read from process.env.AWS_REGION
      },
      user: () => require('os').userInfo().username || 'unknown' // in json formats, this will be a string, but we will eval it for you. This is useful for keeping track of who ran a given migration. Customize or tailor it to your needs (ie. process.env.GITHUB_ACTOR in GH Actions)
    }
```

## Usage

```
Usage: mograte [options] [command]

Options:

  -h, --help     output usage information

Commands:

  init                  Initalize the migrations tool in a project
  list                  List migrations and their status
  create <name>         Create a new migration
  delta                 Gets the number of un-run migrations for reversion purposes
  up [name | number]    Migrate up to a given migration by id, filename, or number
  down [name | number]  Migrate down to a given migration by id, filename, or number
  help                  display help
```

## Creating Migrations

To create a migration, execute `mograte create <title>` with an optional title. You should make the meaningful/atomic so that when you're reasoning about the migrations over time, you have an idea of what you're creating and/or tearing down.

When you ran `mograte init`, you selected a language for your project: `js` or `ts`. You also chose a directory to contain your migrations (`migrationDir`). If you look in your `migrationDir`, you will have a file for your chosen language, what contains two functions: `up` and `down`. You should use them to create any data stuffs you want in your DynamoDB database and/or tear down any such stuffs. They will resemble the following...

### JS example:
```javascript
'use strict'

module.exports.up = async (context) => {

}

module.exports.down = async (context) => {

}
```
### TS example:
```typescript
import { MigrationContext } from 'mograte';

export default {
    up: async (context: MigrationContext): Promise<any> => {

    },
    down: async (context: MigrationContext): Promise<any> => {
        
    }
}
```

### Dynamo Context

Each `up` and `down` migration function is passed a [`context`](./docs/migration-context.md) object when it executes. The context object has some useful abstractions for DynamoDB create/delete/read behaviors. Its contents will help you on your way. Use it to crud DynamoDB tables and items until your heart finds peace.

For example:

```
$ mograte create add-pets
$ mograte create add-owners
```

The first call creates `./{mogConfig.migrationDir}/{timestamp in milliseconds}-add-pets.{mogConfig.language}`, which we can populate:

```javascript
const fs = require('fs');
const TableName = 'pets';

exports.up = async (context) => {
  await context.table.createAsync({ TableName, ...someTableDefinition });
  const petSeed = JSON.parse(fs.readFileSync('./path/to/some/pets.file'));
  await context.item.writeAsync(petSeed, TableName);
}

exports.down = async (next) => {
  await context.table.deleteAsync({ TableName, ...someTableDefinition });
}
```

The second creates `./{mogrc.migrationDir}/{timestamp in milliseconds}-add-owners.{mogrc.language}`, which we can populate:

```javascript
const fs = require('fs');
const TableName = 'owners';

exports.up = async (next) => {
  await context.table.createAsync({ TableName, ...someTableDefinition });
  const pets = await context.item.getAllAsync({ someQuery: 'here', thatIs: 'awsScanParams' });
  const petOwnersSeed = JSON.parse(fs.readFileSync('./path/to/some/pet-owners.file'));
  for (let i = 0; i < pets.length; i++) {
    const pet = pets[i];
    const petOwner = (petOwnersSeed.filter((po) => po.name === pet.ownerName) || [])[0];
    petOwner.petIds = [...(petOwner.petIds || []), pet.id];
  }
  await context.item.writeAsync(petOwnersSeed, TableName);
}

exports.down = async (next) => {
  await context.table.deleteAsync({ TableName, ...someTableDefinition });
}
```

## Running Migrations

When first running the migrations, all will be executed in sequence.

```
$ mograte
  up : 1316027432511-add-pets.js
  up : 1316027432575-add-owners.js
  migration : complete
```

Subsequent attempts will simply output `...No work... Migrations are up to date` because the tables and other artifacts are presumed created until you `mograte down`

```
$ mograte
  ...No work...
  Migrations are up to date
```

If we were to create another migration using `mograte create`, and then execute migrations again, we would execute only those not previously executed:

```
$ mograte
  up : 1316027433455-coolest-owner.js
```

You can also run migrations incrementally by specifying a migration or the number of migration it is

```
$ mograte up 1316027433425-coolest-pet.js # or mograte up 3
  up : 1316027432511-add-pets.js
  up : 1316027432575-add-owners.js
  up : 1316027433425-coolest-pet.js
  migration : complete
```

This will run migrations up to (and including) `1316027433425-add-owners.js`. Similarly you can run down-migrations to (and including) a specific migration, instead of migrating all the way down. When migrating down, remember the migrations are run in reverse order. Also, you may think running `mograte down 1` repeatedly will move the cursor back to each subsequent migration. That is only true if the migration file is also deleted; otherwise, mograte looks at the most recent migration file, sees there is no migration record for it in the database, and considers the work done.

```
$ mograte down 1316027433425-add-owners.js # or mograte down 2
  down : 1316027433425-coolest-pet.js
  down : 1316027432575-add-owners.js
  migration : complete
```

Any time you want to see the current state of the migrations, you can run `mograte list` to see an output like:

```
$ mograte list
  1316027432511-add-pets.js migrated on May 2, 2022, 1:57:46 PM by firstnamelastname
  1316027433425-coolest-pet.js migrated on May 2, 2022, 1:57:46 PM by crazygithubhandle
```
## Rolling Migrations Back

Before you migrate up, you can run `mograte delta`, which will give you the number of migrations that have not been migrated. This number can be used to rollback migrations in case they fail or don't pass any post-migration tests you may have written.

```
$ set MIGRATION_DELTA=$(mograte delta)

$ mograte up
    up : 1316027432511-add-pets.js
    up : 1316027432575-add-owners.js
    migration : complete
  
# do some smoke testing - discover you migrated some data wrong

$ mograte down $MIGRATION_DELTA
    down : 1316027432575-add-owners.js
    down : 1316027432511-add-pets.js
    migration : complete
```
