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

// src/tools/traceroute.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';


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
  x?: number;
  y?: number;
}

export interface Topology {
  nodes: TracerouteNode[];
  links: { source: string; target: string }[];
}


// BEGIN function helpers
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

function xmlEscape(text: string): string {
  return text.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&apos;");
}
// END function helpers


// BEGIN traceroutepanel export classes
export class TraceroutePanel {
  public static currentPanel: TraceroutePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private activeProcess: ChildProcess | undefined;
  private topology: Topology = { nodes: [], links: [] };

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._panel.webview.html = this.getHtmlForWebview();

    // Listen for messages from the webview.
    this._panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'traceroute': {
          const target: string = message.data.target;
          this.resetTopology();
          this.startTraceroute(target);
          break;
        }
        case 'stop': {
          this.stopTraceroute();
          this._panel.webview.postMessage({ command: 'toggleStop', data: { show: false } });
          break;
        }
        case 'clear': {
          this.resetTopology();
          this._panel.webview.postMessage({ command: 'clearResults' });
          break;
        }
        case 'exportCSV': {
          const csv = this.generateCSV();
          await this.exportCSV(csv);
          break;
        }
        case 'exportDrawio': {
          const { drawioXml } = this.generateDrawioExport();
          await this.exportDrawio(drawioXml);
          break;
        }
      }
    }, undefined, this._disposables);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.ViewColumn.Beside;
    if (TraceroutePanel.currentPanel) {
      TraceroutePanel.currentPanel._panel.reveal(column);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'traceroutePanel',
        'NetCommander Traceroute',
        { viewColumn: column, preserveFocus: false },
        { enableScripts: true, retainContextWhenHidden: true }
      );
      TraceroutePanel.currentPanel = new TraceroutePanel(panel, extensionUri);
    }
  }

  public dispose() {
    TraceroutePanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }
// END traceroutepanel export classes


