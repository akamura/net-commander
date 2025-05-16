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

// media/module-cidrcalculator/main.js


// Global array to hold CSV lines.
let calcHistory = [];


// run once when the webview DOM is ready
window.addEventListener('DOMContentLoaded', () => {

    document.getElementById('calculateBtn').addEventListener('click', calculate);
    document.getElementById('saveBtn'     ).addEventListener('click', saveCalculation);
    document.getElementById('clearBtn'    ).addEventListener('click', clearHistory);
  
    const modeSelect = document.getElementById('calcMode');
    modeSelect.addEventListener('change', toggleExtraInputs);
  
    toggleExtraInputs();
  });
  

  function toggleExtraInputs() {
    const mode = document.getElementById('calcMode').value;
    document.getElementById('whatifOptions').style.display   = (mode === 'whatif') ? 'block' : 'none';
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
  const mask = parseInt(parts[1].trim(), 10);
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
  let extraCSV = '';

  if (mode === 'whatif') {
    const extraHosts = parseInt(document.getElementById('additionalHosts').value, 10) || 0;
    const required = usableHosts + extraHosts + 2; // network + broadcast
    const newBits = Math.ceil(Math.log2(required));
    const recommendedMask = 32 - newBits;
    extraInfoHTML = `
      <vscode-table-row><vscode-table-cell>Extra Hosts</vscode-table-cell><vscode-table-cell>${extraHosts}</vscode-table-cell></vscode-table-row>
      <vscode-table-row><vscode-table-cell>Recommended Mask</vscode-table-cell><vscode-table-cell>/${recommendedMask}</vscode-table-cell></vscode-table-row>
    `;
    extraMessage = `<vscode-badge variant="tab-header-counter">If you need ${extraHosts} extra hosts, use /${recommendedMask}</vscode-badge>`;
    extraCSV = `${extraHosts},${recommendedMask}`;
  } else if (mode === 'supernet') {
    const numNetworks = parseInt(document.getElementById('numNetworks').value, 10) || 1;
    const reduction = Math.ceil(Math.log2(numNetworks));
    const recommendedMask = Math.max(0, mask - reduction);
    extraInfoHTML = `
      <vscode-table-row><vscode-table-cell>Networks to Merge</vscode-table-cell><vscode-table-cell>${numNetworks}</vscode-table-cell></vscode-table-row>
      <vscode-table-row><vscode-table-cell>Recommended Supernet Mask</vscode-table-cell><vscode-table-cell>/${recommendedMask}</vscode-table-cell></vscode-table-row>
    `;
    extraCSV = `${numNetworks},${recommendedMask}`;
  } else {
    extraCSV = ',';
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
  const subnetMaskStr = `${numToIp(netmask)} (${mask})`;
  const firstHostStr = numToIp(firstHost);
  const lastHostStr = numToIp(lastHost);

  // Determine recommended limits and produce warning if the provided mask is too small.
  let rfcInfo = '';
  const [a, b, c] = ipParts;
  if (a === 0) {
    if (mask < 8) {
      rfcInfo = `<div class="info">💡 Warning: For 0.0.0.0/8 ("This" Network), RFC 1122 recommends a /8 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 10) {
    if (mask < 8) {
      rfcInfo = `<div class="info">💡 Warning: For 10.0.0.0/8 (Private-Use Networks), RFC 1918 recommends a /8 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 127) {
    if (mask < 8) {
      rfcInfo = `<div class="info">💡 Warning: For 127.0.0.0/8 (Loopback), RFC 1122 recommends a /8 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 169 && b === 254) {
    if (mask < 16) {
      rfcInfo = `<div class="info">💡 Warning: For 169.254.0.0/16 (Link Local), RFC 3927 recommends a /16 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc3927" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 172 && b >= 16 && b <= 31) {
    if (mask < 12) {
      rfcInfo = `<div class="info">💡 Warning: For 172.16.0.0/12 (Private-Use Networks), RFC 1918 recommends a /12 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 192 && b === 0 && c === 0) {
    if (mask < 24) {
      rfcInfo = `<div class="info">💡 Warning: For 192.0.0.0/24 (IETF Protocol Assignments), RFC 5736 recommends a /24 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc5736" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 192 && b === 0 && c === 2) {
    if (mask < 24) {
      rfcInfo = `<div class="info">💡 Warning: For 192.0.2.0/24 (TEST-NET-1), RFC 5737 recommends a /24 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 192 && b === 88 && c === 99) {
    if (mask < 24) {
      rfcInfo = `<div class="info">💡 Warning: For 192.88.99.0/24 (6to4 Relay Anycast), RFC 3068 recommends a /24 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc3068" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 192 && b === 168) {
    if (mask < 16) {
      rfcInfo = `<div class="info">💡 Warning: For 192.168.0.0/16 (Private-Use Networks), RFC 1918 recommends a /16 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 198 && (b === 18 || b === 19)) {
    if (mask < 15) {
      rfcInfo = `<div class="info">💡 Warning: For 198.18.0.0/15 (Network Interconnect Device Benchmark Testing), RFC 2544 recommends a /15 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc2544" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 198 && b === 51 && c === 100) {
    if (mask < 24) {
      rfcInfo = `<div class="info">💡 Warning: For 198.51.100.0/24 (TEST-NET-2), RFC 5737 recommends a /24 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a === 203 && b === 0 && c === 113) {
    if (mask < 24) {
      rfcInfo = `<div class="info">💡 Warning: For 203.0.113.0/24 (TEST-NET-3), RFC 5737 recommends a /24 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a >= 224 && a < 240) {
    if (mask < 4) {
      rfcInfo = `<div class="info">💡 Warning: For 224.0.0.0/4 (Multicast), RFC 3171 recommends a /4 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc3171" target="_blank">Learn more</a>.</div>`;
    }
  } else if (a >= 240 && a < 255) {
    if (mask < 4) {
      rfcInfo = `<div class="info">💡 Warning: For 240.0.0.0/4 (Reserved for Future Use), RFC 1112 recommends a /4 subnet. <a href="https://datatracker.ietf.org/doc/html/rfc1112#section-4" target="_blank">Learn more</a>.</div>`;
    }
  } else if (ip === '255.255.255.255') {
    rfcInfo = `<div class="info">💡 This IP is 255.255.255.255/32 (Limited Broadcast). See <a href="https://datatracker.ietf.org/doc/html/rfc0919#section-7" target="_blank">RFC 919</a> and <a href="https://datatracker.ietf.org/doc/html/rfc0922#section-7" target="_blank">RFC 922</a>.</div>`;
  }

  // Build CSV line (escape commas in comment).
  const comment = document.getElementById('calcComment').value.replace(/,/g, ' ');
  const csvLine = `${input},${networkAddress},${broadcastAddress},${subnetMaskStr},${firstHostStr},${lastHostStr},${usableHosts},${extraCSV},${comment}`;

  const resultHTML = `
    <h3>${input}</h3>
    ${extraMessage}
    ${rfcInfo}
    <vscode-table zebra bordered-rows>
        <vscode-table-body slot="body">
            <vscode-table-row>
                <vscode-table-cell>Network Address</vscode-table-cell>
                <vscode-table-cell>${networkAddress}</vscode-table-cell>
            </vscode-table-row>
            <vscode-table-row>
                <vscode-table-cell>Broadcast Address</vscode-table-cell>
                <vscode-table-cell>${broadcastAddress}</vscode-table-cell>
            </vscode-table-row>
            <vscode-table-row>
                <vscode-table-cell>Subnet Mask</vscode-table-cell>
                <vscode-table-cell>${subnetMaskStr}</vscode-table-cell>
            </vscode-table-row>
            <vscode-table-row>
                <vscode-table-cell>First Host</vscode-table-cell>
                <vscode-table-cell>${firstHostStr}</vscode-table-cell>
            </vscode-table-row>
            <vscode-table-row>
                <vscode-table-cell>Last Host</vscode-table-cell>
                <vscode-table-cell>${lastHostStr}</vscode-table-cell>
            </vscode-table-row>
            <vscode-table-row>
                <vscode-table-cell>Usable Host Count</vscode-table-cell>
                <vscode-table-cell>${usableHosts}</vscode-table-cell>
            </vscode-table-row>
            <vscode-table-row>
                <vscode-table-cell>Comment</vscode-table-cell>
                <vscode-table-cell>${comment}</vscode-table-cell>
            </vscode-table-row>  
            ${extraInfoHTML}
        </vscode-table-body>
    </vscode-table zebra>
  `;

  document.getElementById('result').innerHTML = resultHTML;

  // Append result to history and store CSV line.
  const historyDiv = document.getElementById('history');
  const entry = document.createElement('div');
  entry.className = 'calc-entry';
  entry.innerHTML = resultHTML;
  historyDiv.insertBefore(entry, historyDiv.children[1]);

  calcHistory.push(csvLine);
  document.getElementById('calcComment').value = '';

  if (historyDiv.childElementCount > 1) {
    historyDiv.style.display = 'block';
    document.getElementById('clearHistoryBtn').style.display = 'inline-block';
  }
}

function clearHistory() {
  const historyDiv = document.getElementById('history');
  historyDiv.innerHTML = '<h2>History</h2>';
  historyDiv.style.display = 'none';
  document.getElementById('clearHistoryBtn').style.display = 'none';
  calcHistory = [];
}

function saveCalculation() {
  if (calcHistory.length === 0) {
    alert('Nothing to save!');
    return;
  }
  const csvContent = calcHistory.join('\n');
  const vscode = acquireVsCodeApi();
  vscode.postMessage({ command: 'saveCalc', result: csvContent });
}
