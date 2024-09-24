import { Connection, PublicKey } from '@solana/web3.js';
import readline from 'readline';
import chalk from 'chalk';

const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";

const MINER_PROGRAM_IDS = [
    "B8HwMYCk1o7EaJhooM4P43BHSk5M8zZHsTeJixqw7LMN",
    "2Ewuie2KnTvMLwGqKWvEM1S2gUStHzDUfrANdJfu45QJ",
    "5dxcK28nyAJdK9fSFuReRREeKnmAGVRpXPhwkZxAxFtJ",
    "DdVCjv7fsPPm64HnepYy5MBfh2bNfkd84Rawey9rdt5S"
];
const MINTER_PROGRAM_ID = "EPAdVJ5S317jJr2ejgxoA52iptvphGXjPLbqXhZH4n8o";

const REQUEST_DELAY = 500;
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 5000;

function displaySplashScreen() {
    console.clear();
    console.log(chalk.cyan.bold(`
    ███████╗ ██████╗ ██╗     ██╗  ██╗███████╗███╗   ██╗
    ██╔════╝██╔═══██╗██║     ╚██╗██╔╝██╔════╝████╗  ██║
    ███████╗██║   ██║██║      ╚███╔╝ █████╗  ██╔██╗ ██║
    ╚════██║██║   ██║██║      ██╔██╗ ██╔══╝  ██║╚██╗██║
    ███████║╚██████╔╝███████╗██╔╝ ██╗███████╗██║ ╚████║
    ╚══════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝
    `));
    console.log(chalk.yellow.bold("        Claim Check by TreeCityWes.eth\n"));
    console.log(chalk.white("This tool checks for unclaimed SOL-XEN points across four miners."));
    console.log(chalk.white("Enter a Solana address to see if there are any points available."));
    console.log(chalk.white("Press any key to continue..."));
}

async function getUserSolXnRecordPDA(userPubkey, kind, programId) {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("xn-by-sol"),
            userPubkey.toBuffer(),
            Buffer.from([kind]),
            new PublicKey(programId).toBuffer()
        ],
        new PublicKey(programId)
    )[0];
}

async function getUserTokensRecordPDA(userPubkey) {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("sol-xen-minted"),
            userPubkey.toBuffer()
        ],
        new PublicKey(MINTER_PROGRAM_ID)
    )[0];
}

function parseUserSolXnRecord(data) {
    if (!data) return null;
    return {
        hashes: data.readBigUInt64LE(8),
        superhashes: data.readUInt32LE(16),
        points: data.readBigUInt64LE(20)
    };
}

function parseUserTokensRecord(data) {
    if (!data) return null;
    return {
        points_counters: [
            data.readBigUInt64LE(8),
            data.readBigUInt64LE(24),
            data.readBigUInt64LE(40),
            data.readBigUInt64LE(56)
        ],
        tokens_minted: data.readBigUInt64LE(72)
    };
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAccountInfoWithRetry(connection, pubkey, maxRetries = MAX_RETRIES, initialDelay = INITIAL_RETRY_DELAY) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const accountInfo = await connection.getAccountInfo(pubkey);
            await delay(REQUEST_DELAY);
            return accountInfo;
        } catch (error) {
            if (error.message.includes("429 Too Many Requests")) {
                retries++;
                const delayTime = initialDelay * Math.pow(2, retries);
                console.log(`Rate limit exceeded. Retrying in ${delayTime/1000} seconds...`);
                await delay(delayTime);
            } else {
                throw error;
            }
        }
    }
    throw new Error("Max retries reached. Unable to fetch account info.");
}

