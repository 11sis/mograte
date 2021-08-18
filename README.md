# SOME LIBRARY

### Directions

1. fork repo
1. change package.json properties
    - `name`
    - `description`
    - `keywords`
    - `repository`
      - `type`
      - `url`
    - `author`
      - `name`
      - `email`
    - `homepage`

### .npmrc

In order to publish packages to npm, you must have credentials configured in `~/.npmrc` for the appropriate scope.

For npm, you'll have to create an account, go into your account, and create an auth token

This will change for various scopes, but given that this is a sample repo, here is an example `~/.npmrc` file:

```
@my-scope:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken={npmjs.org_auth_token_here}
```

### npm scripts

1. `npm start` | `npm run start`
    - links build output to global npm context
    - runs nodemon, which watches for changes in `src` and links and watches when files are saved
1. `npm run lint`
    - runs eslint across all {js,ts,tsx} files in `src`
1. `npm test` | `npm run test`
    - uses mocha to test all `tests/**/*.test.ts` files
1. `npm run test:ci`
    - runs mocha to test all `tests/**/*.test.ts` files and uses nyc to produce report
1. `npm run test:watch` 
    - runs/reruns mocha to test all `tests/**/*.test.ts` files when files change
1. `npm build` | `npm run build`
    - deletes all files in `dist`
    - runs `tsc` (transcompiles js to ts) and lists all files
1. `npm run watch`
    - runs/reruns `tsc` (transcompiles js to ts) when files change
1. `npm run buildAndPublishBranch`  **need `~/.npmrc` setup/configured to use.
    - updates version in package.json
    - publishes npm package with short git commit hash prefix
    - amends current commit with new version info (does not push new commit)
1. `npm run buildAndPublishBeta`  **need `~/.npmrc` setup/configured to use.
    - updates version in package.json
    - publishes npm package with `beta` prefix
    - amends current commit with new version info (does not push new commit)