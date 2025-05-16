/***************************************************************************
 *   Extension:   Net Commander                                            *
 *   Author:      elelabdev                                                *
 *   Description: Net Commander is the extension for Visual Studio Code    *
 *                dedicated to Network Engineers, DevOps Engineers and     *
 *                Solution Architects streamlining everyday workflows and  * 
 *                accelerating data-driven root-cause analysis.            *
 *                                                                         *
 *   Github:      https://github.com/elelabdev/net-commander               *
 *                                                                         *
 *   Icon Author: elelab                                                   *
 *                                                                         *
 *   Copyright (C) 2025 elelab                                             *
 *   https://www.elelab.dev                                                *
 *                                                                         *
 *   Licensed under the MIT License. See LICENSE file in the project       *
 *   root for details.                                                     *
 **************************************************************************/

// src/extension.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode                    from 'vscode';
import * as fs                        from 'fs/promises';
import * as path                      from 'path';
import puppeteer                      from 'puppeteer';
import markdownIt                     from 'markdown-it';

import { IpCodeLensProvider }         from './decorators/ipCodeLens';
import { openIpInfoPanel }            from './modules/ipinfo';

import { openRfcPanel }               from './helpers/rfcs';
import { openCidrCalculator }         from './modules/cidrCalculator';
import { openIanaPortCalculator }     from './modules/ianaPortCalc';
import { openPeeringDB }              from './modules/peeringDB';
import { openRootcauseAnalysis }      from './modules/rootcauseAnalysis';
import { registerWiFiAnalyzer }       from './modules/wifiAnalyzer';
import { TraceroutePanel }            from './modules/traceroute';
import { PingPanel }                  from './modules/pingPanel';
import {
  activateNetworkColorizer,
  deactivateNetworkColorizer
} from './decorators/networkColorizer';


import { activate as activateTerminalEnhancer, deactivate as deactivateTerminalEnhancer } from './modules/terminalEnhancer';
 
import { getHosts, HostEntry }        from './helpers/sshHosts';

const enum Command {
  SSH_CONNECT     = 'sshConnect.connect',
  SSH_TERMINAL    = 'sshConnect.profile',
  PING_HOST       = 'net-commander.pingHost',
  PING_PANEL      = 'net-commander.ping',
  TRACEROUTE      = 'net-commander.traceroute',
  IPERF           = 'net-commander.runIperf',
  CIDR_CALC       = 'net-commander.cidrcalc',
  IP_INFO         = 'net-commander.checkIpInfo',
  MY_IP_INFO      = 'net-commander.checkMyIpInfo',
  SHOW_RFC        = 'net-commander.showRFC',
  IANA_PORT_CALC  = 'net-commander.ianaportcalc',
  PEERING_DB      = 'net-commander.peeringdb',
  EMERGENCY_CHECK = 'net-commander.rootcauseAnalysis',
  OPEN_WELCOME    = 'netCommander.openWelcome'
}

// =========================================================================
// EXPORT functions
// =========================================================================
export function activate(context: vscode.ExtensionContext): void { 
  activateTerminalEnhancer(context);
  registerWiFiAnalyzer(context);
  const cmds: Array<[Command, (...args: any[]) => unknown]> = [
    [Command.SSH_CONNECT,   sshConnectCommand],
    [Command.PING_PANEL,    () => PingPanel.createOrShow(context.extensionUri)],
    [Command.TRACEROUTE,    () => TraceroutePanel.createOrShow(context.extensionUri)],
    [Command.CIDR_CALC,     () => openCidrCalculator(context) ],
    [Command.IP_INFO, (ip?: string) => ipInfoCommand(context, ip)],
    [Command.MY_IP_INFO,    () => myIpInfoCommand(context)],
    [Command.SHOW_RFC, ip => openRfcPanel(context, ip)],

    [Command.IANA_PORT_CALC, () => openIanaPortCalculator(context)],
    [Command.PEERING_DB,      () => openPeeringDB(context)],
    [Command.EMERGENCY_CHECK,() => openRootcauseAnalysis(context)]
  ];
  for (const [id, fn] of cmds) {
    context.subscriptions.push(vscode.commands.registerCommand(id, fn));
  }

  activateNetworkColorizer(context);
  context.subscriptions.push(
    vscode.window.registerTerminalProfileProvider(Command.SSH_TERMINAL, {
      provideTerminalProfile: async () => {
        await vscode.commands.executeCommand(Command.SSH_CONNECT);
        return null;
      }
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: 'file', language: 'plaintext' },
      new IpCodeLensProvider()
    )
  );
}

export function deactivate(): void {
  deactivateNetworkColorizer();
  deactivateTerminalEnhancer?.();
}


