/***************************************************************************
 *   Extension:   Net Commander                                            *
 *   Version:     0.0.1                                                    *
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

// src/modules/pingPanel.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { getNonce } from '../helpers/nonce';
import { exportCsv } from '../helpers/exporter';


// =========================================================================
// EXPORT functions
// =========================================================================
interface PingRequest {
  command: 'ping';
  data: { targets: string[]; count: number; size: number };
}
interface StopRequest { command: 'stop' }
interface ClearRequest { command: 'clear' }
interface ExportCsvRequest { command: 'exportCSV'; data: { csv: string } }
type IncomingMessage = PingRequest | StopRequest | ClearRequest | ExportCsvRequest;

interface IndividualPingReply {
  seq?: string;
  bytes: string;
  ttl: string;
  time: string;
  timestamp: string;
  localIP: string;
  macAddress: string;
  target: string;
}
interface PingSummary {
  transmitted: number;
  received: number;
  loss: string;
  totalTime: string;
  rtt: { min: string; avg: string; max: string; mdev: string } | null;
}


// BEGIN function to generate user webview content
export class PingPanel {
  public static currentPanel: PingPanel | undefined;
  private activeProcesses: ChildProcess[] = [];
  private disposables: vscode.Disposable[] = [];

  private constructor(
    private panel: vscode.WebviewPanel,
    private extensionUri: vscode.Uri
  ) {
    panel.webview.html = this.showWebviewContent();
    panel.webview.onDidReceiveMessage(msg => this.handleMessage(msg), null, this.disposables);
    panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.ViewColumn.Beside;
    if (PingPanel.currentPanel) {
      PingPanel.currentPanel.panel.reveal(column);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'pingPanel',
        'NetCommander Ping',
        column,
        { enableScripts: true }
      );
      PingPanel.currentPanel = new PingPanel(panel, extensionUri);
    }
  }

  public dispose() {
    this.stopAll();
    this.disposables.forEach(d => d.dispose());
    this.panel.dispose();
    PingPanel.currentPanel = undefined;
  }

  private handleMessage(message: IncomingMessage) {
    try {
      switch (message.command) {
        case 'ping':
          this.clearResults();
          this.toggleStop(true);
          this.runPingMultiple(
            message.data.targets,
            Number.isInteger(message.data.count) ? message.data.count : 4,
            Number.isInteger(message.data.size)  ? message.data.size  : 56
          );
          break;
        case 'stop':
          this.stopAll();
          this.toggleStop(false);
          break;
        case 'clear':
          this.clearResults();
          break;
        case 'exportCSV':
          exportCsv('ping', 'ping', message.data.csv,
            'Seq,Bytes,TTL,Time,Target,Source,Source Mac,Timestamp\n'
          );
          break;
      }
    } catch (e) {
      console.error('PingPanel error', e);
    }
  }

  private runPingMultiple(targets: string[], count: number, size: number) {
    for (const target of targets) {
      this.runPing(target, count, size);
    }
  }

  private runPing(target: string, count: number, size: number) {
    const args = this.buildPingArgs(count, size, target);
    const { localIP, macAddress } = PingPanel.getLocalNetworkInfo();

    const child = spawn('ping', args);
    let buffer = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buffer += chunk;
      for (const line of chunk.split(/\r?\n/)) {
        const reply = this.parsePingReply(line);
        if (reply) {
          this.postReply(target, reply, localIP, macAddress);
        }
      }
    });

    child.on('close', () => {
      const summary = this.parsePingSummary(buffer);
      this.postSummary(target, summary);
      this.activeProcesses = this.activeProcesses.filter(p => p !== child);
      if (this.activeProcesses.length === 0) {
        this.toggleStop(false);
      }
    });

    child.stderr.on('data', err => console.error(`Ping error (${target}):`, err.toString()));
    this.activeProcesses.push(child);
  }

  private stopAll() {
    for (const p of this.activeProcesses) {
      p.kill();
    }
    this.activeProcesses = [];
  }

  private clearResults() {
    this.panel.webview.postMessage({ command: 'clearResults' });
  }

  private toggleStop(show: boolean) {
    this.panel.webview.postMessage({ command: 'toggleStop', data: { show } });
  }

  private postReply(
    target: string,
    r: { seq?: string; bytes: string; ttl: string; time: string },
    localIP: string,
    macAddress: string
  ) {
    this.panel.webview.postMessage({
      command: 'pingResult',
      data: {
        target,
        type: 'reply',
        row: {
          ...r,
          timestamp: PingPanel.formatTimestamp(new Date()),
          localIP,
          macAddress,
          target
        } as IndividualPingReply
      }
    });
  }

  private postSummary(target: string, summary: PingSummary | null) {
    this.panel.webview.postMessage({
      command: 'pingResult',
      data: { target, type: 'summary', summary }
    });
  }

  private buildPingArgs(count: number, size: number, target: string): string[] {
    if (os.platform().startsWith('win')) {
      return ['-n', count.toString(), '-l', size.toString(), target];
    } else {
      return ['-c', count.toString(), '-s', size.toString(), target];
    }
  }

  private parsePingReply(line: string) {
    const linux = /(\d+)\s+bytes\s+from.+icmp_seq=(\d+).+ttl=(\d+).+time=([\d.]+) ms/;
    const win   = /Reply from [\d.]+: bytes=(\d+).*time[=<]([\d]+)ms.*TTL=(\d+)/i;
    let m = line.match(linux);
    if (m) return { seq: m[2], bytes: `${m[1]} bytes`, ttl: m[3], time: `${m[4]} ms` };
    m = line.match(win);
    if (m) return { bytes: `${m[1]} bytes`, ttl: m[3], time: `${m[2]} ms` };
    return null;
  }

  private parsePingSummary(output: string): PingSummary | null {
    const linux = /(\d+)\s+packets transmitted,\s+(\d+)\s+received,\s+([\d.]+)% packet loss.*time (\d+ms).*=\s+([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/;
    const winP  = /Sent = (\d+), Received = (\d+), Lost = \d+ \((\d+)% loss\)/i;
    const winR  = /Minimum = (\d+)ms, Maximum = (\d+)ms, Average = (\d+)ms/i;

    let m = output.match(linux);
    if (m) {
      return {
        transmitted: +m[1],
        received:    +m[2],
        loss:        `${m[3]}%`,
        totalTime:   m[4],
        rtt:         { min: `${m[5]} ms`, avg: `${m[6]} ms`, max: `${m[7]} ms`, mdev: `${m[8]} ms` }
      };
    }
    m = output.match(winP);
    const rtt = output.match(winR);
    if (m) {
      return {
        transmitted: +m[1],
        received:    +m[2],
        loss:        `${m[3]}%`,
        totalTime:   '',
        rtt: rtt
          ? { min: `${rtt[1]} ms`, avg: `${rtt[3]} ms`, max: `${rtt[2]} ms`, mdev: 'n/a' }
          : null
      };
    }
    return null;
  }

  private static getLocalNetworkInfo() {
    const nets = os.networkInterfaces();
    let localIP = 'N/A', macAddress = 'N/A';
    for (const dev of Object.values(nets)) {
      if (!dev) continue;
      for (const inf of dev) {
        if (inf.family === 'IPv4' && !inf.internal) {
          localIP = inf.address;
          macAddress = inf.mac;
          break;
        }
      }
      if (localIP !== 'N/A') break;
    }
    return { localIP, macAddress };
  }

  private static formatTimestamp(d: Date) {
    const pad = (n: number) => n < 10 ? '0'+n : String(n);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
         + ` ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private showWebviewContent(): string {
    const nonce = getNonce();
    const csp   = this.panel.webview.cspSource;
    const webview = this.panel.webview;
    const elemUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'libs', 'vscode-elements', 'bundled.js'));
    const style   = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'common', 'css', 'style.css'));
    const script  = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'module-ping', 'main.js'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             img-src ${csp} https: data:;
             script-src 'nonce-${nonce}' ${csp};
             style-src 'unsafe-inline' ${csp};
             font-src ${csp} https: data:;">
  <link rel="stylesheet" href="${style}" />
</head>
<body>
  <div class="layout">
    <div class="top-bar">
      <h1>Ping utility</h1>
    </div>

    <div class="header flex-row section-padding">
      <vscode-form-container responsive="true">
        <vscode-label for="pingtargets">Targets (comma or newline)</vscode-label>
        <vscode-textarea id="pingtargets" placeholder="8.8.8.8&#10;1.1.1.1"></vscode-textarea>
        <vscode-label for="pingcount">Count</vscode-label>
        <vscode-textfield id="pingcount" placeholder="4"></vscode-textfield>
        <vscode-label for="pingsize">Size</vscode-label>
        <vscode-textfield id="pingsize" placeholder="56"></vscode-textfield>
        <vscode-form-group>
          <vscode-button id="pingBtn">Ping</vscode-button>
          <vscode-button id="exportBtn">Export</vscode-button>
          <vscode-button id="clearBtn" secondary>Clear</vscode-button>
        </vscode-form-group>
      </vscode-form-container>
    </div>
    <div class="middle section-padding scrollable-y">
      <div id="results"></div>
    </div>
  </div>
  <script type="module" nonce="${nonce}" src="${elemUri}"></script>
  <script type="module" nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }
}
// END function to generate user webview content