// Inspect the existing private Hermes connection. Gateway login, when requested,
// uses the existing host's credentials in memory only; never logs or saves them.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(path.resolve(__dirname, '../../../desktop/node_modules/playwright'));

async function main() {
  const evidence = path.join(os.tmpdir(), 'qt-hermes-setup');
  const state = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), 'hermes-desktop-setup', 'desktop-process.json'), 'utf8'));
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${state.port}`);
  try {
    const page = browser.contexts()[0].pages().find(p => p.url().startsWith('file:'));
    if (!page) throw new Error('Hermes window is missing');
    page.setDefaultTimeout(20000);
    const action = process.argv[2] || 'manager';
    if (action === 'input-state') {
      console.log(JSON.stringify(await page.locator('input[type=password]').evaluateAll(nodes => ({passwordFields:nodes.length,nonEmptyPasswordFields:nodes.filter(n => n.value.length > 0).length}))));
      return;
    }
    if (action === 'connection-status') {
      console.log(JSON.stringify(await page.evaluate(async () => {
        const r = await window.hermesDesktop.connections.list();
        return { connections: r.connections.map(c => ({id:c.id,label:c.label,url:c.url})), primary:r.primaryConnectionId, default:await window.hermesDesktop.profile.getDefault() };
      })));
    }
    if (action === 'finish-current-login') {
      const forms = browser.contexts().flatMap(c => c.pages()).filter(p => {
        const url = new URL(p.url());
        return url.protocol === 'https:' && url.hostname === 'hermes-vps.tail4ad5c7.ts.net' && url.port === '8443' && url.pathname === '/login';
      });
      if (!forms.length) throw new Error('No matching private VPS login window');
      const code = "import json,subprocess\ns=json.loads(subprocess.check_output(['tailscale','status','--json']))\nc=json.loads(subprocess.check_output(['docker','inspect','hermes-agent-yril-hermes-agent-1']))[0]\ne=dict(x.split('=',1) for x in c['Config']['Env'])\nprint(json.dumps({'dns':s['Self']['DNSName'].rstrip('.'),'username':e['ADMIN_USERNAME'],'password':e['ADMIN_PASSWORD']}))\n";
      const secret = JSON.parse(execFileSync('ssh', ['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','root@100.64.190.112','python3 -'], { input: code, encoding:'utf8', windowsHide:true, stdio:['pipe','pipe','pipe'], timeout:30000 }));
      if (secret.dns !== 'hermes-vps.tail4ad5c7.ts.net') throw new Error('Gateway host identity mismatch');
      for (const form of forms) {
        await form.locator('input[name=username]').fill(secret.username);
        await form.locator('input[name=password]').fill(secret.password);
        await form.getByRole('button', {name:'Sign in',exact:true}).click();
      }
      secret.username = ''; secret.password = '';
      console.log('Existing private HTTPS gateway login completed; connection settings preserved.');
    }
    if (action === 'manager') {
      await page.getByRole('tab', { name: /^bots$/i }).click();
      await page.getByRole('button', { name: /^QT Manager · @qt-manager/ }).click();
    }
    if (action === 'status') {
      const marker = path.join(evidence, 'status-query-sent.json');
      if (fs.existsSync(marker)) throw new Error('Status trial already sent; use inspect');
      const message = 'Setup acceptance check: use qt_team_status once to read the current saved team report and schedule. Reply briefly with the actual latest result, next scheduled run, and whether the app was updated. Do not research sources, start jobs, generate images or change data.';
      await page.getByRole('textbox', { name: 'Message', exact: true }).fill(message);
      fs.writeFileSync(marker, JSON.stringify({ sentAt: new Date().toISOString() }));
      await page.getByRole('textbox', { name: 'Message', exact: true }).press('Enter');
    }
    if (action === 'schedule') {
      await page.getByRole('tab', { name: /scheduled jobs/i }).click();
    }
    if (action === 'tools') {
      await page.getByText(/^Used \d+ tools$/).last().click();
    }
    if (action === 'group') {
      await page.getByRole('tab', { name: /^bots$/i }).click();
      const group = page.getByRole('button', { name: /^QuinTaste Team, 4 bots/ });
      if (await group.count()) {
        await group.click();
      } else {
        await page.getByRole('button', { name: 'New bot or group chat', exact: true }).click();
        await page.getByRole('menuitem', { name: 'New group chat', exact: true }).click();
        const dialog = page.getByRole('dialog');
        for (const name of ['qt-manager', 'qt-explorer', 'qt-cooker', 'qt-event']) {
          await dialog.locator('label').filter({ hasText: `@${name}` }).getByRole('checkbox').check();
        }
        await dialog.getByRole('textbox', { name: 'Group name', exact: true }).fill('QuinTaste Team');
        await dialog.getByRole('button', { name: 'Create Group (4)', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
      }
    }
    await page.screenshot({ path: path.join(evidence, `desktop-${action}.png`) });
    const text = (await page.locator('body').innerText()).slice(-16000);
    fs.writeFileSync(path.join(evidence, `desktop-${action}.txt`), text);
    console.log(text);
  } finally {
    await browser.close();
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