// BEGIN Topology WebView Function using D3JS library
  private getHtmlForWebview(): string {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Traceroute Utility</title>
    <style>
      body { font-family: sans-serif; margin: 0; padding: 0; background: #333; }
      svg { width: 100%; height: 100vh; }
      .control-panel {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 10;
        background: rgba(255,255,255,0.8);
        border-radius: 4px;
        padding: 5px;
      }
      .control-panel button {
        margin-right: 5px;
        padding: 5px 10px;
      }
    </style>
  </head>
  <body>
    <div class="control-panel">
      <input type="text" id="target" placeholder="Enter target IP or hostname" style="width:250px" />
      <button id="generateBtn">Generate</button>
      <button id="resetViewBtn">Reset View</button>
      <button id="exportCSVBtn">Export CSV</button>
      <button id="clearBtn">Clear</button>
    </div>
    <svg></svg>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script>
      const vscode = acquireVsCodeApi();
      let topology = { nodes: [], links: [] };
  
      const svg = d3.select("svg");
      const container = svg.append("g");
      const zoomBehavior = d3.zoom().on("zoom", event => {
        container.attr("transform", event.transform);
      });
      svg.call(zoomBehavior);
  
      // Helper function to return the node color based on type.
      function getNodeColor(d) {
        if (d.id === "source") {
          return "#9EF8EE"; // my host icon color (green)
        }
        if (d.id === "dest") {
          return "#9EF8EE"; // target icon color (blue)
        }
        if (d.label.toLowerCase().includes("timeout")) {
          return "#D92525"; // timeout icon color (red)
        }
        return "#9FC131"; // default hop icon color
      }
  
      // Render topology with custom layout:
      // - The first and last nodes (source and target) remain centered vertically.
      // - Intermediate nodes alternate above and below with increased Y distance.
      function renderTopology() {
        const height = window.innerHeight;
        const centerY = height / 2;
        const startX = 80;         // X coordinate for the source.
        const spacingX = 120;        // Horizontal spacing between nodes.
        const delta = 80;          // Increased vertical offset for intermediate hops.
        
        // Determine position for each node.
        topology.nodes.forEach((node, i) => {
          node.x = startX + i * spacingX;
          // Source (index 0) and target (last index) remain on the center (fixed Y axis).
          if (i === 0 || i === topology.nodes.length - 1) {
            node.y = centerY;
          } else {
            // Alternate intermediate nodes: odd indices above and even indices below.
            node.y = (i % 2 === 1) ? centerY - delta : centerY + delta;
          }
        });
        
        // Render links.
        const link = container.selectAll("line.link")
          .data(topology.links, d => d.source + "-" + d.target);
        link.exit().remove();
        link.enter()
          .append("line")
          .attr("class", "link")
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .merge(link)
          .attr("x1", d => getNodeById(d.source).x)
          .attr("y1", d => getNodeById(d.source).y)
          .attr("x2", d => getNodeById(d.target).x)
          .attr("y2", d => getNodeById(d.target).y);
  
        // Render nodes.
        const node = container.selectAll("g.node")
          .data(topology.nodes, d => d.id);
        const nodeEnter = node.enter().append("g")
          .attr("class", "node")
          // Allow dragging only for intermediate hops.
          .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
        
        // Append circle and text for each node.
        nodeEnter.append("circle")
          .attr("r", 20)
          .attr("fill", d => getNodeColor(d));
        nodeEnter.append("text")
          .attr("dy", 35)
          .attr("text-anchor", "middle")
          .attr("fill", "#fff");
        
        nodeEnter.merge(node)
          .attr("transform", d => "translate(" + d.x + "," + d.y + ")")
          .select("text")
          .text(d => d.label);
        
        console.log("Rendered topology:", topology);
      }
  
      function getNodeById(id) {
        return topology.nodes.find(d => d.id === id);
      }
  
      function dragstarted(event, d) {
        // Prevent dragging of source and target.
        if (d.id === "source" || d.id === "dest") return;
        d3.select(this).raise();
      }
      
      function dragged(event, d) {
        if (d.id === "source" || d.id === "dest") return;
        d.x = event.x;
        d.y = event.y;
        d3.select(this).attr("transform", "translate(" + d.x + "," + d.y + ")");
        // Update links in real time.
        container.selectAll("line.link")
          .attr("x1", l => getNodeById(l.source).x)
          .attr("y1", l => getNodeById(l.source).y)
          .attr("x2", l => getNodeById(l.target).x)
          .attr("y2", l => getNodeById(l.target).y);
      }
      
      function dragended(event, d) { }
  
      function resetView() {
        svg.transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity);
      }
      window.resetView = resetView;
  
      // Control panel event handlers.
      document.getElementById("generateBtn").addEventListener("click", () => {
        const target = document.getElementById("target").value.trim();
        if (!target) return;
        vscode.postMessage({ command: "traceroute", data: { target } });
      });
      document.getElementById("resetViewBtn").addEventListener("click", () => {
        resetView();
      });
      document.getElementById("exportCSVBtn").addEventListener("click", () => {
        vscode.postMessage({ command: "exportCSV" });
      });
      document.getElementById("clearBtn").addEventListener("click", () => {
        vscode.postMessage({ command: "clear" });
      });
  
      window.addEventListener("message", event => {
        const message = event.data;
        if (message.command === "updateTopology") {
          console.log("Webview received topology update:", message.topology);
          topology = message.topology;
          renderTopology();
        } else if (message.command === "clearResults") {
          topology = { nodes: [], links: [] };
          container.selectAll("*").remove();
        }
      });
    </script>
  </body>
  </html>
  `;
  }
// END Topology WebView Function using D3JS library


// BEGIN WebView auxiliary commands
  private resetTopology() {
    this.topology = { nodes: [], links: [] };
    const local = getLocalNetworkInfo();
    // Prepend "my host:" to the host label.
    const sourceNode: TracerouteNode = { 
      id: "source", 
      label: "My host: " + local.localIP + " (" + local.macAddress + ")" 
    };
    this.topology.nodes.push(sourceNode);
    this._panel.webview.postMessage({ command: "updateTopology", topology: this.topology });
  }
  

  private startTraceroute(target: string) {
    const destinationNode: TracerouteNode = { id: "dest", label: target };
    let cmd = "";
    let args: string[] = [];
    if (os.platform().startsWith("win")) {
      cmd = "tracert";
      args = [target];
    } else {
      cmd = "traceroute";
      args = [target];
    }
    this.activeProcess = spawn(cmd, args);
    let output = "";
    if (this.activeProcess && this.activeProcess.stdout) {
      this.activeProcess.stdout.setEncoding("utf8");
      this.activeProcess.stdout.on("data", (data: string) => {
        output += data;
        const lines = data.split(/\r?\n/);
        lines.forEach(line => {
          // Debug log each line received
          console.log("Raw traceroute line:", line);
          
          if (!line.trim() || line.toLowerCase().includes("tracing route") || line.toLowerCase().includes("over a maximum")) {
            return;
          }
          const hop = this.parseTracerouteLine(line);
          console.log("Parsed hop:", hop);
          if (hop) {
            if (!this.topology.nodes.find(n => n.id === "hop" + hop.hop)) {
              // If a hostname is available and it’s different than the IP, include it.
              let label = "";
              if (hop.hostname && hop.hostname !== hop.ip) {
                label = hop.hostname + " (" + hop.ip + ")";
              } else {
                label = hop.ip;
              }
              if (hop.rtt) {
                label += " (" + hop.rtt + ")";
              }
              const node: TracerouteNode = { id: "hop" + hop.hop, label: label };
              this.topology.nodes.push(node);
              if (hop.hop === 1) {
                this.topology.links.push({ source: "source", target: node.id });
              } else {
                this.topology.links.push({ source: "hop" + (hop.hop - 1), target: node.id });
              }
              this._panel.webview.postMessage({ command: "updateTopology", topology: this.topology });
            }
          }
          
        });
      });
      
    }
    if (this.activeProcess && this.activeProcess.stderr) {
      this.activeProcess.stderr.setEncoding("utf8");
      this.activeProcess.stderr.on("data", (data: string) => {
        console.error("Traceroute stderr: " + data);
      });
    }
    this.activeProcess.on("close", (code: number) => {
      if (!this.topology.nodes.find(n => n.id === "dest")) {
        this.topology.nodes.push(destinationNode);
        if (this.topology.nodes.length > 1) {
          const lastNode = this.topology.nodes[this.topology.nodes.length - 2];
          this.topology.links.push({ source: lastNode.id, target: "dest" });
        }
        this._panel.webview.postMessage({ command: "updateTopology", topology: this.topology });
      }
      this.activeProcess = undefined;
      this._panel.webview.postMessage({ command: "toggleStop", data: { show: false } });
    });
  }

  private stopTraceroute() {
    if (this.activeProcess) {
      this.activeProcess.kill();
      this.activeProcess = undefined;
    }
  }

  private parseTracerouteLine(line: string): TracerouteHop | null {
    // Check for a timeout indication.
    if (line.includes("*")) {
      const hopMatch = line.match(/^\s*(\d+)/);
      if (hopMatch) {
        return {
          hop: parseInt(hopMatch[1], 10),
          ip: "timeout",
          hostname: "timeout"
        };
      }
      return null;
    }
    // For Ubuntu, we expect a hostname followed by the IP in parentheses.
    const linuxRegex = /^\s*(\d+)\s+([^\s]+)\s+\(([\d\.]+)\)\s+([\d\.]+)\s*ms/;
    let match = line.match(linuxRegex);
    if (match) {
      return {
        hop: parseInt(match[1], 10),
        hostname: match[2],
        ip: match[3],
        rtt: match[4] + " ms"
      };
    }
    // Add additional regex for Windows here if needed.
    return null;
  }

  private generateCSV(): string {
    let csv = "NodeID,Label\n";
    this.topology.nodes.forEach(node => {
      csv += `${node.id},${node.label}\n`;
    });
    return csv;
  }

  private generateDrawioExport(): { drawioXml: string } {
    const startX = -1480;
    const startY = 360;
    const spacingX = 240;
    this.topology.nodes.forEach((node, i) => {
      node.x = startX + i * spacingX;
      node.y = startY;
    });
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxGraphModel dx="3359" dy="1303" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169">\n  <root>\n    <mxCell id="0"/>\n    <mxCell id="1" parent="0"/>\n`;
    this.topology.nodes.forEach((node, i) => {
      xml += `    <mxCell id="node${i}" value="${xmlEscape(node.label)}" vertex="1" parent="1" style="spacingTop=80;">\n`;
      xml += `      <mxGeometry x="${node.x}" y="${node.y}" width="40" height="40" as="geometry"/>\n`;
      xml += "    </mxCell>\n";
    });
    this.topology.links.forEach((link, i) => {
      const srcIndex = this.topology.nodes.findIndex(n => n.id === link.source);
      const tgtIndex = this.topology.nodes.findIndex(n => n.id === link.target);
      xml += `    <mxCell id="edge${i}" edge="1" parent="1" source="node${srcIndex}" target="node${tgtIndex}">\n`;
      xml += `      <mxGeometry relative="1" as="geometry"/>\n`;
      xml += "    </mxCell>\n";
    });
    xml += "  </root>\n</mxGraphModel>";
    return { drawioXml: xml };
  }

  private async exportCSV(csv: string): Promise<void> {
    if (!csv) {
      vscode.window.showWarningMessage("No results to export.");
      return;
    }
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage("No workspace folder is open.");
      return;
    }
    const rootUri = workspaceFolders[0].uri;
    const exportFolder = vscode.Uri.joinPath(rootUri, "net-commander", "traceroute");
    try {
      await vscode.workspace.fs.createDirectory(exportFolder);
    } catch (err) {
      console.error(err);
      vscode.window.showErrorMessage("Failed to create export directory: " + err);
      return;
    }
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = pad2(now.getMonth() + 1);
    const day = pad2(now.getDate());
    const hour = pad2(now.getHours());
    const minute = pad2(now.getMinutes());
    const fileName = `net-commander-traceroute-${year}${month}${day}-${hour}${minute}.csv`;
    const fileUri = vscode.Uri.joinPath(exportFolder, fileName);
    try {
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(csv, "utf-8"));
      vscode.window.showInformationMessage(`Traceroute results exported to: ${fileUri.fsPath}`);
    } catch (err) {
      vscode.window.showErrorMessage("Failed to write CSV file: " + err);
      return;
    }
  }

  private async exportDrawio(drawioXml: string): Promise<void> {
    if (!drawioXml) {
      vscode.window.showWarningMessage("No export data available.");
      return;
    }
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage("No workspace folder is open.");
      return;
    }
    const rootUri = workspaceFolders[0].uri;
    const netCommanderUri = vscode.Uri.joinPath(rootUri, 'net-commander');
    const tracerouteUri = vscode.Uri.joinPath(netCommanderUri, 'traceroute');
    try {
      await vscode.workspace.fs.createDirectory(netCommanderUri);
      await vscode.workspace.fs.createDirectory(tracerouteUri);
    } catch (err) {
      console.error("Failed to create export directories:", err);
      vscode.window.showErrorMessage("Failed to create export directories: " + err);
      return;
    }
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = pad2(now.getMonth() + 1);
    const day = pad2(now.getDate());
    const hour = pad2(now.getHours());
    const minute = pad2(now.getMinutes());
    const fileName = `net-commander-traceroute-${year}${month}${day}-${hour}${minute}.drawio`;
    const fileUri = vscode.Uri.joinPath(tracerouteUri, fileName);
    try {
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(drawioXml, 'utf-8'));
      vscode.window.showInformationMessage(`Traceroute export saved to: ${fileUri.fsPath}`);
      const doc = await vscode.workspace.openTextDocument(fileUri);
      vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    } catch (err: any) {
      vscode.window.showErrorMessage("Failed to write draw.io file: " + err.message);
      return;
    }
    const gitignoreUri = vscode.Uri.joinPath(rootUri, '.gitignore');
    try {
      const gitignoreData = await vscode.workspace.fs.readFile(gitignoreUri);
      let gitignoreText = Buffer.from(gitignoreData).toString("utf8");
      const pattern = /^net-commander\/\s*$/m;
      if (!pattern.test(gitignoreText)) {
        gitignoreText += "\nnet-commander/\n";
        await vscode.workspace.fs.writeFile(gitignoreUri, Buffer.from(gitignoreText, "utf8"));
        vscode.window.showInformationMessage("Added 'net-commander/' to .gitignore.");
      }
    } catch (err) {
      console.warn(".gitignore not found; not modifying.");
    }
  }
}
// END WebView auxiliary commands


// BEGIN export utility function
export function tracerouteHost(target: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let cmd = "";
    let args: string[] = [];
    if (os.platform().startsWith("win")) {
      cmd = "tracert";
      args = [target];
    } else {
      cmd = "traceroute";
      args = [target];
    }
    let output = "";
    const child = spawn(cmd, args);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (data: string) => {
      output += data;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (data: string) => {
      // Optionally handle stderr output.
    });
    child.on("close", (code: number) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error("Traceroute process exited with code " + code));
      }
    });
  });
}

export function parseTracerouteOutput(output: string): { hop: number; ip: string; line: string }[] {
  const lines = output.split("\n");
  const hops: { hop: number; ip: string; line: string }[] = [];
  const regex = /^\s*(\d+)\s+([\d\.]+).*/;
  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      hops.push({ hop: parseInt(match[1], 10), ip: match[2], line: line.trim() });
    }
  }
  return hops;
}
// END WebView auxiliary commands