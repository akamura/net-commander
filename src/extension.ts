/***************************************************************************
 *   Extension:   Net Commander                                            *
 *   Version:     0.0.2                                                    *
 *   Author:      Matia Zanella                                            *
 *   Description: The Swiss‑Army knife for Network Engineers, DevOps       * 
 *                professionals and Architects right inside VS Code.       *
 *   Github:      https://github.com/akamura/net-commander/                *
 *                                                                         *
 *   Icon Author: Matia Zanella                                            *
 *                                                                         *
 *   Copyright (C) 2025 Matia Zanella                                      *
 *   https://www.matiazanella.com                                          *
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program; if not, write to the                         *
 *   Free Software Foundation, Inc.,                                       *
 *   59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.             *
 **************************************************************************/

// src/extension.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import { dirname, join } from 'node:path';

import { openCidrCalculator }        from './cidr/cidrCalculator';
import { IpCodeLensProvider }        from './utils/ipCodeLens';
import { getIpInfoHtml }             from './helpers/ipinfo';
import { getRfcHtml }                from './helpers/rfcs';
import { openIanaPortCalculator }    from './iana/ianaPortCalc';
import { openPeeringDB }             from './peeringdb/peeringDB';
import { openTopologyViewer }        from './utils/topologyGenerator';
import { TraceroutePanel }           from './tools/traceroute';
import { PingPanel }                 from './tools/pingPanel';
import { activate as activateTerminalEnhancer, deactivate as deactivateTerminalEnhancer } from './terminal/terminalEnhancer';
import {
  activateNetworkColorizer,
  deactivateNetworkColorizer
} from './utils/networkColorizer';
import { getHosts, HostEntry }       from './sshHosts';

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
  TOPOLOGY_VIEWER = 'net-commander.topologyviewer',
  OPEN_WELCOME    = 'netCommander.openWelcome'
}


// =========================================================================
// EXPORT functions
// =========================================================================
export function activate(context: vscode.ExtensionContext): void {
  activateNetworkColorizer(context);
  activateTerminalEnhancer(context);
  const cmds: Array<[Command, (...args: any[]) => unknown]> = [
    [Command.SSH_CONNECT,   sshConnectCommand],
    [Command.PING_PANEL,    () => PingPanel.createOrShow(context.extensionUri)],
    [Command.TRACEROUTE,    () => TraceroutePanel.createOrShow(context.extensionUri)],
    [Command.CIDR_CALC,     openCidrCalculator],
    [Command.IP_INFO,       ipInfoCommand],
    [Command.MY_IP_INFO,    myIpInfoCommand],
    [Command.SHOW_RFC,      showRfcPanel],
    [Command.IANA_PORT_CALC,openIanaPortCalculator],
    [Command.PEERING_DB,    openPeeringDB],
    [Command.TOPOLOGY_VIEWER,() => openTopologyViewer(context)]
  ];
  for (const [id, fn] of cmds) {
    context.subscriptions.push(vscode.commands.registerCommand(id, fn));
  }

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
async function ipInfoCommand(rawIp?: string): Promise<void> {
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
    const panel = vscode.window.createWebviewPanel(
      'ipInfo', `IP Info ▸ ${query}`, vscode.ViewColumn.Beside, {}
    );
    panel.webview.html = getIpInfoHtml(data, query);
  } catch (err: any) {
    vscode.window.showErrorMessage(`ipinfo.io request failed: ${err.message||err}`);
  }
}

async function myIpInfoCommand(): Promise<void> {
  const cfg    = vscode.workspace.getConfiguration('netCommander');
  const apiKey = cfg.get<string>('ipinfoApiKey', '');
  if (!apiKey) {
    vscode.window.showErrorMessage('Please in Net-Commander extension settings configure an ipinfo.io API Token key first.');
    return;
  }
  try {
    const res: Response = await fetch(`https://ipinfo.io?token=${apiKey}`);
    if (!res.ok) throw new Error(String(res.status));
    const data: any = await res.json();
    const panel = vscode.window.createWebviewPanel(
      'ipInfo', 'IP Info ▸ My Public IP', vscode.ViewColumn.Beside, {}
    );
    panel.webview.html = getIpInfoHtml(data, data.ip ?? 'My IP');
  } catch (err: any) {
    vscode.window.showErrorMessage(`ipinfo.io request failed: ${err.message||err}`);
  }
}
// END IPINFO.io Utility Functions


// BEGIN Editor IP RFC Tooltip Utility Functions
function showRfcPanel(rfc: string): void {
  const panel = vscode.window.createWebviewPanel(
    'rfcInfo', `RFC Summary ▸ ${rfc}`, vscode.ViewColumn.Beside, {}
  );
  panel.webview.html = getRfcHtml(rfc);
}
// END Editor IP RFC Tooltip Utility Functions