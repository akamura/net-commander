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

// src/modules/traceroute.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { getNonce } from '../helpers/nonce';


// =========================================================================
// EXPORT functions
// =========================================================================
export interface TracerouteHop {
  hop: number;
  hostname?: string;
  ip: string;
  rtt?: string;
}

export interface TracerouteNode {
  id: string;
  label: string;
  ip?: string;
  hostname?: string;
  x?: number;
  y?: number;
}

export interface Topology {
  nodes: TracerouteNode[];
  links: { source: string; target: string }[];
}

export class TraceroutePanel {
  public static currentPanel: TraceroutePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private activeProcess: ChildProcess | undefined;
  private topology: Topology = { nodes: [], links: [] };

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    panel.webview.onDidReceiveMessage(
      message => this.onMessage(message),
      null,
      this._disposables
    );

    panel.onDidDispose(() => this.dispose(), null, this._disposables);
    panel.webview.html = this.showWebviewContent();
  }



// BEGIN function to generate user webview content
  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.ViewColumn.Beside;
    if (TraceroutePanel.currentPanel) {
      TraceroutePanel.currentPanel._panel.reveal(column);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'traceroutePanel',
        'NetCommander Traceroute',
        { viewColumn: column, preserveFocus: false },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'media', 'libs'),
            vscode.Uri.joinPath(extensionUri, 'media', 'module-traceroute'),
            vscode.Uri.joinPath(extensionUri, 'media', 'common', 'css')
          ]
        }
      );
      TraceroutePanel.currentPanel = new TraceroutePanel(panel, extensionUri);
    }
  }

  public dispose() {
    TraceroutePanel.currentPanel = undefined;
    this._panel.dispose();
    this._disposables.forEach(d => d.dispose());
  }

  private onMessage(message: any) {
    switch (message.command) {
      case 'traceroute':
        this.resetTopology();
        this.startTraceroute(message.data.target);
        break;
      case 'stop':
        this.stopTraceroute();
        this._panel.webview.postMessage({ command: 'toggleStop', data: { show: false } });
        break;
      case 'clear':
        this.resetTopology();
        this._panel.webview.postMessage({ command: 'clearResults' });
        break;
      case 'exportCSV':
        this.exportCSV(this.generateCSV());
        break;
    }
  }

  private showWebviewContent(): string {
    const webview    = this._panel.webview;
    const nonce      = getNonce();
    const csp        = webview.cspSource;
  
    const commonCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'common', 'css', 'style.css')
    );
    const elementsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'libs', 'vscode-elements', 'bundled.js')
    );
    const d3Uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'libs', 'd3', 'd3.v7.min.js')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'module-traceroute', 'main.js')
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'module-traceroute', 'style.css')
    );
  
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="
          default-src 'none';
          script-src 'nonce-${nonce}' ${csp};
          style-src  'unsafe-inline' ${csp};
          img-src    ${csp} data:;
          font-src   ${csp} data:;
        ">
  <link rel="stylesheet" nonce="${nonce}" href="${commonCssUri}">
  <link rel="stylesheet" href="${styleUri}" type="text/css"/> 
  <script nonce="${nonce}" src="${d3Uri}"></script>
  <script type="module" nonce="${nonce}" src="${elementsUri}"></script>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</head>
<body>
  <div class="layout">
    <div class="top-bar">
      <h1>Traceroute</h1>
    </div>
    <div class="header flex-row section-padding">
      <vscode-form-container responsive="true">
        <vscode-label for="target">Target</vscode-label>
        <vscode-textfield id="target" placeholder="1.1.1.1"></vscode-textfield>
        <vscode-form-group>
          <vscode-button id="generateBtn">Generate</vscode-button>
          <vscode-button id="exportCSVBtn">Export CSV</vscode-button>
          <vscode-button id="resetViewBtn" secondary>Reset View</vscode-button>
          <vscode-button id="clearBtn" secondary>Clear</vscode-button>
        </vscode-form-group>
      </vscode-form-container>
    </div>
    <div class="middle section-padding scrollable-y">
      <svg></svg>
    </div>
  </div>
