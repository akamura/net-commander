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

// src/tools/pingPanel.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';


// =========================================================================
// EXPORT functions
// =========================================================================
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

function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${year}-${month}-${day} ${hh}:${mm}:${ss}`;
}

// BEGIN helper returns local IP and MAC address
function getLocalNetworkInfo(): { localIP: string; macAddress: string } {
  const nets = os.networkInterfaces();
  let localIP = 'N/A';
  let macAddress = 'N/A';
  for (const name of Object.keys(nets)) {
    const netArray = nets[name];
    if (netArray) {
      for (const net of netArray) {
        if (net.family === 'IPv4' && !net.internal) {
          localIP = net.address;
          macAddress = net.mac;
          break;
        }
      }
    }
    if (localIP !== 'N/A') break;
  }
  return { localIP, macAddress };
}
// END helper returns local IP and MAC address


// BEGIN export pingpanel class WebView Function
export class PingPanel {
  public static currentPanel: PingPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  // Active ping processes for possible termination.
  private activeProcesses: ChildProcess[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this.getHtmlForWebview(this._panel.webview);

    // Listen for messages from the webview.
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'ping': {
            const { targets, count, size } = message.data;
            // Clear previous results.
            this._panel.webview.postMessage({ command: 'clearResults' });
            // Show the Stop button.
            this._panel.webview.postMessage({ command: 'toggleStop', data: { show: true } });
            this.runPingMultiple(targets, count, size);
            break;
          }
          case 'stop': {
            this.stopPings();
            // Hide the Stop button.
            this._panel.webview.postMessage({ command: 'toggleStop', data: { show: false } });
            break;
          }
          case 'clear': {
            // Clear results locally.
            this._panel.webview.postMessage({ command: 'clearResults' });
            break;
          }
          case 'exportCSV': {
            const { csv } = message.data;
            await this.exportResultsAsCSV(csv);
            break;
          }
        }
      },
      undefined,
      this._disposables
    );

    // Clean up when the panel is disposed.
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.ViewColumn.Beside;
    if (PingPanel.currentPanel) {
      PingPanel.currentPanel._panel.reveal(column);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'pingPanel',
        'NetCommander Ping',
        { viewColumn: column, preserveFocus: false },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );
      PingPanel.currentPanel = new PingPanel(panel, extensionUri);
    }
  }

  public dispose() {
    PingPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const item = this._disposables.pop();
      if (item) item.dispose();
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Ping Utility</title>
  <style>
    body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
    h1 { color: #859CA6; border-bottom: 1px solid #3f3f3f; }
    h2 { color: #859CA6; margin-top: 40px; }
    h3 { color: #859CA6; margin-top: 40px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #3f3f3f; padding: 8px; text-align: left; }
    th { background-color: #3f3f3f; color: #cccccc; }
    tbody tr:nth-child(odd) { background-color: #222426; }
    input, button, select, textarea { font-size: 1em; padding: 5px; margin: 5px 0; }
    #whatifOptions, #supernetOptions { margin-top: 10px; display: none; }
    #history { display: none; padding-top: 60px; }
    #history h1 { border-bottom: 1px solid #3f3f3f; }
    button#clearHistoryBtn { display: none; }
    a { color: #B6D6F2; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .info { background-color:#153e61; border-left: 5px solid #1E82D9; padding: 10px; margin-bottom: 20px; color: #ffffff; }
    .info a { font-weight: bold; color: #B6D6F2; }
  </style>
</head>
<body style="font-family: sans-serif;">
  <h1>Ping Utility</h1>
  <div>
    <label>Targets (comma or newline separated):</label><br>
    <textarea id="targets" rows="3" cols="40" placeholder="8.8.8.8&#10;1.1.1.1"></textarea>
  </div>
  <div style="margin-top: 8px;">
    <label>Packet Count: </label>
    <input id="count" type="number" value="4" min="1" style="width: 60px;" />
    &nbsp;&nbsp;
    <label>Packet Size: </label>
    <input id="size" type="number" value="56" min="1" style="width: 60px;" />
    &nbsp;&nbsp;
    <button id="pingBtn">Ping</button>
    <button id="clearBtn">Clear</button>
    <button id="stopBtn" style="display: none;">Stop</button>
    <button id="exportBtn">Export CSV</button>
  </div>
  <hr/>
  <div id="results"></div>
  <script>
    const vscode = acquireVsCodeApi();
    // Store results per target.
    let resultsByTarget = {};

    const pingBtn = document.getElementById('pingBtn');
    const clearBtn = document.getElementById('clearBtn');
    const stopBtn = document.getElementById('stopBtn');
    const exportBtn = document.getElementById('exportBtn');

    pingBtn.addEventListener('click', () => {
      const targetsVal = document.getElementById('targets').value;
      const countVal = document.getElementById('count').value;
      const sizeVal = document.getElementById('size').value;
      const targets = targetsVal.split(/,|\\n/g).map(t => t.trim()).filter(t => t.length > 0);
      resultsByTarget = {};
      document.getElementById('results').innerHTML = '';
      // Show the stop button when pinging.
      stopBtn.style.display = 'inline-block';
      vscode.postMessage({
        command: 'ping',
        data: { targets, count: parseInt(countVal, 10), size: parseInt(sizeVal, 10) }
      });
    });

    clearBtn.addEventListener('click', () => {
      resultsByTarget = {};
      document.getElementById('results').innerHTML = '';
      vscode.postMessage({ command: 'clear' });
    });

    stopBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'stop' });
    });

    exportBtn.addEventListener('click', () => {
      let csv = 'Seq,Bytes,TTL,Time,Target,Source,Source Mac,Timestamp\\n';
      for (const t in resultsByTarget) {
        resultsByTarget[t].replies.forEach(row => {
          csv += \`\${row.seq || ''},\${row.bytes},\${row.ttl},\${row.time},\${row.target},\${row.localIP},\${row.macAddress},\${row.timestamp}\\n\`;
        });
        if (resultsByTarget[t].summary) {
          const s = resultsByTarget[t].summary;
          csv += \`Summary for \${t}:,Transmitted: \${s.transmitted},Received: \${s.received},Loss: \${s.loss},Total Time: \${s.totalTime},RTT: \${s.rtt ? s.rtt.min+'/'+s.rtt.avg+'/'+s.rtt.max+'/'+s.rtt.mdev : 'N/A'}\\n\`;
        }
      }
      vscode.postMessage({ command: 'exportCSV', data: { csv } });
    });

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'pingResult') {
        const { target, type } = message.data;
        if (!resultsByTarget[target]) {
          resultsByTarget[target] = { replies: [], summary: null };
        }
        if (type === 'reply') {
          resultsByTarget[target].replies.push(message.data.row);
        } else if (type === 'summary') {
          resultsByTarget[target].summary = message.data.summary;
          // Hide the stop button if all pings are complete.
          stopBtn.style.display = 'none';
        }
        renderTables();
      } else if(message.command === 'clearResults'){
        resultsByTarget = {};
        document.getElementById('results').innerHTML = '';
      } else if(message.command === 'toggleStop'){
        stopBtn.style.display = message.data.show ? 'inline-block' : 'none';
      }
    });

    function renderTables() {
      const container = document.getElementById('results');
      container.innerHTML = '';
      // For each target, create a header and a dedicated table.
      for (const target in resultsByTarget) {
        const header = document.createElement('h2');
        header.textContent = target;
        container.appendChild(header);
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Seq', 'Bytes', 'TTL', 'Time', 'Target', 'Source', 'Source Mac', 'Timestamp'].forEach(text => {
          const th = document.createElement('th');
          th.textContent = text;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        resultsByTarget[target].replies.forEach(row => {
          const tr = document.createElement('tr');
          const values = [
            row.seq || '',
            row.bytes,
            row.ttl,
            row.time,
            row.target,
            row.localIP,
            row.macAddress,
            row.timestamp
          ];
          values.forEach(val => {
            const td = document.createElement('td');
            td.textContent = val;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        if (resultsByTarget[target].summary) {
          const s = resultsByTarget[target].summary;
          const tr = document.createElement('tr');
          tr.style.fontWeight = 'bold';
          const td = document.createElement('td');
          td.colSpan = 8;
          td.textContent = \`Summary for \${target}: Transmitted: \${s.transmitted}, Received: \${s.received}, Loss: \${s.loss}, Total Time: \${s.totalTime}, RTT: \${s.rtt ? s.rtt.min+'/'+s.rtt.avg+'/'+s.rtt.max+'/'+s.rtt.mdev : 'N/A'}\`;
          tr.appendChild(td);
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        container.appendChild(table);
      }
    }
  </script>
</body>
</html>
    `;
  }
