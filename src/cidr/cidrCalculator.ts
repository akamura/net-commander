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

// src/cidr/cidrCalculator.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';


// =========================================================================
// EXPORT functions
// =========================================================================

// BEGIN CIDR Calculator Function
export function openCidrCalculator() {
  const column = vscode.ViewColumn.Beside;

  const panel = vscode.window.createWebviewPanel(
    'cidrCalculator',
    'CIDR Calculator',
    { viewColumn: column, preserveFocus: false },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );
  panel.webview.html = getWebviewContent();

  // I listen for messages received from the webview
  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === 'saveCalc') {
      const csvContent = message.result;
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage("No workspace folder is open. Please open a folder or a workspace to save calculations.");
        return;
      }
      const workspaceRoot = folders[0].uri;
      // Create folder in user project directory named: net-commander/cidr-calc
      const calcFolderUri = vscode.Uri.joinPath(workspaceRoot, 'net-commander', 'cidr-calc');
      try {
        await vscode.workspace.fs.createDirectory(calcFolderUri);
      } catch (error) {
        // Directory may already exist.
      }
      // Generate file name: net-commander-CIDR-calc-DAYMONTHYEAR-HOUR-MINUTE.csv
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const fileName = `net-commander-CIDR-calc-${day}${month}${year}-${hour}-${minute}.csv`;
      const fileUri = vscode.Uri.joinPath(calcFolderUri, fileName);
      // CSV header including comment column.
      const csvHeader = "Input,Network Address,Broadcast Address,Subnet Mask,First Host,Last Host,Usable Host Count,Extra Info,Comment\n";
      let currentContent = '';
      try {
        const data = await vscode.workspace.fs.readFile(fileUri);
        currentContent = data.toString() + "\n";
      } catch (error) {
        // File doesn't exist; use header.
        currentContent = csvHeader;
      }
      const newContent = currentContent + csvContent + "\n";
      try {
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(newContent));
        vscode.window.showInformationMessage(`Calculation saved to ${fileUri.fsPath}`);
      } catch (error: any) {
        vscode.window.showErrorMessage(`Error saving calculation: ${error.message}`);
      }
      
      // To avoid sharing sensitive informations I update .gitignore to ignore "net-commander/" folder.
      const gitignoreUri = vscode.Uri.joinPath(workspaceRoot, '.gitignore');
      try {
        const gitignoreData = await vscode.workspace.fs.readFile(gitignoreUri);
        let gitignoreContent = gitignoreData.toString();
        const ignoreEntry = "net-commander/";
        if (!gitignoreContent.includes(ignoreEntry)) {
          gitignoreContent += "\n" + ignoreEntry + "\n";
          await vscode.workspace.fs.writeFile(gitignoreUri, Buffer.from(gitignoreContent));
          vscode.window.showInformationMessage("Updated .gitignore to exclude net-commander/ folder.");
        }
      } catch (error) {
      // If .gitignore doesn't exist, ignore.
      }
    }
  });
}
// END CIDR Calculator Function