</body>
</html>`;
  }
// END function to generate user webview content

  private resetTopology() {
    this.topology = { nodes: [], links: [] };
    const local = getLocalNetworkInfo();
    this.topology.nodes.push({
      id: 'source',
      label: `My host: ${local.localIP} (${local.macAddress})`,
      ip: local.localIP,
      hostname: os.hostname()
    });
    this._panel.webview.postMessage({ command: 'updateTopology', topology: this.topology });
  }

  private startTraceroute(target: string) {
    const cmd  = os.platform().startsWith('win') ? 'tracert' : 'traceroute';
    const args = [target];
    this.activeProcess = spawn(cmd, args);
    let buf = '';
  
    this.activeProcess.stdout?.setEncoding('utf8');
    this.activeProcess.stdout?.on('data', (chunk: string) => {
      buf += chunk;
  
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? '';
  
      for (const line of lines) {
        const hop = this.parseTracerouteLine(line);
        if (!hop) continue;
  
        const nodeId = `hop${hop.hop}`;
        if (this.topology.nodes.find(n => n.id === nodeId)) continue;
  
        const label = hop.hostname && hop.hostname !== hop.ip
          ? `${hop.hostname} (${hop.ip})${hop.rtt ? ' – ' + hop.rtt : ''}`
          : `${hop.ip}${hop.rtt ? ' – ' + hop.rtt : ''}`;
  
        this.topology.nodes.push({
          id: nodeId,
          label,
          ip: hop.ip,
          hostname: hop.hostname
        });
  
        const prev = hop.hop === 1 ? 'source' : `hop${hop.hop - 1}`;
        this.topology.links.push({ source: prev, target: nodeId });
  
        this._panel.webview.postMessage({
          command: 'updateTopology',
          topology: this.topology
        });
      }
    });
  
    this.activeProcess.stdout?.on('end', () => {
      if (buf) {
        const hop = this.parseTracerouteLine(buf);
        if (hop) {
          const nodeId = `hop${hop.hop}`;
          if (!this.topology.nodes.find(n => n.id === nodeId)) {
            const label = hop.hostname && hop.hostname !== hop.ip
              ? `${hop.hostname} (${hop.ip})${hop.rtt ? ' – ' + hop.rtt : ''}`
              : `${hop.ip}${hop.rtt ? ' – ' + hop.rtt : ''}`;
  
            this.topology.nodes.push({
              id: nodeId,
              label,
              ip: hop.ip,
              hostname: hop.hostname
            });
            const prev = hop.hop === 1 ? 'source' : `hop${hop.hop - 1}`;
            this.topology.links.push({ source: prev, target: nodeId });
          }
        }
      }
    });
  
    this.activeProcess.on('close', () => {
      if (!this.topology.nodes.find(n => n.id === 'dest')) {
        this.topology.nodes.push({
          id: 'dest',
          label: target,
          ip: target,
          hostname: target
        });
        const last = this.topology.nodes[this.topology.nodes.length - 2].id;
        this.topology.links.push({ source: last, target: 'dest' });
        this._panel.webview.postMessage({ command: 'updateTopology', topology: this.topology });
      }
      this.activeProcess = undefined;
      this._panel.webview.postMessage({ command: 'toggleStop', data: { show: false } });
    });
  }
  

  private stopTraceroute() {
    this.activeProcess?.kill();
    this.activeProcess = undefined;
  }

  private parseTracerouteLine (line: string): TracerouteHop | null {
    line = line.trim();
    if (
         line.startsWith('Tracing route to') ||
         line.startsWith('over a maximum')   ||
         line === 'Trace complete.'
       ) {
      return null;
    }
  
    if (/^\d+\s+\*\s+\*\s+\*/.test(line)) {
      const hop = Number(line.split(/\s+/)[0]);
      return { hop, ip: 'timeout', hostname: 'timeout' };
    }
  
    // Linux
    const unixRe = /^\s*(\d+)\s+(\S+)\s+\(([\d.]+)\)\s+([\d.]+)\s*ms/;
    const mU = unixRe.exec(line);
    if (mU) {
      return {
        hop:      +mU[1],
        hostname: mU[2],
        ip:       mU[3],
        rtt:      `${mU[4]} ms`
      };
    }
  
    // Windows tracert adapt
    const winRe = /^\s*(\d+)\s+(<\d+|\d+|\*)\s*ms\s+(<\d+|\d+|\*)\s*ms\s+(<\d+|\d+|\*)\s*ms\s+(.+?)(?:\s+\[([\d.]+)\])?\s*$/;
    const mW = winRe.exec(line.replace(/\s+/g, ' '));
    if (mW) {
      const [ , hopStr, t1, t2, t3, hostPart, ipBracket ] = mW;
      const rtt = `${t1} ms ${t2} ms ${t3} ms`.replace(/\* ms/g, '*');
      const ip  = ipBracket ?? hostPart.trim();
      const hostname = ipBracket ? hostPart.trim() : ip;
      return { hop: +hopStr, hostname, ip, rtt };
    }
    return null;
  }  

  private generateCSV(): string {
    let csv = 'NodeID,Label\n';
    for (const n of this.topology.nodes) {
      csv += `${n.id},${n.label}\n`;
    }
    return csv;
  }

  private async exportCSV(csv: string) {
    if (!csv) {
      vscode.window.showWarningMessage('No data to export.');
      return;
    }
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      vscode.window.showWarningMessage('Open a workspace first.');
      return;
    }
    const root = folders[0].uri;
    const folder = vscode.Uri.joinPath(root, 'net-commander', 'traceroute');
    await vscode.workspace.fs.createDirectory(folder);
    const now = new Date();
    const fname = `traceroute-${now.getFullYear().toString().slice(-2)}${pad2(
      now.getMonth() + 1
    )}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}.csv`;
    const uri = vscode.Uri.joinPath(folder, fname);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, 'utf8'));
    vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
  }
}

function pad2(n: number) {
  return n < 10 ? '0' + n : '' + n;
}

function getLocalNetworkInfo(): { localIP: string; macAddress: string } {
  const nets = os.networkInterfaces();
  let localIP = 'N/A';
  let macAddress = 'N/A';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        macAddress = net.mac;
        break;
      }
    }
    if (localIP !== 'N/A') break;
  }
  return { localIP, macAddress };
}