async function checkUnclaimedPoints(solanaAddress) {
    console.log(`\nUsing RPC endpoint: ${RPC_ENDPOINT}`);
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    const userPubkey = new PublicKey(solanaAddress);

    let totalMinedPoints = BigInt(0);
    const minedPointsByProgram = {};
    const unclaimedPointsByProgram = {};

    for (let programIndex = 0; programIndex < MINER_PROGRAM_IDS.length; programIndex++) {
        const programId = MINER_PROGRAM_IDS[programIndex];
        let programPoints = BigInt(0);

        for (let kind = 0; kind < 4; kind++) {
            const userSolXnRecordPDA = await getUserSolXnRecordPDA(userPubkey, kind, programId);
            const accountInfo = await getAccountInfoWithRetry(connection, userSolXnRecordPDA);
            const userSolXnRecord = parseUserSolXnRecord(accountInfo?.data);

            if (userSolXnRecord) {
                const minedPoints = userSolXnRecord.points;
                programPoints += minedPoints;
                totalMinedPoints += minedPoints;
                console.log(`Miner Program ${programIndex}, Kind ${kind}: Mined points = ${minedPoints.toString()}`);
            }
        }

        minedPointsByProgram[programId] = programPoints;
        console.log(`Total points for Miner Program ${programIndex}: ${programPoints.toString()}`);
    }

    const userTokensRecordPDA = await getUserTokensRecordPDA(userPubkey);
    const accountInfo = await getAccountInfoWithRetry(connection, userTokensRecordPDA);
    const userTokensRecord = parseUserTokensRecord(accountInfo?.data);

    if (userTokensRecord) {
        const totalMintedPoints = userTokensRecord.points_counters.reduce((a, b) => a + b, BigInt(0));
        console.log(`\nTotal minted points: ${totalMintedPoints.toString()}`);

        for (let programIndex = 0; programIndex < MINER_PROGRAM_IDS.length; programIndex++) {
            const programId = MINER_PROGRAM_IDS[programIndex];
            const programPoints = minedPointsByProgram[programId];
            const mintedPoints = userTokensRecord.points_counters[programIndex];
            const unclaimedPoints = programPoints > mintedPoints ? programPoints - mintedPoints : BigInt(0);

            console.log(`\nMiner Program ${programIndex}:`);
            console.log(`  Mined points: ${programPoints.toString()}`);
            console.log(`  Minted points: ${mintedPoints.toString()}`);
            console.log(`  Unclaimed points: ${unclaimedPoints.toString()}`);

            if (unclaimedPoints > 0) {
                unclaimedPointsByProgram[programId] = unclaimedPoints;
            }
        }

        const totalUnclaimedPoints = totalMinedPoints > totalMintedPoints ? totalMinedPoints - totalMintedPoints : BigInt(0);
        console.log(`\nTotal mined points across all programs: ${totalMinedPoints.toString()}`);
        console.log(`Total minted points: ${totalMintedPoints.toString()}`);
        console.log(`Total unclaimed points: ${totalUnclaimedPoints.toString()}`);
        const unclaimedTokens = totalUnclaimedPoints / BigInt(1000);
        console.log(`Unclaimed tokens: ${unclaimedTokens.toString()}`);

        if (totalUnclaimedPoints > 0) {
            console.log(chalk.red.bold(`\nUNCLAIMED SOL-XEN FOUND: ${unclaimedTokens} tokens`));
        }

        return { unclaimedPointsByProgram, totalUnclaimedPoints };
    } else {
        console.log("\nNo minted tokens record found.");
        console.log(`Total mined points across all programs: ${totalMinedPoints.toString()}`);
        const unclaimedTokens = totalMinedPoints / BigInt(1000);
        console.log(`Unclaimed tokens: ${unclaimedTokens.toString()}`);

        if (totalMinedPoints > 0) {
            console.log(chalk.red.bold(`\nUNCLAIMED SOL-XEN FOUND: ${unclaimedTokens} tokens`));
        }

        return { unclaimedPointsByProgram: minedPointsByProgram, totalUnclaimedPoints: totalMinedPoints };
    }
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    displaySplashScreen();

    await new Promise(resolve => rl.question("", resolve));

    while (true) {
        console.clear();
        const solanaAddress = await new Promise(resolve => {
            rl.question("Enter a Solana address (or type 'exit' to quit): ", resolve);
        });

        if (solanaAddress.toLowerCase() === 'exit') {
            break;
        }

        try {
            await checkUnclaimedPoints(solanaAddress);
        } catch (error) {
            console.error("An error occurred:", error);
        }

        console.log("\n");
        await new Promise(resolve => {
            rl.question("Press Enter to check another address, or type 'exit' to quit: ", (answer) => {
                if (answer.toLowerCase() === 'exit') {
                    rl.close();
                    process.exit(0);
                }
                resolve();
            });
        });
    }

    rl.close();
}

main().catch((error) => console.error("An error occurred:", error));
