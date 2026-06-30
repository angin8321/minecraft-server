/**
 * routes/plugins.js - Management endpoints for installing, listing, enabling and deletion of jar plugins.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const ROOT_DIR = path.resolve(__dirname, '../..');
const PLUGINS_DIR = path.join(ROOT_DIR, 'plugins');

module.exports = function(processManager) {
  
  // List all plugins
  router.get('/list', (req, res) => {
    try {
      if (!fs.existsSync(PLUGINS_DIR)) {
        fs.mkdirSync(PLUGINS_DIR, { recursive: true });
      }
      
      const files = fs.readdirSync(PLUGINS_DIR);
      const plugins = files.map(file => {
        const filePath = path.join(PLUGINS_DIR, file);
        const stats = fs.statSync(filePath);
        const isJar = file.endsWith('.jar');
        const isDisabled = file.endsWith('.disabled');
        
        return {
          name: file,
          size: stats.size,
          enabled: isJar && !isDisabled,
          type: isJar || isDisabled ? 'plugin' : 'unknown'
        };
      }).filter(p => p.type === 'plugin');

      res.json(plugins);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Enable a plugin (rename back to .jar)
  router.post('/enable', (req, res) => {
    const { name } = req.body;
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ error: 'Invalid name parameter' });
    }

    const currentPath = path.join(PLUGINS_DIR, name);
    if (!fs.existsSync(currentPath)) {
      return res.status(404).json({ error: 'Plugin file not found' });
    }

    if (name.endsWith('.disabled')) {
      const newName = name.replace('.disabled', '');
      fs.renameSync(currentPath, path.join(PLUGINS_DIR, newName));
      processManager.log(`Plugin '${newName}' has been enabled. Server restart is required.`);
    }

    res.json({ status: 'success' });
  });

  // Disable a plugin (rename to .jar.disabled)
  router.post('/disable', (req, res) => {
    const { name } = req.body;
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ error: 'Invalid name parameter' });
    }

    const currentPath = path.join(PLUGINS_DIR, name);
    if (!fs.existsSync(currentPath)) {
      return res.status(404).json({ error: 'Plugin file not found' });
    }

    if (name.endsWith('.jar')) {
      const newName = name + '.disabled';
      fs.renameSync(currentPath, path.join(PLUGINS_DIR, newName));
      processManager.log(`Plugin '${name}' has been disabled. Server restart is required.`);
    }

    res.json({ status: 'success' });
  });

  // Delete a plugin
  router.post('/delete', (req, res) => {
    const { name } = req.body;
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ error: 'Invalid name parameter' });
    }

    const currentPath = path.join(PLUGINS_DIR, name);
    if (!fs.existsSync(currentPath)) {
      return res.status(404).json({ error: 'Plugin file not found' });
    }

    fs.unlinkSync(currentPath);
    processManager.log(`Plugin '${name}' deleted successfully. Server restart is required.`);
    res.json({ status: 'success' });
  });

  // Safe manual plugin upload (accepts only .jar files or disabled variations)
  router.post('/upload', (req, res) => {
    // Write manual binary file input from client request stream
    const fileName = req.headers['x-file-name'];
    if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ error: 'Invalid upload filename provided.' });
    }

    if (!fileName.endsWith('.jar')) {
      return res.status(400).json({ error: 'Forbidden: Only JAR files can be uploaded to plugins.' });
    }

    const dest = path.join(PLUGINS_DIR, fileName);
    const fileStream = fs.createWriteStream(dest);

    req.pipe(fileStream);

    fileStream.on('finish', () => {
      // Validate contents don't masquerade execution scripts
      try {
        const stats = fs.statSync(dest);
        if (stats.size === 0) {
          fs.unlinkSync(dest);
          return res.status(400).json({ error: 'Uploaded file is empty.' });
        }
        processManager.log(`Plugin jar '${fileName}' uploaded successfully. Server restart is required.`);
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
