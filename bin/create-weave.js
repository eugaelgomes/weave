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
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

const logo = `
${colors.cyan}${colors.bright}
  ██╗   ██╗ ███████╗  █████╗  ██╗   ██╗ ███████╗
  ██║   ██║ ██╔════╝ ██╔══██╗ ██║   ██║ ██╔════╝
  ██║██╗██║ █████╗   ███████║ ██║   ██║ █████╗  
  ████████║ ██╔══╝   ██╔══██║ ╚██╗ ██╔╝ ██╔══╝  
  ╚██████╔╝ ███████╗ ██║  ██║  ╚████╔╝  ███████╗
${colors.reset}
${colors.bright}  Weave${colors.reset} ${colors.dim} — Enterprise AI Agent & Workflow Engine${colors.reset}
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
    console.log(`${colors.bright}${question}${colors.reset}: ${colors.cyan}${defaultValue}${colors.reset} (auto-selected)`);
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
    console.log(`  ${colors.cyan}1)${colors.reset} Create new Weave workspace (Clone & Install)`);
    console.log(`  ${colors.cyan}2)${colors.reset} Configure Environment (.env) for current directory`);
    console.log(`  ${colors.cyan}3)${colors.reset} Setup Production Docker Compose stack`);
    console.log(`  ${colors.cyan}4)${colors.reset} Exit\n`);
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

    console.log(`\n${colors.cyan}➜ Setting up project at: ${targetPath}${colors.reset}`);

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

    // Step 2: Configure .env
    const envPath = path.join(targetPath, ".env");
    const envExamplePath = path.join(targetPath, ".env.example");

    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
      console.log(`${colors.dim}Creating .env file with default secrets...${colors.reset}`);
      let envContent = fs.readFileSync(envExamplePath, "utf-8");

      // Auto-generate JWT secrets if placeholder exists
      const jwtSecret = generateSecret(64);
      envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${jwtSecret}`);
      fs.writeFileSync(envPath, envContent);
    }

    // Step 3: Install dependencies
    const installDeps = await prompt(rl, "Install workspace dependencies now? (y/n)", "y", autoYes);
    if (installDeps.toLowerCase() === "y") {
      console.log(`\n${colors.cyan}Installing workspace dependencies via npm...${colors.reset}`);
      try {
        spawnSync("npm", ["install"], { cwd: targetPath, stdio: "inherit" });
      } catch (err) {
        console.warn(`${colors.yellow}npm install encountered an issue. You can run it manually later.${colors.reset}`);
      }

      console.log(`\n${colors.cyan}Generating Prisma client...${colors.reset}`);
      try {
        spawnSync("npm", ["run", "db:generate"], { cwd: targetPath, stdio: "inherit" });
      } catch (err) {
        console.warn(`${colors.yellow}Prisma generation skipped. Run 'npm run db:generate' later.${colors.reset}`);
      }
    }

    console.log(`\n${colors.green}${colors.bright}🎉 Weave Workspace Initialized Successfully!${colors.reset}\n`);
    console.log(`${colors.bright}Next Steps:${colors.reset}`);
    if (process.cwd() !== targetPath) {
      console.log(`  ${colors.cyan}cd ${targetDirName}${colors.reset}`);
    }
    console.log(`  ${colors.cyan}npm run services:up${colors.reset}   # Start PostgreSQL and Redis containers`);
    console.log(`  ${colors.cyan}npm run db:migrate${colors.reset}    # Run database schema migrations`);
    console.log(`  ${colors.cyan}npm run dev${colors.reset}           # Launch development services\n`);
  } else if (choice === "2") {
    console.log(`\n${colors.cyan}➜ Configuring .env file...${colors.reset}`);
    const envPath = path.resolve(process.cwd(), ".env");
    const envExamplePath = path.resolve(process.cwd(), ".env.example");

    const jwtSecret = generateSecret(64);
    const dbHost = await prompt(rl, "PostgreSQL Host", "localhost", autoYes);
    const dbPort = await prompt(rl, "PostgreSQL Port", "5432", autoYes);
    const dbName = await prompt(rl, "PostgreSQL Database Name", "theweave", autoYes);
    const dbUser = await prompt(rl, "PostgreSQL User", "postgres", autoYes);
    const dbPass = await prompt(rl, "PostgreSQL Password", "postgres", autoYes);
    const redisHost = await prompt(rl, "Redis Host", "localhost", autoYes);
    const redisPort = await prompt(rl, "Redis Port", "6379", autoYes);

    const customEnv = `
# Generated by Weave CLI
PORT=5000
NODE_ENV=development
USE_DOPPLER=false

DATABASE_HOST_URL=${dbHost}
DATABASE_SERVICE_PORT=${dbPort}
DATABASE_NAME=${dbName}
DATABASE_USERNAME=${dbUser}
DATABASE_PASSWORD=${dbPass}
DATABASE_URL="postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}?schema=public"

REDIS_HOST=${redisHost}
REDIS_PORT=${redisPort}

JWT_SECRET=${jwtSecret}
JWT_EXPIRATION=7d
`;

    fs.writeFileSync(envPath, customEnv.trim() + "\n");
    console.log(`\n${colors.green}✓ Saved custom configuration to .env${colors.reset}\n`);
  } else if (choice === "3") {
    console.log(`\n${colors.cyan}➜ Production Docker Compose Stack:${colors.reset}`);
    console.log(`Run the following command to boot services in production mode:\n`);
    console.log(`  ${colors.bright}docker compose -f docker-compose.yml up -d --build${colors.reset}\n`);
  }

  rl.close();
}

main().catch((err) => {
  console.error(`${colors.red}Error executing CLI wizard:${colors.reset}`, err);
  process.exit(1);
});
