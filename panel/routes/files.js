/**
 * routes/files.js - File browser API endpoint for server workspace configs, logs, server.properties.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');

// Allowed text file names or extensions for editor view
const PERMITTED_EXTENSIONS = ['.properties', '.yml', '.json', '.txt', '.log', '.conf'];

/**
 * Validates target paths, ensuring no directory traversals.
 */
function getSafeAbsolutePath(relativePath = '') {
  const safePath = path.resolve(SERVER_DIR, relativePath);
  if (!safePath.startsWith(SERVER_DIR)) {
    throw new Error('Access denied: Out of server sandbox directory.');
  }
  return safePath;
}

// List all files in directory
router.get('/list', (req, res) => {
  try {
    const queryPath = req.query.path ? String(req.query.path) : '';
    const targetDir = getSafeAbsolutePath(queryPath);

    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ error: 'Directory does not exist.' });
    }

    const items = fs.readdirSync(targetDir, { withFileTypes: true });
    
    const formattedData = items.map(item => {
      const stats = fs.statSync(path.join(targetDir, item.name));
      return {
        name: item.name,
        isDirectory: item.isDirectory(),
        size: stats.size,
        modified: stats.mtime
      };
    });

    res.json({
      currentPath: queryPath,
      files: formattedData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View file contents
router.get('/view', (req, res) => {
  try {
    const rawPath = req.query.path ? String(req.query.path) : '';
    if (!rawPath) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }
    const realFilePath = getSafeAbsolutePath(rawPath);

    if (!fs.existsSync(realFilePath) || fs.statSync(realFilePath).isDirectory()) {
      return res.status(404).json({ error: 'File not found or is a directory.' });
    }

    // Security check on extension type
    const ext = path.extname(realFilePath).toLowerCase();
    if (!PERMITTED_EXTENSIONS.includes(ext) && !PERMITTED_EXTENSIONS.includes(path.basename(realFilePath))) {
      return res.status(403).json({ error: 'Access to this file type is restricted.' });
    }

    const contents = fs.readFileSync(realFilePath, 'utf-8');
    res.json({ path: rawPath, contents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Write / Save updated file contents
router.post('/save', (req, res) => {
  try {
    const { filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    const realFilePath = getSafeAbsolutePath(filePath);

    if (fs.existsSync(realFilePath) && fs.statSync(realFilePath).isDirectory()) {
      return res.status(400).json({ error: 'Selected destination is a directory.' });
    }

    // Security validation extension
    const ext = path.extname(realFilePath).toLowerCase();
    if (!PERMITTED_EXTENSIONS.includes(ext) && !PERMITTED_EXTENSIONS.includes(path.basename(realFilePath))) {
      return res.status(403).json({ error: 'Saving this file type is restricted.' });
    }

    fs.writeFileSync(realFilePath, content, 'utf-8');
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
