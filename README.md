# SOL-XEN Claim Checker

This tool checks for unclaimed SOL-XEN points across four miner programs on the Solana blockchain. It allows users to input a Solana address and see if there are any unclaimed points available for conversion into SOL-XEN tokens.

## Features

- Checks unclaimed points across four different SOL-XEN miner programs
- Displays total mined points, minted points, and unclaimed points
- User-friendly command-line interface
- Colorful splash screen and highlighted results for unclaimed tokens

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed Node.js (version 14 or later)
- You have a basic understanding of JavaScript and running Node.js applications

## Installing SOL-XEN Claim Checker

To install SOL-XEN Claim Checker, follow these steps:

1. Clone the repository or download the script file.
2. Navigate to the project directory in your terminal.
3. Run the following command to install the required dependencies:

```bash
npm install @solana/web3.js chalk
```

## Using SOL-XEN Claim Checker

To use SOL-XEN Claim Checker, follow these steps:

1. Open a terminal window.
2. Navigate to the directory containing the script.
3. Run the following command:

```bash
node solxen-claims.js
```

4. When prompted, enter a Solana address to check for unclaimed SOL-XEN points.
5. View the results displayed in the console.
6. Choose to check another address or exit the program.

## Configuration

By default, the script uses the public Solana mainnet RPC endpoint. If you want to use a different RPC endpoint, you can set the `SOLANA_RPC_ENDPOINT` environment variable before running the script:

```bash
export SOLANA_RPC_ENDPOINT="https://your-custom-rpc-endpoint.com"
node solxen-claims.js
```

## Support the Dev

If you find this tool useful, you can support the developer in the following ways:

- Buy a t-shirt from [store.hashhead.io](https://store.hashhead.io)
- Buy me a coffee at [buymeacoffee.com/treecitywes](https://buymeacoffee.com/treecitywes)