// END export pingpanel class WebView Function


// BEGIN Starts ping processes for each target
  private runPingMultiple(targets: string[], count: number, size: number): void {
    targets.forEach(target => {
      this.runPing(target, count, size);
    });
  }
// END Starts ping processes for each target

// BEGIN For a given target, spawn the ping process using spawn for real-time output.
  private runPing(target: string, count: number, size: number): void {
    let command = 'ping';
    let args: string[] = [];
    if (os.platform().startsWith('win')) {
      args = ['-n', count.toString(), '-l', size.toString(), target];
    } else {
      args = ['-c', count.toString(), '-s', size.toString(), target];
    }
    const localInfo = getLocalNetworkInfo();
    const child = spawn(command, args);
    let fullOutput = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data: string) => {
      fullOutput += data;
      const lines = data.split(/\r?\n/);
      lines.forEach(line => {
        const reply = this.parsePingReply(line);
        if (reply) {
          const row: IndividualPingReply = {
            ...reply,
            timestamp: formatTimestamp(new Date()),
            localIP: localInfo.localIP,
            macAddress: localInfo.macAddress,
            target: target
          };
          this._panel.webview.postMessage({
            command: 'pingResult',
            data: { target: target, type: 'reply', row }
          });
        }
      });
    });
    child.stderr.on('data', (data: string) => {
      console.error(`Ping error for ${target}: ${data}`);
    });
    child.on('close', (code: number) => {
      const summary = this.parsePingSummary(fullOutput);
      this._panel.webview.postMessage({
        command: 'pingResult',
        data: { target: target, type: 'summary', summary }
      });
      this.activeProcesses = this.activeProcesses.filter(c => c !== child);
      if (this.activeProcesses.length === 0) {
        this._panel.webview.postMessage({ command: 'toggleStop', data: { show: false } });
      }
    });
    this.activeProcesses.push(child);
  }