// BEGIN CIDR Calculator WebView Function
function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CIDR Calculator</title>
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
<body>
  <h1>CIDR Calculator</h1>
  <div class="info">
    💡 Please remember to save your calculations before leaving this tab otherwise history will reset.
  </div>
  <p>The calculator allows you to perform subnetting, supernetting, or simulate additional hosts (What‑If Simulation). Calculations can be saved along with your comments.</p>
  
  <!-- Summary Table -->
  <h2>Summary Table</h2>
  <table>
    <thead>
      <tr>
        <th>Address Block</th>
        <th>Present Use</th>
        <th>Reference</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>0.0.0.0/8</td>
        <td>"This" Network</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3" target="_blank">RFC 1122, Section 3.2.1.3</a></td>
      </tr>
      <tr>
        <td>10.0.0.0/8</td>
        <td>Private-Use Networks</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">RFC 1918</a></td>
      </tr>
      <tr>
        <td>127.0.0.0/8</td>
        <td>Loopback</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3" target="_blank">RFC 1122, Section 3.2.1.3</a></td>
      </tr>
      <tr>
        <td>169.254.0.0/16</td>
        <td>Link Local</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc3927" target="_blank">RFC 3927</a></td>
      </tr>
      <tr>
        <td>172.16.0.0/12</td>
        <td>Private-Use Networks</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">RFC 1918</a></td>
      </tr>
      <tr>
        <td>192.0.0.0/24</td>
        <td>IETF Protocol Assignments</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc5736" target="_blank">RFC 5736</a></td>
      </tr>
      <tr>
        <td>192.0.2.0/24</td>
        <td>TEST-NET-1</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">RFC 5737</a></td>
      </tr>
      <tr>
        <td>192.88.99.0/24</td>
        <td>6to4 Relay Anycast</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc3068" target="_blank">RFC 3068</a></td>
      </tr>
      <tr>
        <td>192.168.0.0/16</td>
        <td>Private-Use Networks</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">RFC 1918</a></td>
      </tr>
      <tr>
        <td>198.18.0.0/15</td>
        <td>Network Interconnect Device Benchmark Testing</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc2544" target="_blank">RFC 2544</a></td>
      </tr>
      <tr>
        <td>198.51.100.0/24</td>
        <td>TEST-NET-2</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">RFC 5737</a></td>
      </tr>
      <tr>
        <td>203.0.113.0/24</td>
        <td>TEST-NET-3</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">RFC 5737</a></td>
      </tr>
      <tr>
        <td>224.0.0.0/4</td>
        <td>Multicast</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc3171" target="_blank">RFC 3171</a></td>
      </tr>
      <tr>
        <td>240.0.0.0/4</td>
        <td>Reserved for Future Use</td>
        <td><a href="https://datatracker.ietf.org/doc/html/rfc1112#section-4" target="_blank">RFC 1112, Section 4</a></td>
      </tr>
      <tr>
        <td>255.255.255.255/32</td>
        <td>Limited Broadcast</td>
        <td>
          <a href="https://datatracker.ietf.org/doc/html/rfc0919#section-7" target="_blank">RFC 919, Section 7</a><br>
          <a href="https://datatracker.ietf.org/doc/html/rfc0922#section-7" target="_blank">RFC 922, Section 7</a>
        </td>
      </tr>
    </tbody>
  </table>
  <p>For more details, please visit the <a href="https://datatracker.ietf.org/doc/html/rfc5735" target="_blank">IETF RFC 5735</a> page.</p>
  
  <!-- CIDR Calculator -->
  <h1>Calculator</h1>
  <input type="text" id="cidrInput" placeholder="192.168.1.0/24" />
  
  <h3>Select Mode</h3>
  <select id="calcMode" onchange="toggleExtraInputs()">
    <option value="subnet">Subnetting</option>
    <option value="supernet">Supernetting</option>
    <option value="whatif">What‑If Simulation</option>
  </select>
  
  <div id="whatifOptions">
    <p>Additional hosts to simulate:</p>
    <input type="number" id="additionalHosts" placeholder="e.g., 50" />
  </div>
  
  <div id="supernetOptions">
    <p>Number of contiguous networks to merge:</p>
    <input type="number" id="numNetworks" placeholder="e.g., 4" />
  </div>
  
  <h3>Optional Comment</h3>
  <textarea id="calcComment" placeholder="Enter your comment here..."></textarea>
  
  <div id="calc-commands">
    <button onclick="calculate()">Calculate</button>
    <button id="clearHistoryBtn" onclick="clearHistory()">Clear History</button>
    <button onclick="saveCalculation()">Save Calculation</button>
  </div>

  <!-- CIDR Results -->
  <div id="result"></div>
  <div id="history">
    <h1>History</h1>
  </div>
  <script>
    // Global array to hold CSV lines.
    let calcHistory = [];

    function toggleExtraInputs() {
      const mode = document.getElementById('calcMode').value;
      document.getElementById('whatifOptions').style.display = (mode === 'whatif') ? 'block' : 'none';
      document.getElementById('supernetOptions').style.display = (mode === 'supernet') ? 'block' : 'none';
    }
    
    function calculate() {
      const input = document.getElementById('cidrInput').value.trim();
      if (!input) {
        alert('Please enter a CIDR value.');
        return;
      }
      const parts = input.split('/');
      if (parts.length !== 2) {
        alert('Invalid format. Use IP/CIDR notation.');
        return;
      }
      const ip = parts[0].trim();
      const mask = parseInt(parts[1].trim());
      if (isNaN(mask) || mask < 0 || mask > 32) {
        alert('Invalid mask. Must be between 0 and 32.');
        return;
      }
      const ipParts = ip.split('.').map(n => parseInt(n, 10));
      if (ipParts.length !== 4 || ipParts.some(isNaN)) {
        alert('Invalid IP address.');
        return;
      }
      
      // Basic IPv4 calculation.
      const ipNum = ipParts.reduce((acc, part) => (acc << 8) | part, 0) >>> 0;
      const netmask = mask === 0 ? 0 : (0xFFFFFFFF << (32 - mask)) >>> 0;
      const network = ipNum & netmask;
      const broadcast = network | (~netmask >>> 0);
      const firstHost = mask < 31 ? network + 1 : network;
      const lastHost = mask < 31 ? broadcast - 1 : broadcast;
      const usableHosts = mask <= 30 ? (lastHost - firstHost + 1) : 0;
      
      const mode = document.getElementById('calcMode').value;
      let extraInfoHTML = '';
      let extraMessage = '';
      let extraCSV = "";
      if (mode === 'whatif') {
        const extraHosts = parseInt(document.getElementById('additionalHosts').value, 10) || 0;
        const required = usableHosts + extraHosts + 2; // network + broadcast
        const newBits = Math.ceil(Math.log2(required));
        const recommendedMask = 32 - newBits;
        extraInfoHTML = \`<tr><th>Extra Hosts</th><td>\${extraHosts}</td></tr>
          <tr><th>Recommended Mask</th><td>\${recommendedMask}</td></tr>\`;
        extraMessage = \`<h3 style="color: #FF6600;">If you need \${extraHosts} extra hosts, you should change the subnet to /\${recommendedMask}</h3>\`;
        extraCSV = \`\${extraHosts},\${recommendedMask}\`;
      } else if (mode === 'supernet') {
        const numNetworks = parseInt(document.getElementById('numNetworks').value, 10) || 1;
        const reduction = Math.ceil(Math.log2(numNetworks));
        const recommendedMask = Math.max(0, mask - reduction);
        extraInfoHTML = \`<tr><th>Networks to Merge</th><td>\${numNetworks}</td></tr>
          <tr><th>Recommended Supernet Mask</th><td>\${recommendedMask}</td></tr>\`;
        extraCSV = \`\${numNetworks},\${recommendedMask}\`;
      } else {
        extraCSV = ",";
      }
      
      function numToIp(num) {
        return [
          (num >>> 24) & 0xFF,
          (num >>> 16) & 0xFF,
          (num >>> 8) & 0xFF,
          num & 0xFF
        ].join('.');
      }
      
      const networkAddress = numToIp(network);
      const broadcastAddress = numToIp(broadcast);
      const subnetMaskStr = numToIp(netmask) + " (" + mask + ")";
      const firstHostStr = numToIp(firstHost);
      const lastHostStr = numToIp(lastHost);
      
      // Determine recommended limits and produce warning if the provided mask is too small.
      let rfcInfo = "";
      const a = ipParts[0], b = ipParts[1], c = ipParts[2];
      if (a === 0) {
        if (mask < 8) {
          rfcInfo = \`<div class="info">💡 Warning: For 0.0.0.0/8 ("This" Network), RFC 1122 recommends a /8 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 10) {
        if (mask < 8) {
          rfcInfo = \`<div class="info">💡 Warning: For 10.0.0.0/8 (Private-Use Networks), RFC 1918 recommends a /8 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 127) {
        if (mask < 8) {
          rfcInfo = \`<div class="info">💡 Warning: For 127.0.0.0/8 (Loopback), RFC 1122 recommends a /8 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 169 && b === 254) {
        if (mask < 16) {
          rfcInfo = \`<div class="info">💡 Warning: For 169.254.0.0/16 (Link Local), RFC 3927 recommends a /16 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc3927" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 172 && b >= 16 && b <= 31) {
        if (mask < 12) {
          rfcInfo = \`<div class="info">💡 Warning: For 172.16.0.0/12 (Private-Use Networks), RFC 1918 recommends a /12 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 192 && b === 0 && c === 0) {
        if (mask < 24) {
          rfcInfo = \`<div class="info">💡 Warning: For 192.0.0.0/24 (IETF Protocol Assignments), RFC 5736 recommends a /24 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc5736" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 192 && b === 0 && c === 2) {
        if (mask < 24) {
          rfcInfo = \`<div class="info">💡 Warning: For 192.0.2.0/24 (TEST-NET-1), RFC 5737 recommends a /24 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 192 && b === 88 && c === 99) {
        if (mask < 24) {
          rfcInfo = \`<div class="info">💡 Warning: For 192.88.99.0/24 (6to4 Relay Anycast), RFC 3068 recommends a /24 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc3068" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 192 && b === 168) {
        if (mask < 16) {
          rfcInfo = \`<div class="info">💡 Warning: For 192.168.0.0/16 (Private-Use Networks), RFC 1918 recommends a /16 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 198 && (b === 18 || b === 19)) {
        if (mask < 15) {
          rfcInfo = \`<div class="info">💡 Warning: For 198.18.0.0/15 (Network Interconnect Device Benchmark Testing), RFC 2544 recommends a /15 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc2544" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 198 && b === 51 && c === 100) {
        if (mask < 24) {
          rfcInfo = \`<div class="info">💡 Warning: For 198.51.100.0/24 (TEST-NET-2), RFC 5737 recommends a /24 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a === 203 && b === 0 && c === 113) {
        if (mask < 24) {
          rfcInfo = \`<div class="info">💡 Warning: For 203.0.113.0/24 (TEST-NET-3), RFC 5737 recommends a /24 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a >= 224 && a < 240) {
        if (mask < 4) {
          rfcInfo = \`<div class="info">💡 Warning: For 224.0.0.0/4 (Multicast), RFC 3171 recommends a /4 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc3171" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (a >= 240 && a < 255) {
        if (mask < 4) {
          rfcInfo = \`<div class="info">💡 Warning: For 240.0.0.0/4 (Reserved for Future Use), RFC 1112 recommends a /4 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1112#section-4" target="_blank">Learn more</a>.</div>\`;
        }
      } else if (ip === "255.255.255.255") {
        rfcInfo = \`<div class="info">💡 This IP is 255.255.255.255/32 (Limited Broadcast). See <a href="https://datatracker.ietf.org/doc/html/rfc0919#section-7" target="_blank">RFC 919, Section 7</a> and <a href="https://datatracker.ietf.org/doc/html/rfc0922#section-7" target="_blank">RFC 922, Section 7</a>.</div>\`;
      }
      
      // Build CSV line (escape commas in comment).
      const comment = document.getElementById('calcComment').value.replace(/,/g, " ");
      const csvLine = \`\${input},\${networkAddress},\${broadcastAddress},\${subnetMaskStr},\${firstHostStr},\${lastHostStr},\${usableHosts},\${extraCSV},\${comment}\`;
      
      const resultHTML = \`
        <h2>Results for \${input}</h2>
        \${extraMessage}
        \${rfcInfo}
        <table>
          <tr><th>Network Address</th><td>\${networkAddress}</td></tr>
          <tr><th>Broadcast Address</th><td>\${broadcastAddress}</td></tr>
          <tr><th>Subnet Mask</th><td>\${subnetMaskStr}</td></tr>
          <tr><th>First Host</th><td>\${firstHostStr}</td></tr>
          <tr><th>Last Host</th><td>\${lastHostStr}</td></tr>
          <tr><th>Usable Host Count</th><td>\${usableHosts}</td></tr>
          <tr><th>Comment</th><td>\${comment}</td></tr>
          \${extraInfoHTML}
        </table>
      \`;
      
      document.getElementById('result').innerHTML = resultHTML;
      
      // Append result to history and store CSV line.
      const historyDiv = document.getElementById('history');
      const entry = document.createElement('div');
      entry.className = 'calc-entry';
      entry.innerHTML = resultHTML;
      historyDiv.appendChild(entry);
      
      // Save CSV line in global history array.
      calcHistory.push(csvLine);
      
      // Clear comment input for next calculation.
      document.getElementById('calcComment').value = "";
      
      // Show history and clear button if there's at least one entry.
      if (historyDiv.childElementCount > 1) {
        historyDiv.style.display = 'block';
        document.getElementById('clearHistoryBtn').style.display = 'inline-block';
      }
    }
    
    function clearHistory() {
      const historyDiv = document.getElementById('history');
      historyDiv.innerHTML = '<h1>History</h1>';
      historyDiv.style.display = 'none';
      document.getElementById('clearHistoryBtn').style.display = 'none';
      calcHistory = [];
    }
    
    function saveCalculation() {
      if (calcHistory.length === 0) {
        alert('Nothing to save!');
        return;
      }
      const csvContent = calcHistory.join("\\n");
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ command: 'saveCalc', result: csvContent });
    }
  </script>
</body>
</html>`;
}
// END CIDR Calculator WebView Function