#!/usr/bin/env node

/**
 * Weave CLI Installer & Project Generator
 * Author: Gael R. Gomes <gael.rens@gmail.com>
 * License: MIT
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync, spawnSync } = require("child_process");

// ANSI Colors for Terminal
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[93m", // Bright Brand Yellow (#FFD500)
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

const logo = `
${colors.yellow}${colors.bright}
  ██╗   ██╗ ███████╗  █████╗  ██╗   ██╗ ███████╗
  ██║   ██║ ██╔════╝ ██╔══██╗ ██║   ██║ ██╔════╝
  ██║██╗██║ █████╗   ███████║ ██║   ██║ █████╗  
  ████████║ ██╔══╝   ██╔══██║ ╚██╗ ██╔╝ ██╔══╝  
  ╚██████╔╝ ███████╗ ██║  ██║  ╚████╔╝  ███████╗
${colors.reset}
${colors.yellow}${colors.bright}  Weave${colors.reset} ${colors.dim} — Enterprise AI Agent & Workflow Engine${colors.reset}
${colors.dim}  Created by Gael R. Gomes <gael.rens@gmail.com> (https://gaelgomes.dev)${colors.reset}
`;

function showHelp() {
  console.log(logo);
  console.log(`${colors.bright}Usage:${colors.reset}`);
  console.log(`  npx github:eugaelgomes/theweave [options]`);
  console.log(`  npx create-weave [options]\n`);
  console.log(`${colors.bright}Options:${colors.reset}`);
  console.log(`  -y, --yes          Skip interactive prompts and use defaults`);
  console.log(`  -d, --dir <name>   Target directory for project setup (default: theweave)`);
  console.log(`  -h, --help         Show this help menu\n`);
  console.log(`${colors.bright}Examples:${colors.reset}`);
  console.log(`  npx github:eugaelgomes/theweave`);
  console.log(`  npx github:eugaelgomes/theweave --dir my-agent-app -y\n`);
  process.exit(0);
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function prompt(rl, question, defaultValue = "", autoYes = false) {
  if (autoYes) {
    console.log(`${colors.bright}${question}${colors.reset}: ${colors.yellow}${defaultValue}${colors.reset} (auto-selected)`);
    return Promise.resolve(defaultValue);
  }
  return new Promise((resolve) => {
    const formattedQuestion = defaultValue
      ? `${colors.bright}${question}${colors.reset} ${colors.dim}(default: ${defaultValue})${colors.reset}: `
      : `${colors.bright}${question}${colors.reset}: `;

    rl.question(formattedQuestion, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function generateSecret(length = 32) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      // Ignore build / system / runtime folders
      if (["node_modules", ".git", ".next", "dist", "coverage", ".turbo", ".idea", ".vscode"].includes(childItemName)) return;
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function configureDatabaseAndRedis(rl, autoYes = false) {
  console.log(`\n${colors.bright}Database Setup (PostgreSQL):${colors.reset}`);
  console.log(`  ${colors.yellow}1)${colors.reset} Local Docker Container (PostgreSQL)`);
  console.log(`  ${colors.yellow}2)${colors.reset} External PostgreSQL Database (AWS RDS, Supabase, Neon, Self-Hosted)`);

  const dbChoice = await prompt(rl, "PostgreSQL Choice [1-2]", "1", autoYes);

  let dbHost = "localhost";
  let dbPort = "5432";
  let dbName = "theweave";
  let dbUser = "postgres";
  let dbPass = "postgres";
  let dbUrl = "";
  let usesDockerDb = true;

  if (dbChoice === "2") {
    usesDockerDb = false;
    const enterUrl = await prompt(rl, "Use full DATABASE_URL connection string? (y/n)", "n", autoYes);
    if (enterUrl.toLowerCase() === "y") {
      dbUrl = await prompt(rl, "DATABASE_URL string", "postgresql://postgres:postgres@localhost:5432/theweave?schema=public", autoYes);
    } else {
      dbHost = await prompt(rl, "PostgreSQL Host", "localhost", autoYes);
      dbPort = await prompt(rl, "PostgreSQL Port", "5432", autoYes);
      dbName = await prompt(rl, "PostgreSQL Database Name", "theweave", autoYes);
      dbUser = await prompt(rl, "PostgreSQL User", "postgres", autoYes);
      dbPass = await prompt(rl, "PostgreSQL Password", "postgres", autoYes);
    }
  }

  if (!dbUrl) {
    dbUrl = `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}?schema=public`;
  }

  console.log(`\n${colors.bright}Redis Infrastructure Setup:${colors.reset}`);
  console.log(`  ${colors.yellow}1)${colors.reset} Local Docker Container (Redis)`);
  console.log(`  ${colors.yellow}2)${colors.reset} External Redis Cache (Upstash, AWS ElastiCache, Self-Hosted)`);

  const redisChoice = await prompt(rl, "Redis Choice [1-2]", "1", autoYes);

  let redisHost = "localhost";
  let redisPort = "6379";
  let redisPass = "";
  let usesDockerRedis = true;

  if (redisChoice === "2") {
    usesDockerRedis = false;
    redisHost = await prompt(rl, "Redis Host", "localhost", autoYes);
    redisPort = await prompt(rl, "Redis Port", "6379", autoYes);
    redisPass = await prompt(rl, "Redis Password (optional)", "", autoYes);
  }

  return {
    dbHost,
    dbPort,
    dbName,
    dbUser,
    dbPass,
    dbUrl,
    usesDockerDb,
    redisHost,
    redisPort,
    redisPass,
    usesDockerRedis,
  };
}

async function main() {
  const args = process.argv.slice(2);
  let autoYes = false;
  let customDir = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      showHelp();
    } else if (arg === "-y" || arg === "--yes") {
      autoYes = true;
    } else if (arg === "-d" || arg === "--dir" || arg === "--target") {
      customDir = args[i + 1];
      i++;
    }
  }

  console.clear();
  console.log(logo);

  const rl = createInterface();

  console.log(`${colors.yellow}Welcome to the Weave Setup Wizard!${colors.reset}\n`);

  if (!autoYes && !customDir) {
    console.log(`${colors.bright}Select Installation Action:${colors.reset}`);
    console.log(`  ${colors.yellow}1)${colors.reset} Create new Weave workspace (Clone & Install)`);
    console.log(`  ${colors.yellow}2)${colors.reset} Configure Environment (.env) for current directory`);
    console.log(`  ${colors.yellow}3)${colors.reset} Setup Production Docker Compose stack`);
    console.log(`  ${colors.yellow}4)${colors.reset} Exit\n`);
  }

  const choice = await prompt(rl, "Choice [1-4]", "1", autoYes);

  if (choice === "4") {
    console.log(`${colors.dim}Aborted.${colors.reset}`);
    rl.close();
    process.exit(0);
  }

  const rootRepoPath = path.resolve(__dirname, "..");
  const isInsideMonorepo =
    fs.existsSync(path.join(rootRepoPath, "turbo.json")) &&
    fs.existsSync(path.join(rootRepoPath, "packages/shared"));

  if (choice === "1") {
    const targetDirName = customDir || (await prompt(rl, "Target directory", "theweave", autoYes));
    const targetPath = path.resolve(process.cwd(), targetDirName);

    console.log(`\n${colors.yellow}➜ Setting up project at: ${targetPath}${colors.reset}`);

    if (fs.existsSync(targetPath) && fs.readdirSync(targetPath).length > 0 && targetPath !== rootRepoPath) {
      const overwrite = await prompt(rl, `Directory '${targetDirName}' is not empty. Continue anyway? (y/n)`, "y", autoYes);
      if (overwrite.toLowerCase() !== "y") {
        console.log(`${colors.red}Aborted installation.${colors.reset}`);
        rl.close();
        process.exit(1);
      }
    }

    // Step 1: Obtain source files
    if (isInsideMonorepo && rootRepoPath !== targetPath) {
      console.log(`${colors.dim}Copying template files from workspace...${colors.reset}`);
      copyRecursiveSync(rootRepoPath, targetPath);
    } else if (rootRepoPath !== targetPath) {
      console.log(`${colors.dim}Cloning Weave repository from GitHub...${colors.reset}`);
      try {
        execSync(`git clone https://github.com/eugaelgomes/theweave.git "${targetPath}"`, {
          stdio: "inherit",
        });
      } catch (err) {
        console.error(`${colors.red}Failed to clone repository from GitHub.${colors.reset}`);
        rl.close();
        process.exit(1);
      }
    }

    // Step 2: Configure Database & Redis infrastructure choices
    const infra = await configureDatabaseAndRedis(rl, autoYes);

    const envPath = path.join(targetPath, ".env");
    const jwtSecret = generateSecret(64);

    const customEnv = `
# Generated by Weave CLI
PORT=5000
NODE_ENV=development
USE_DOPPLER=false

DATABASE_HOST_URL=${infra.dbHost}
DATABASE_SERVICE_PORT=${infra.dbPort}
DATABASE_NAME=${infra.dbName}
DATABASE_USERNAME=${infra.dbUser}
DATABASE_PASSWORD=${infra.dbPass}
DATABASE_URL="${infra.dbUrl}"

REDIS_HOST=${infra.redisHost}
REDIS_PORT=${infra.redisPort}
REDIS_URL="redis://${infra.redisHost}:${infra.redisPort}"
${infra.redisPass ? `REDIS_PASSWORD=${infra.redisPass}\n` : ""}
JWT_SECRET=${jwtSecret}
JWT_EXPIRATION=7d
`;

    fs.writeFileSync(envPath, customEnv.trim() + "\n");
    console.log(`\n${colors.green}✓ Saved custom configuration to .env${colors.reset}`);

    // Step 3: Install dependencies
    const installDeps = await prompt(rl, "Install workspace dependencies now? (y/n)", "y", autoYes);
    if (installDeps.toLowerCase() === "y") {
      console.log(`\n${colors.yellow}Installing workspace dependencies via npm...${colors.reset}`);
      try {
        spawnSync("npm", ["install"], { cwd: targetPath, stdio: "inherit" });
      } catch (err) {
        console.warn(`${colors.yellow}npm install encountered an issue. You can run it manually later.${colors.reset}`);
      }

      console.log(`\n${colors.yellow}Generating Prisma client...${colors.reset}`);
      try {
        spawnSync("npm", ["run", "db:generate"], { cwd: targetPath, stdio: "inherit" });
      } catch (err) {
        console.warn(`${colors.yellow}Prisma generation skipped. Run 'npm run db:generate' later.${colors.reset}`);
      }
    }

    console.log(`\n${colors.green}${colors.bright}🎉 Weave Workspace Initialized Successfully!${colors.reset}\n`);
    console.log(`${colors.bright}Next Steps:${colors.reset}`);
    if (process.cwd() !== targetPath) {
      console.log(`  ${colors.yellow}cd ${targetDirName}${colors.reset}`);
    }

    if (infra.usesDockerDb || infra.usesDockerRedis) {
      console.log(`  ${colors.yellow}npm run services:up${colors.reset}   # Start PostgreSQL and Redis containers`);
    } else {
      console.log(`  ${colors.dim}# (PostgreSQL and Redis external connections configured)${colors.reset}`);
    }

    console.log(`  ${colors.yellow}npm run db:migrate${colors.reset}    # Run database schema migrations`);
    console.log(`  ${colors.yellow}npm run dev${colors.reset}           # Launch development services\n`);
  } else if (choice === "2") {
    console.log(`\n${colors.yellow}➜ Configuring .env file...${colors.reset}`);
    const infra = await configureDatabaseAndRedis(rl, autoYes);

    const envPath = path.resolve(process.cwd(), ".env");
    const jwtSecret = generateSecret(64);

    const customEnv = `
# Generated by Weave CLI
PORT=5000
NODE_ENV=development
USE_DOPPLER=false

DATABASE_HOST_URL=${infra.dbHost}
DATABASE_SERVICE_PORT=${infra.dbPort}
DATABASE_NAME=${infra.dbName}
DATABASE_USERNAME=${infra.dbUser}
DATABASE_PASSWORD=${infra.dbPass}
DATABASE_URL="${infra.dbUrl}"

REDIS_HOST=${infra.redisHost}
REDIS_PORT=${infra.redisPort}
REDIS_URL="redis://${infra.redisHost}:${infra.redisPort}"
${infra.redisPass ? `REDIS_PASSWORD=${infra.redisPass}\n` : ""}
JWT_SECRET=${jwtSecret}
JWT_EXPIRATION=7d
`;

    fs.writeFileSync(envPath, customEnv.trim() + "\n");
    console.log(`\n${colors.green}✓ Saved custom configuration to .env${colors.reset}\n`);
  } else if (choice === "3") {
    console.log(`\n${colors.yellow}➜ Production Docker Compose Stack:${colors.reset}`);
    console.log(`Run the following command to boot services in production mode:\n`);
    console.log(`  ${colors.bright}docker compose -f docker-compose.yml up -d --build${colors.reset}\n`);
  }

  rl.close();
}

main().catch((err) => {
  console.error(`${colors.red}Error executing CLI wizard:${colors.reset}`, err);
  process.exit(1);
});
