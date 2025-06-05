const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const GIT_REPO = 'https://github.com/Hurchil/auto-inbox-whatsapp-bot.git'; // Remplace par ton URL Git
const PROJECT_DIR = process.cwd();

function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = exec(command, { ...options, cwd: PROJECT_DIR });
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Commande "${command}" échouée avec code ${code}`));
    });
  });
}

async function exists(pathToCheck) {
  try {
    await fs.promises.access(pathToCheck);
    return true;
  } catch {
    return false;
  }
}

async function moveContents(srcDir, destDir) {
  const items = await fs.promises.readdir(srcDir, { withFileTypes: true });
  for (const item of items) {
    const srcPath = path.join(srcDir, item.name);
    const destPath = path.join(destDir, item.name);
    await fs.promises.rename(srcPath, destPath);
  }
}

async function removeDir(dirPath) {
  // Supprime un dossier et tout son contenu
  await fs.promises.rm(dirPath, { recursive: true, force: true });
}

async function main() {
  try {
    const gitFolder = path.join(PROJECT_DIR, '.git');
    const nodeModulesFolder = path.join(PROJECT_DIR, 'node_modules');

    if (!(await exists(gitFolder))) {
      console.log('Clonage du dépôt Git dans un dossier temporaire...');
      // Extraire le nom du dossier depuis l'URL git (ex: 'ton-depot.git' -> 'ton-depot')
      const repoNameMatch = GIT_REPO.match(/\/([^\/]+)(\.git)?$/);
      if (!repoNameMatch) {
        throw new Error('Impossible de déterminer le nom du dossier du dépôt Git.');
      }
      const repoFolderName = repoNameMatch[1].replace(/\.git$/, '');

      // Cloner dans un dossier temporaire dans le répertoire courant
      await runCommand(`git clone ${GIT_REPO}`);

      const tempRepoPath = path.join(PROJECT_DIR, repoFolderName);

      console.log(`Déplacement des fichiers de ${repoFolderName} vers le répertoire courant...`);
      await moveContents(tempRepoPath, PROJECT_DIR);

      console.log(`Suppression du dossier temporaire ${repoFolderName}...`);
      await removeDir(tempRepoPath);

    } else {
      console.log('Dépôt Git déjà présent.');
    }

    if (!(await exists(nodeModulesFolder))) {
      console.log('Installation des packages npm...');
      await runCommand('npm install');
    } else {
      console.log('Packages npm déjà installés.');
    }

    console.log('Démarrage du bot...');
    await runCommand('npm start');

  } catch (error) {
    console.error('Erreur :', error.message);
    process.exit(1);
  }
}

main();
