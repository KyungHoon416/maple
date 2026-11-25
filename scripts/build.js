#!/usr/bin/env node
/* Bundles the static app into a single self-contained HTML file: dist/index.html
 * (artifact-ready: no <html>/<head>/<body> wrapper; host adds it). Also writes dist/standalone.html
 * with a full document wrapper for ordinary static hosting. */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const portraitDir = path.join(root, 'public/assets/characters');
const portraits = fs.existsSync(portraitDir) ? fs.readdirSync(portraitDir).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)).sort() : [];
const optionDir = path.join(root, 'public/assets/options');
const optionArt = fs.existsSync(optionDir) ? fs.readdirSync(optionDir).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)).sort() : [];
const manifestJs = 'window.MFS_PORTRAITS=' + JSON.stringify(portraits) + ';window.MFS_OPTION_IMAGES=' + JSON.stringify(optionArt) + ';';
const js = [manifestJs].concat(['src/data.js', 'src/rarity-index.js', 'src/engine.js', 'src/plan.js', 'src/group.js', 'src/render.js', 'src/app.js'].map(read)).join('\n;\n');
if (/<\/script/i.test(js)) { console.error('script contains </script>'); process.exit(1); }
const page = read('src/index.template.html').replace('/*__CSS__*/', () => read('src/style.css')).replace('/*__JS__*/', () => js);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), page);
const standalone = '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n' + page + '\n</body></html>\n';
fs.writeFileSync(path.join(root, 'dist/standalone.html'), standalone);
fs.rmSync(path.join(root, 'dist/assets'), { recursive: true, force: true });
fs.mkdirSync(path.join(root, 'dist/assets/characters'), { recursive: true });
portraits.forEach(id => fs.copyFileSync(path.join(portraitDir, id + '.webp'), path.join(root, 'dist/assets/characters', id + '.webp')));
fs.mkdirSync(path.join(root, 'dist/assets/options'), { recursive: true });
optionArt.forEach(id => fs.copyFileSync(path.join(optionDir, id + '.webp'), path.join(root, 'dist/assets/options', id + '.webp')));
console.log('portraits:', portraits.length, '· option illustrations:', optionArt.length);
console.log('built dist/index.html', (Buffer.byteLength(page) / 1024).toFixed(1) + ' KB', '+ dist/standalone.html');
