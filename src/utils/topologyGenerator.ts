/***************************************************************************
 *   Extension:   Net Commander                                            *
 *   Version:     0.0.1                                                    *
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

// src/utils/topologyGenerator.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import * as path from 'path';


// =========================================================================
// EXPORT functions
// =========================================================================
interface Node {
  id: string;
  label: string;
  platform?: string;
  ipv4?: string;
  interfaceInfo?: string;
  mgmtAddress?: string;
  physicalLocation?: string;
  version?: string;
  holdtime?: string;
  x?: number;
  y?: number;
}

interface Link {
  source: string;
  target: string;
}

export interface Topology {
  nodes: Node[];
  links: Link[];
}


// BEGIN XML Escape function 
// Except that line breaks are preserved (converted to '&#xa;').
function xmlEscapeKeepBr(text: string): string {
  text = text.replace(/<br\s*\/?>/gi, "%%BR%%");
  text = text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return text.replace(/%%BR%%/g, "&#xa;");
}

// Standard xml escape
function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
// END XML Escape function


// BEGIN Scan TXT function
async function getAllTxtFiles(dir: vscode.Uri): Promise<vscode.Uri[]> {
  const files: vscode.Uri[] = [];
  const entries = await vscode.workspace.fs.readDirectory(dir);
  for (const [name, type] of entries) {
    const entryUri = vscode.Uri.joinPath(dir, name);
    if (type === vscode.FileType.Directory) {
      files.push(...await getAllTxtFiles(entryUri));
    } else if (type === vscode.FileType.File && name.endsWith('.txt')) {
      files.push(entryUri);
    }
  }
  return files;
}
// END Scan TXT function


// BEGIN Build Topology from Files
//Parses topology files and returns a Topology object.
export async function buildTopologyFromFiles(files: vscode.Uri[]): Promise<Topology> {
  const nodesMap: Map<string, Node> = new Map();
  const links: Link[] = [];

  for (const fileUri of files) {
    const contentBytes = await vscode.workspace.fs.readFile(fileUri);
    const content = Buffer.from(contentBytes).toString('utf8');
    const blocks = content.split(/-+\s*\n/);
    for (const block of blocks) {
      const deviceMatch = block.match(/Device ID:\s*(.+)/i);
      if (!deviceMatch) { continue; }
      const deviceId = deviceMatch[1].trim();
      const systemMatch = block.match(/System Name:\s*(.+)/i);
      const label = systemMatch ? systemMatch[1].trim() : deviceId;
      const platformMatch = block.match(/Platform:\s*([^,\n]+)/i);
      const platform = platformMatch ? platformMatch[1].trim() : undefined;
      let ipv4: string | undefined;
      const ifaceBlockMatch = block.match(/Interface address\(es\):([\s\S]*?)\n\n/i);
      if (ifaceBlockMatch) {
        const ipMatch = ifaceBlockMatch[1].match(/IPv4 Address:\s*([\d.]+)/i);
        if (ipMatch) { ipv4 = ipMatch[1].trim(); }
      }
      if (!ipv4) {
        const ipv4Match = block.match(/IPv4 Address:\s*([\d.]+)/i);
        ipv4 = ipv4Match ? ipv4Match[1].trim() : undefined;
      }
      let interfaceInfo: string | undefined;
      const interfaceMatch = block.match(/Interface:\s*([^,]+),\s*Port ID\s*\(outgoing port\):\s*(.+)/i);
      if (interfaceMatch) {
        interfaceInfo = `Interface: ${interfaceMatch[1].trim()}, Port ID: ${interfaceMatch[2].trim()}`;
      }
      const holdtimeMatch = block.match(/Holdtime:\s*([\d]+\s*sec)/i);
      const holdtime = holdtimeMatch ? holdtimeMatch[1].trim() : undefined;
      let version: string | undefined;
      const versionBlock = block.match(/Version:\s*([\s\S]+?)\nAdvertisement Version:/i);
      if (versionBlock) {
        version = versionBlock[1].replace(/\n/g, " ").trim();
      }
      const physicalLocationMatch = block.match(/Physical Location:\s*(.+)/i);
      const physicalLocation = physicalLocationMatch ? physicalLocationMatch[1].trim() : undefined;
      let mgmtAddress: string | undefined;
      const mgmtBlockMatch = block.match(/Mgmt address\(es\):([\s\S]*?)\n/i);
      if (mgmtBlockMatch) {
        const mgmtIpMatch = mgmtBlockMatch[1].match(/IPv4 Address:\s*([\d.]+)/i);
        if (mgmtIpMatch) {
          mgmtAddress = mgmtIpMatch[1].trim();
        }
      } else {
        const mgmtIpMatch = block.match(/Mgmt address\(es\):[\s\S]*?IPv4 Address:\s*([\d.]+)/i);
        mgmtAddress = mgmtIpMatch ? mgmtIpMatch[1].trim() : undefined;
      }

      if (!nodesMap.has(deviceId)) {
        nodesMap.set(deviceId, {
          id: deviceId,
          label,
          platform,
          ipv4,
          interfaceInfo,
          holdtime,
          version,
          physicalLocation,
          mgmtAddress
        });
      } else {
        const existing = nodesMap.get(deviceId)!;
        existing.platform = existing.platform || platform;
        existing.ipv4 = existing.ipv4 || ipv4;
        existing.interfaceInfo = existing.interfaceInfo || interfaceInfo;
        existing.holdtime = existing.holdtime || holdtime;
        existing.version = existing.version || version;
        existing.physicalLocation = existing.physicalLocation || physicalLocation;
        existing.mgmtAddress = existing.mgmtAddress || mgmtAddress;
      }

      const neighborRegex = /Port ID\s*\(outgoing port\):\s*(.+)/gi;
      let matchExec: RegExpExecArray | null;
      while ((matchExec = neighborRegex.exec(block)) !== null) {
        const neighborId = matchExec[1].trim();
        if (!neighborId) { continue; }
        if (!nodesMap.has(neighborId)) {
          nodesMap.set(neighborId, { id: neighborId, label: neighborId });
        }
        links.push({ source: deviceId, target: neighborId });
      }
    }
  }
  return { nodes: Array.from(nodesMap.values()), links };
}
// END Build Topology from Files


// BEGIN Topology WebView Function using D3JS library
function getTopologyWebviewContent(topology: Topology, iconBaseUri: string): string {
  const topologyData = JSON.stringify(topology);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Topology Viewer</title>
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
    #tooltip {
      position: absolute;
      background: #222;
      color: #fff;
      padding: 10px;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.4;
      z-index: 100;
    }
    #tooltip button {
      margin-top: 5px;
      padding: 3px 6px;
    }
  </style>
</head>
<body>
  <div class="control-panel">
    <button onclick="refreshTopology()">Refresh Topology</button>
    <button onclick="resetView()">Reset View</button>
    <button onclick="exportToDrawIO()">Export to draw.io</button>
  </div>
  <svg></svg>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script>
    const vscode = acquireVsCodeApi();
    let topology = ${topologyData};
    const iconBaseUri = "${iconBaseUri}";

    function getIconForNode(d) {
      return (d.platform && d.platform.toLowerCase().includes("n9k"))
        ? iconBaseUri + '/icon-cisconexus.png'
        : iconBaseUri + '/icon-ciscoswitch.png';
    }

    const svg = d3.select("svg");
    const width = window.innerWidth;
    const height = window.innerHeight;
    const container = svg.append("g");
    const simulation = d3.forceSimulation(topology.nodes)
      .force("link", d3.forceLink(topology.links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", ticked);
    const link = container.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(topology.links)
      .join("line")
      .attr("stroke", "#ffffff")
      .attr("stroke-opacity", 0.8)
      .attr("stroke-width", 2);
    const nodeGroup = container.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(topology.nodes)
      .join("g")
      .call(drag(simulation))
      .on("click", (event, d) => { showTooltip(event, d); });
    nodeGroup.append("image")
      .attr("xlink:href", d => getIconForNode(d))
      .attr("width", 40)
      .attr("height", 40)
      .attr("x", -20)
      .attr("y", -40);
    nodeGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff")
      .attr("font-size", "12px")
      .attr("dy", "10px")
      .html(d => {
        let content = "<tspan x='0' dy='1.2em'>" + d.label + "</tspan>";
        if(d.ipv4) content += "<tspan x='0' dy='1.2em'>" + d.ipv4 + "</tspan>";
        if(d.platform) content += "<tspan x='0' dy='1.2em'>" + d.platform + "</tspan>";
        return content;
      });

    function ticked() {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      nodeGroup.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
    }

    function drag(simulation) {
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    const zoomBehavior = d3.zoom().on("zoom", event => {
      container.attr("transform", event.transform);
    });
    svg.call(zoomBehavior);

    function resetView() {
      svg.transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity);
    }

    function refreshTopology() {
      vscode.postMessage({ command: "refreshTopology" });
    }

    function exportToDrawIO() {
      const currentNodes = simulation.nodes();
      vscode.postMessage({
        command: "exportDrawIO",
        topologyData: {
          nodes: currentNodes,
          links: topology.links
        }
      });
    }

    function showTooltip(event, d) {
      d3.select("#tooltip").remove();
      const tooltip = d3.select("body")
        .append("div")
        .attr("id", "tooltip")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px")
        .html(
          "<strong>Interface Information:</strong> " + (d.interfaceInfo || "N/A") + "<br>" +
          "<strong>Management Address:</strong> " + (d.mgmtAddress || "N/A") + "<br>" +
          "<strong>Physical Location:</strong> " + (d.physicalLocation || "N/A") + "<br>" +
          "<strong>Version and Holdtime:</strong> " + ((d.version || "") + " " + (d.holdtime || "")).trim()
        );
      tooltip.append("button").text("Close").on("click", () => tooltip.remove());
    }

    window.addEventListener("message", event => {
      const message = event.data;
      if (message.command === "updateTopology") {
        topology = message.topology;
        simulation.nodes(topology.nodes);
        simulation.force("link").links(topology.links);
        simulation.alpha(1).restart();
        const uLink = container.select(".links")
          .selectAll("line")
          .data(topology.links, d => d.source.id + "-" + d.target.id);
        uLink.join(
          enter => enter.append("line").attr("stroke", "#ffffff").attr("stroke-width", 2),
          update => update,
          exit => exit.remove()
        );
        const uNodeGroup = container.select(".nodes")
          .selectAll("g")
          .data(topology.nodes, d => d.id);
        uNodeGroup.join(
          enter => {
            const g = enter.append("g").call(drag(simulation)).on("click", (event, d) => { showTooltip(event, d); });
            g.append("image")
              .attr("xlink:href", d => getIconForNode(d))
              .attr("width", 40)
              .attr("height", 40)
              .attr("x", -20)
              .attr("y", -40);
            g.append("text")
              .attr("text-anchor", "middle")
              .attr("fill", "#ffffff")
              .attr("font-size", "12px")
              .attr("dy", "10px")
              .html(d => {
                let content = "<tspan x='0' dy='1.2em'>" + d.label + "</tspan>";
                if(d.ipv4) content += "<tspan x='0' dy='1.2em'>" + d.ipv4 + "</tspan>";
                if(d.platform) content += "<tspan x='0' dy='1.2em'>" + d.platform + "</tspan>";
                return content;
              });
            return g;
          },
          update => update,
          exit => exit.remove()
        );
      }
    });
  </script>
</body>
</html>`;
}
// END Topology WebView Function using D3JS library


// BEGIN .gitignore function to ignore "net-commander/" folder
async function updateGitIgnore(workspaceRoot: vscode.Uri) {
  const gitignoreUri = vscode.Uri.joinPath(workspaceRoot, '.gitignore');
  try {
    const gitignoreData = await vscode.workspace.fs.readFile(gitignoreUri);
    let gitignoreContent = Buffer.from(gitignoreData).toString('utf8');
    const ignoreEntry = "net-commander";
    if (!gitignoreContent.includes(ignoreEntry)) {
      gitignoreContent += "\n" + ignoreEntry + "\n";
      await vscode.workspace.fs.writeFile(gitignoreUri, Buffer.from(gitignoreContent));
    }
  } catch { }
}
// END .gitignore function to ignore "net-commander/" folder


// BEGIN Topology WebView Function adding controls
export async function openTopologyViewer(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }
  const workspaceRoot = workspaceFolders[0].uri;
  const topologyFolderUri = vscode.Uri.joinPath(workspaceRoot, 'net-commander', 'topology-viewer');
  try {
    await vscode.workspace.fs.createDirectory(topologyFolderUri);
  } catch { }
  await updateGitIgnore(workspaceRoot);
  const files = await getAllTxtFiles(topologyFolderUri);
  const topology = await buildTopologyFromFiles(files);
  const panel = vscode.window.createWebviewPanel(
    'topologyViewer',
    'Topology Viewer',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );
  // iconBaseUri is used in the webview for display; export uses file reading.
  const iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'topologyviewer');
  const iconBaseUri = panel.webview.asWebviewUri(iconPath).toString();
  panel.webview.html = getTopologyWebviewContent(topology, iconBaseUri);
  
  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'refreshTopology') {
      const newFiles = await getAllTxtFiles(topologyFolderUri);
      const newTopology = await buildTopologyFromFiles(newFiles);
      panel.webview.postMessage({ command: 'updateTopology', topology: newTopology });
    } else if (message.command === 'exportDrawIO') {
      const data = message.topologyData;
      if (!data || !data.nodes || !data.links) {
        vscode.window.showErrorMessage("No topology data received for export.");
        return;
      }
      
      // Read the draw.io predefined template file.
      // You are free to change this template if you would like with your company logo or including other informations.
      const templateUri = vscode.Uri.joinPath(
        context.extensionUri,
        "resources",
        "topologyviewer",
        "drawio",
        "a3-template.drawio"
      );
      let templateXml: string;
      try {
        const templateBytes = await vscode.workspace.fs.readFile(templateUri);
        templateXml = Buffer.from(templateBytes).toString("utf8");
      } catch (err: any) {
        vscode.window.showErrorMessage("Failed to read template: " + err.message);
        return;
      }
      
      // Read the icon files and convert them to base64 data URIs
      const switchIconUri = vscode.Uri.joinPath(context.extensionUri, 'resources', 'topologyviewer', 'icon-ciscoswitch.png');
      const nexusIconUri = vscode.Uri.joinPath(context.extensionUri, 'resources', 'topologyviewer', 'icon-cisconexus.png');
      let switchIconData: Uint8Array;
      let nexusIconData: Uint8Array;
      try {
        switchIconData = await vscode.workspace.fs.readFile(switchIconUri);
        nexusIconData = await vscode.workspace.fs.readFile(nexusIconUri);
      } catch (err: any) {
        vscode.window.showErrorMessage("Failed to read icon files: " + err.message);
        return;
      }
      const switchIconBase64 = Buffer.from(switchIconData).toString('base64');
      const nexusIconBase64 = Buffer.from(nexusIconData).toString('base64');
      const switchIconDataUri = `data:image/png,${switchIconBase64}`;
      const nexusIconDataUri = `data:image/png,${nexusIconBase64}`;
      
      // Calculate offsets to center the topology in the target region
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      data.nodes.forEach((n: any) => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      });
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // Use the region provided in your basic template
      const regionX = 20, regionY = 60, regionWidth = 1620, regionHeight = 1060;
      const regionCenterX = regionX + regionWidth / 2;
      const regionCenterY = regionY + regionHeight / 2;
      const offsetX = regionCenterX - centerX;
      const offsetY = regionCenterY - centerY;
      
      // Build draw.io XML fragments for nodes and edges
      let nodeCells = "";
      data.nodes.forEach((node: any, index: number) => {
        const nodeId = "node" + index;
        // Adjust y coordinate so that the icon appears above its label (subtracting 40)
        const x = node.x + offsetX;
        const y = (node.y - 40) + offsetY;
        let labelText = node.label || "";
        if (node.ipv4) { labelText += "<br>" + node.ipv4; }
        if (node.platform) { labelText += "<br>" + node.platform; }
        const safeLabel = xmlEscapeKeepBr(labelText);
        const isN9k = node.platform && node.platform.toLowerCase().includes("n9k");
        const iconDataUri = isN9k ? nexusIconDataUri : switchIconDataUri;
        nodeCells += `
          <mxCell id="${nodeId}" value="${safeLabel}" vertex="1" parent="1"
          style="shape=image;aspect=fixed;image=${xmlEscape(iconDataUri)};verticalLabelPosition=bottom;verticalAlign=top;fontColor=#000000;html=1;">
            <mxGeometry x="${x}" y="${y}" width="40" height="40" as="geometry"/>
          </mxCell>
          `;
      });
      let edgeCells = "";
      data.links.forEach((link: any, index: number) => {
        const sourceIndex = data.nodes.findIndex((n: any) =>
          typeof link.source === "string" ? n.id === link.source : n.id === link.source.id
        );
        const targetIndex = data.nodes.findIndex((n: any) =>
          typeof link.target === "string" ? n.id === link.target : n.id === link.target.id
        );
        if (sourceIndex >= 0 && targetIndex >= 0) {
          edgeCells += `
          <mxCell id="edge${index}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;"
          edge="1" parent="1" source="node${sourceIndex}" target="node${targetIndex}">
            <mxGeometry relative="1" as="geometry"/>
          </mxCell>
          `;
        }
      });
      
      // Insert the node and edge cells before the closing </root> tag
      const closingRootIndex = templateXml.indexOf('</root>');
      if (closingRootIndex === -1) {
        vscode.window.showErrorMessage("Template is missing closing </root> tag.");
        return;
      }
      const topologyXml = nodeCells + edgeCells;
      const finalXml = templateXml.slice(0, closingRootIndex) + topologyXml + templateXml.slice(closingRootIndex);
      
      const drawioFolderUri = vscode.Uri.joinPath(workspaceRoot, "net-commander", "drawio");
      try {
        await vscode.workspace.fs.createDirectory(drawioFolderUri);
      } catch { }
      const gitignoreUri = vscode.Uri.joinPath(workspaceRoot, ".gitignore");
      try {
        const gitignoreData = await vscode.workspace.fs.readFile(gitignoreUri);
        let gitignoreContent = Buffer.from(gitignoreData).toString("utf8");
        if (!gitignoreContent.includes("net-commander/")) {
          gitignoreContent += "\nnet-commander/\n";
          await vscode.workspace.fs.writeFile(gitignoreUri, Buffer.from(gitignoreContent, "utf8"));
        }
      } catch { }
      const now = new Date();
      // Format all parts with leading zeros where needed
      const yyyy = String(now.getFullYear());
      const mm   = String(now.getMonth() + 1).padStart(2, '0');
      const dd   = String(now.getDate()).padStart(2, '0');
      const hh   = String(now.getHours()).padStart(2, '0');
      const min  = String(now.getMinutes()).padStart(2, '0');

      // e.g. "net-commander_topology_20250412_1643.drawio"
      const filename = `net-commander_topology_${yyyy}${mm}${dd}_${hh}${min}.drawio`;

      const fileUri = vscode.Uri.joinPath(drawioFolderUri, filename);

      try {
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(finalXml, "utf8"));
        vscode.window.showInformationMessage("Exported topology to: " + filename);
        const doc = await vscode.workspace.openTextDocument(fileUri);
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      } catch (err: any) {
        vscode.window.showErrorMessage("Failed to save export file: " + err.message);
      }
    }
  });
}
// END Topology WebView Function adding controls