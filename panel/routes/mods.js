/**
 * routes/mods.js - Management endpoints for Fabric / Forge mods upload, toggle enablement and removals.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const MODS_DIR = path.join(ROOT_DIR, 'mods');

module.exports = function(processManager) {
  
  // List all mods
  router.get('/list', (req, res) => {
    try {
      if (!fs.existsSync(MODS_DIR)) {
        fs.mkdirSync(MODS_DIR, { recursive: true });
      }
      
      const files = fs.readdirSync(MODS_DIR);
      const mods = files.map(file => {
        const filePath = path.join(MODS_DIR, file);
        const stats = fs.statSync(filePath);
        const isJar = file.endsWith('.jar');
        const isDisabled = file.endsWith('.disabled');
        
        return {
          name: file,
          size: stats.size,
          enabled: isJar && !isDisabled,
          type: isJar || isDisabled ? 'mod' : 'unknown'
        };
      }).filter(m => m.type === 'mod');

      res.json(mods);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Enable a mod
  router.post('/enable', (req, res) => {
    const { name } = req.body;
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ error: 'Invalid name parameter' });
    }

    const currentPath = path.join(MODS_DIR, name);
    if (!fs.existsSync(currentPath)) {
      return res.status(404).json({ error: 'Mod file not found' });
    }

    if (name.endsWith('.disabled')) {
      const newName = name.replace('.disabled', '');
      fs.renameSync(currentPath, path.join(MODS_DIR, newName));
      processManager.log(`Mod '${newName}' has been enabled. Server restart is required.`);
    }

    res.json({ status: 'success' });
  });

  // Disable a mod
  router.post('/disable', (req, res) => {
    const { name } = req.body;
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ error: 'Invalid name parameter' });
    }

    const currentPath = path.join(MODS_DIR, name);
    if (!fs.existsSync(currentPath)) {
      return res.status(404).json({ error: 'Mod file not found' });
    }

    if (name.endsWith('.jar')) {
      const newName = name + '.disabled';
      fs.renameSync(currentPath, path.join(MODS_DIR, newName));
      processManager.log(`Mod '${name}' has been disabled. Server restart is required.`);
    }

    res.json({ status: 'success' });
  });

  // Delete a mod
  router.post('/delete', (req, res) => {
    const { name } = req.body;
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ error: 'Invalid name parameter' });
    }

    const currentPath = path.join(MODS_DIR, name);
    if (!fs.existsSync(currentPath)) {
      return res.status(404).json({ error: 'Mod file not found' });
    }

    fs.unlinkSync(currentPath);
    processManager.log(`Mod '${name}' deleted successfully. Server restart is required.`);
    res.json({ status: 'success' });
  });

  // Safe manual mod upload (accepts only .jar files)
  router.post('/upload', (req, res) => {
    const fileName = req.headers['x-file-name'];
    if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ error: 'Invalid upload filename provided.' });
    }

    if (!fileName.endsWith('.jar')) {
      return res.status(400).json({ error: 'Forbidden: Only JAR files can be uploaded to mods.' });
    }

    const dest = path.join(MODS_DIR, fileName);
    const fileStream = fs.createWriteStream(dest);

    req.pipe(fileStream);

    fileStream.on('finish', () => {
      try {
        const stats = fs.statSync(dest);
        if (stats.size === 0) {
          fs.unlinkSync(dest);
          return res.status(400).json({ error: 'Uploaded file is empty.' });
        }
        processManager.log(`Mod jar '${fileName}' uploaded successfully. Server restart is required.`);
        res.json({ status: 'success' });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    fileStream.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
  });

  return router;
};
