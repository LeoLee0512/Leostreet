import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const app = join(root, 'desktop/dist/app');
mkdirSync(app, {recursive:true});
cpSync(join(root,'desktop/dist/web/assets'), join(app,'web/assets'), {recursive:true});
copyFileSync(join(root,'desktop/dist/web/desktop/index.html'),join(app,'web/index.html'));
// The desktop app needs only the tab icon; the web build's hosting-platform files are not shipped.
cpSync(join(root,'public','favicon.svg'), join(app,'web','favicon.svg'));
const sdk = join(root,'desktop/vendor/webview2');
for (const name of ['Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll']) copyFileSync(join(sdk,'lib/net462',name),join(app,name));
copyFileSync(join(sdk,'runtimes/win-x64/native/WebView2Loader.dll'),join(app,'WebView2Loader.dll'));
copyFileSync(join(root,'desktop/LeoStreetLegend.exe.config'),join(app,'LeoStreetLegend.exe.config'));
const graph = JSON.parse(readFileSync(join(root,'desktop/dependency-graph.json'),'utf8'));
const packages = new Set();
for (const module of graph) {
  const match = module.id.match(/^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)/);
  if (match) packages.add(match[1]);
}
let notices = '狮子街传说 · 桌面试玩版\nTHIRD-PARTY NOTICES\n\n';
for (const path of [...packages].sort()) {
  const file = join(path,'package.json');
  if (!existsSync(file)) continue;
  const pkg = JSON.parse(readFileSync(file,'utf8'));
  const licenses = readdirSync(path).filter(name=>/^(licen[sc]e|notice|copyright)(\.|$)/i.test(name));
  notices += `\n===== ${pkg.name} ${pkg.version} (${pkg.license ?? 'see license below'}) =====\n`;
  for (const license of licenses) notices += readFileSync(join(path,license),'utf8')+'\n';
}
for (const file of ['LICENSE.txt','NOTICE.txt']) notices += '\n===== Microsoft WebView2 SDK '+file+' =====\n'+readFileSync(join(sdk,file),'utf8');
notices += '\n===== Inno Setup =====\n'+readFileSync(join(root,'desktop/tools/inno/License.txt'),'utf8');
writeFileSync(join(app,'THIRD-PARTY-NOTICES.txt'),notices);
copyFileSync(join(root,'desktop/试玩说明.txt'), join(app,'试玩说明.txt'));
console.log(`Prepared ${app}; ${packages.size} dependency notices.`);
