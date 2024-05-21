# Data-Checks

This project, `data-checks`, contains several scripts to help you with creating, deploying, and generating Cloudflare based functions to run checks on our data consistency. Below are instructions on how to use the repo.

## Prerequisites

Node.js and npm.

## Scripts

The following scripts are defined in the `package.json` file:

### Create a New Data Check

To create a new data check, run the following command:

```shell
npm run create <name>
```

- `<name>`: Replace `<name>` with the desired name of your data check directory.

This script will:

1. Create a new directory under the `src` folder named after the provided `<name>`.
2. Copy templates into the new directory.
3. Replace placeholder text in `package.json` and `wrangler.toml` files with the `<name>`.
4. Install the necessary npm dependencies for the new data check.
5. Generate necessary Cloudflare types.

### Deploy the Data Check

To deploy your data check, run the following command:

```shell
npm run deploy
```

This script will execute the `deploy.sh` script located in the `scripts` directory.

### Generate Cloudflare Types

To generate the necessary Cloudflare types, run the following command:

```shell
npm run cf-typegen
```

This script will execute the `typegen.sh` script located in the `scripts` directory.

## Directory Structure

```
data-checks/
├── package.json
├── scripts/
│   ├── create.sh
│   ├── deploy.sh
│   └── typegen.sh
└── src/
    └── <name>/
        ├── package.json
        └── wrangler.toml
```

## Adding variables

To add variables to the data check, like DUNE API KEY, add them to the KV store defined in the add_env.sh script. The script will add the variables to the KV store, which will be accessible in the data check function.

## Notes

- Ensure that the `scripts` folder contains all required script files: `create.sh`, `deploy.sh`, and `typegen.sh`.
- The `<name>` placeholder in the scripts will be replaced with the actual name you provide when you run the `npm run create <name>` command.

Feel free to contribute to the project or report any issues you encounter.
