#!/usr/bin/env node
/* Bundles the static app into a single self-contained HTML file: dist/index.html
 * (artifact-ready: no <html>/<head>/<body> wrapper; host adds it). Also writes dist/standalone.html
 * with a full document wrapper for ordinary static hosting. */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = ['src/data.js', 'src/rarity-index.js', 'src/engine.js', 'src/render.js', 'src/app.js'].map(read).join('\n;\n');
if (/<\/script/i.test(js)) { console.error('script contains </script>'); process.exit(1); }
const page = read('src/index.template.html').replace('/*__CSS__*/', () => read('src/style.css')).replace('/*__JS__*/', () => js);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), page);
const standalone = '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n' + page + '\n</body></html>\n';
fs.writeFileSync(path.join(root, 'dist/standalone.html'), standalone);
console.log('built dist/index.html', (Buffer.byteLength(page) / 1024).toFixed(1) + ' KB', '+ dist/standalone.html');