// END For a given target, spawn the ping process using spawn for real-time output.


// BEGIN Attempts to parse a single ping reply from a line of output.
  private parsePingReply(line: string): { seq?: string; bytes: string; ttl: string; time: string } | null {
    const linuxRegex = /(\d+)\s+bytes\s+from\s+.+icmp_seq=(\d+).+ttl=(\d+).+time=([\d.]+)\s*ms/;
    let match = line.match(linuxRegex);
    if (match) {
      return {
        seq: match[2],
        bytes: match[1] + " bytes",
        ttl: match[3],
        time: match[4] + " ms"
      };
    }
    const winRegex = /Reply from [\d\.]+:.*bytes=(\d+).+time[=<]\s*([\d]+)ms\s+TTL\s*=\s*(\d+)/i;
    match = line.match(winRegex);
    if (match) {
      return {
        bytes: match[1] + " bytes",
        ttl: match[3],
        time: match[2] + " ms"
      };
    }
    return null;
  }
// END Attempts to parse a single ping reply from a line of output.


// BEGIN Parses the entire ping output to extract summary information.
  private parsePingSummary(output: string): PingSummary | null {
    const linuxRegex = /(\d+)\s+packets\s+transmitted,\s+(\d+)\s+(?:packets\s+)?received,\s+([\d.]+)%\s+packet\s+loss.*time\s+(\d+ms).*rtt\s+min\/avg\/max\/mdev\s+=\s+([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)\s+ms/;
    let match = output.match(linuxRegex);
    if (match) {
      return {
        transmitted: parseInt(match[1], 10),
        received: parseInt(match[2], 10),
        loss: match[3] + '%',
        totalTime: match[4],
        rtt: {
          min: match[5] + ' ms',
          avg: match[6] + ' ms',
          max: match[7] + ' ms',
          mdev: match[8] + ' ms'
        }
      };
    }
    const winRegex = /Packets:\s+Sent\s+=\s+(\d+),\s+Received\s+=\s+(\d+),\s+Lost\s+=\s+\d+\s+\((\d+)% loss\)/i;
    const winRttRegex = /Minimum\s+=\s+(\d+)ms,\s+Maximum\s+=\s+(\d+)ms,\s+Average\s+=\s+(\d+)ms/i;
    let winMatch = output.match(winRegex);
    let winRttMatch = output.match(winRttRegex);
    if (winMatch) {
      return {
        transmitted: parseInt(winMatch[1], 10),
        received: parseInt(winMatch[2], 10),
        loss: winMatch[3] + '%',
        totalTime: '',
        rtt: winRttMatch ? {
          min: winRttMatch[1] + ' ms',
          avg: winRttMatch[3] + ' ms',
          max: winRttMatch[2] + ' ms',
          mdev: 'n/a'
        } : null
      };
    }
    return null;
  }
// END Parses the entire ping output to extract summary information.


// BEGIN CSV exporter
  private async exportResultsAsCSV(csv: string): Promise<void> {
    if (!csv) {
      vscode.window.showWarningMessage('No results to export.');
      return;
    }
    // Get the first workspace folder.
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage("No workspace folder is open. Please open a folder or a workspace to save pings.");
      return;
    }
    const rootUri = workspaceFolders[0].uri;
    // Define the target folder: <root>/net-commander/ping-utility
    const netCommanderUri = vscode.Uri.joinPath(rootUri, 'net-commander');
    const pingUtilityUri = vscode.Uri.joinPath(netCommanderUri, 'ping-utility');
    try {
      await vscode.workspace.fs.createDirectory(netCommanderUri);
      await vscode.workspace.fs.createDirectory(pingUtilityUri);
    } catch (err) {
      console.error(err);
      vscode.window.showErrorMessage("Failed to create export directories: " + err);
      return;
    }
    // Create filename: net-commander-ping-YYMMDD-HHMM.csv
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = pad2(now.getMonth() + 1);
    const day = pad2(now.getDate());
    const hour = pad2(now.getHours());
    const minute = pad2(now.getMinutes());
    const fileName = `net-commander-ping-${year}${month}${day}-${hour}${minute}.csv`;
    const fileUri = vscode.Uri.joinPath(pingUtilityUri, fileName);
    try {
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(csv, 'utf-8'));
      vscode.window.showInformationMessage(`Ping results exported to: ${fileUri.fsPath}`);
    } catch (err) {
      vscode.window.showErrorMessage("Failed to write CSV file: " + err);
      return;
    }
    // To avoid sharing sensitive informations I update .gitignore to ignore "net-commander/" folder.
    const gitignoreUri = vscode.Uri.joinPath(rootUri, '.gitignore');
    try {
      let gitignoreContent = await vscode.workspace.fs.readFile(gitignoreUri);
      let gitignoreText = Buffer.from(gitignoreContent).toString('utf-8');
      // Check if "/net-commander" is present as a separate line.
      const pattern = /^\/net-commander\s*$/m;
      if (!pattern.test(gitignoreText)) {
        gitignoreText += "\n/net-commander\n";
        await vscode.workspace.fs.writeFile(gitignoreUri, Buffer.from(gitignoreText, 'utf-8'));
        vscode.window.showInformationMessage("Added '/net-commander' to .gitignore.");
      }
    } catch (err) {
      // If .gitignore doesn't exist, ignore.
      console.warn(".gitignore not found in the workspace root; not creating one.");
    }
  }
// END CSV exporter

  private stopPings(): void {
    this.activeProcesses.forEach(proc => proc.kill());
    this.activeProcesses = [];
  }
}