// BEGIN function to generate PDF Report for rootcauseAnalysis.ts (work in progress)
export async function generatePdfReport(rcaRoot: vscode.Uri): Promise<void> {
  try { 
    const mdPath = vscode.Uri.joinPath(rcaRoot, 'analysis', 'RCA_Report.md');
    const md     = await fs.readFile(mdPath.fsPath, 'utf8');
 
    const htmlBody = markdownIt({ html: true, linkify: true, typographer: true }).render(md);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;margin:40px;max-width:960px;}
        h1,h2,h3{color:#094771;}table{border-collapse:collapse;width:100%;}
        th,td{border:1px solid #d0d7de;padding:6px 8px;}code,pre{font-family:SFMono-Regular,Consolas,monospace;}
    </style></head><body>${htmlBody}</body></html>`;
 
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfPath = path.join(rcaRoot.fsPath, 'analysis', 'RCA_Report.pdf');
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });

      vscode.window.showInformationMessage(`PDF generated → ${pdfPath}`);
      await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(pdfPath));
    } finally {
      await browser.close();
    }
  } catch (err) {
    vscode.window.showErrorMessage('PDF generation failed: ' + String(err));
  }
}
// END function to generate PDF Report for rootcauseAnalysis.ts


// =========================================================================
// COMMANDS implementations
// =========================================================================

// BEGIN SSH Utility Functions
async function sshConnectCommand(): Promise<void> {
  const hosts = await getHosts();
  if (!hosts.length) {
    vscode.window.showWarningMessage('No hosts found in ~/.ssh/config please update or create the file.');
    return;
  }
  const picked = await vscode.window.showQuickPick(
    hosts.map(h => ({
      label: h.host,
      description: `${h.user ?? ''}@${h.hostname ?? h.host}`.trim(),
      detail: h.port ? `port ${h.port}` : undefined,
      host: h as HostEntry
    })), { placeHolder: 'Select host from ~/.ssh/config' }
  );
  if (!picked) return;
  const term = vscode.window.createTerminal({
    name: picked.label,
    iconPath: new vscode.ThemeIcon('remote'),
    color: classifyHostColour(picked.host)
  });
  term.show();
  term.sendText(`ssh ${picked.label}`);
}

function classifyHostColour(h: HostEntry): vscode.ThemeColor {
  if (/(prod|live)/i.test(h.host)) return new vscode.ThemeColor('terminal.ansiRed');
  if (/(qa|test)/i.test(h.host))   return new vscode.ThemeColor('terminal.ansiYellow');
  return new vscode.ThemeColor('terminal.ansiGreen');
}
// END SSH Utility Functions


// BEGIN IPINFO.io Utility Functions
async function ipInfoCommand(context: vscode.ExtensionContext, rawIp?: string): Promise<void> {

  const cfg    = vscode.workspace.getConfiguration('netCommander');
  const apiKey = cfg.get<string>('ipinfoApiKey', '');
  if (!apiKey) {
    vscode.window.showErrorMessage('Please in Net-Commander extension settings configure an ipinfo.io API Token key first.');
    return;
  }
  const query = rawIp ?? await vscode.window.showInputBox({ placeHolder: 'Enter an IP address' });
  if (!query) return;
  try {
    const res  = await fetch(`https://ipinfo.io/${query}?token=${apiKey}`);
    if (!res.ok) throw new Error(String(res.status));
    const data: any = await res.json();
    openIpInfoPanel(context, data, query);
  } catch (err: any) {
    vscode.window.showErrorMessage(`ipinfo.io request failed: ${err.message||err}`);
  }
}

async function myIpInfoCommand(
  context: vscode.ExtensionContext
): Promise<void> {
  const cfg    = vscode.workspace.getConfiguration('netCommander');
  const apiKey = cfg.get<string>('ipinfoApiKey', '');
  if (!apiKey) {
    vscode.window.showErrorMessage(
      'Please in Net-Commander extension settings configure an ipinfo.io API Token key first.'
    );
    return;
  }

  try {
    // NOTE the /json suffix
    const res = await fetch(`https://ipinfo.io/json?token=${apiKey}`);
    if (!res.ok) throw new Error(String(res.status));

    const data: any = await res.json();
    openIpInfoPanel(context, data, data.ip ?? 'My IP');
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `ipinfo.io request failed: ${err.message || err}`
    );
  }
}
// END IPINFO.io Utility Functions


// BEGIN Editor IP RFC Tooltip Utility Functions
function showRfcPanel(context: vscode.ExtensionContext, ip: string): void {
  openRfcPanel(context, ip);
}
// END Editor IP RFC Tooltip Utility Functions