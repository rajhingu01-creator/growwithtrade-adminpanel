const fs = require('fs');
const path = require('path');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);

  files.forEach((file) => {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);

    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  });
}

const adminDist = path.join(__dirname, 'adminpanel', 'dist');
const targetAdminDist = path.join(__dirname, 'dist', 'adminpanel');

if (fs.existsSync(adminDist)) {
  console.log(`Copying admin panel build from ${adminDist} to ${targetAdminDist}...`);
  copyFolderRecursiveSync(adminDist, targetAdminDist);
  console.log('Admin panel build copied successfully!');
} else {
  console.error('Error: adminpanel/dist not found. Make sure to build the admin panel first.');
  process.exit(1);
}
