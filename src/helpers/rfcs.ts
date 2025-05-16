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

// src/helpers/rfcs.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import { getNonce } from './nonce';


// =========================================================================
// EXPORT functions
// =========================================================================
interface RfcRow {
  block: string;
  usage: string;
  ref: string;
  href: string;
}

const rfcTableRows: RfcRow[] = [
  {
    block: '0.0.0.0/8',
    usage: '"This" Network',
    ref: 'RFC 1122',
    href: 'https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3'
  },
  {
    block: '10.0.0.0/8',
    usage: 'Private-Use Networks',
    ref: 'RFC 1918',
    href: 'https://datatracker.ietf.org/doc/html/rfc1918'
  },
  {
    block: '127.0.0.0/8',
    usage: 'Loopback',
    ref: 'RFC 1122',
    href: 'https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3'
  },
  {
    block: '169.254.0.0/16',
    usage: 'Link Local',
    ref: 'RFC 3927',
    href: 'https://datatracker.ietf.org/doc/html/rfc3927'
  },
  {
    block: '172.16.0.0/12',
    usage: 'Private-Use Networks',
    ref: 'RFC 1918',
    href: 'https://datatracker.ietf.org/doc/html/rfc1918'
  },
  {
    block: '192.0.0.0/24',
    usage: 'IETF Protocol Assignments',
    ref: 'RFC 5736',
    href: 'https://datatracker.ietf.org/doc/html/rfc5736'
  },
  {
    block: '192.0.2.0/24',
    usage: 'TEST-NET-1',
    ref: 'RFC 5737',
    href: 'https://datatracker.ietf.org/doc/html/rfc5737'
  },
  {
    block: '192.88.99.0/24',
    usage: '6to4 Relay Anycast',
    ref: 'RFC 3068',
    href: 'https://datatracker.ietf.org/doc/html/rfc3068'
  },
  {
    block: '192.168.0.0/16',
    usage: 'Private-Use Networks',
    ref: 'RFC 1918',
    href: 'https://datatracker.ietf.org/doc/html/rfc1918'
  },
  {
    block: '198.18.0.0/15',
    usage: 'Benchmark Testing',
    ref: 'RFC 2544',
    href: 'https://datatracker.ietf.org/doc/html/rfc2544'
  },
  {
    block: '198.51.100.0/24',
    usage: 'TEST-NET-2',
    ref: 'RFC 5737',
    href: 'https://datatracker.ietf.org/doc/html/rfc5737'
  },
  {
    block: '203.0.113.0/24',
    usage: 'TEST-NET-3',
    ref: 'RFC 5737',
    href: 'https://datatracker.ietf.org/doc/html/rfc5737'
  },
  {
    block: '224.0.0.0/4',
    usage: 'Multicast',
    ref: 'RFC 3171',
    href: 'https://datatracker.ietf.org/doc/html/rfc3171'
  },
  {
    block: '240.0.0.0/4',
    usage: 'Reserved for Future Use',
    ref: 'RFC 1112',
    href: 'https://datatracker.ietf.org/doc/html/rfc1112#section-4'
  },
  {
    block: '255.255.255.255/32',
    usage: 'Limited Broadcast',
    ref: 'RFC 919 + RFC 922',
    href: 'https://datatracker.ietf.org/doc/html/rfc0919#section-7'
  }
];

function getRfcData(ip: string): { label: string; description: string } {
  const parts = ip.split('.').map(n => parseInt(n, 10));
  if (parts.length !== 4 || parts.some(isNaN)) {
    return { label: `Invalid IP`, description: `The IP address ${ip} is not valid.` };
  }
  const [a, b, c] = parts;
  if (a === 0) return { label: `This Network`, description: `RFC 1122: 0.0.0.0/8 for local source hosts.` };
  if (a === 10) return { label: `Private-Use Networks`, description: `RFC 1918: 10.0.0.0/8 for private use.` };
  if (a === 127) return { label: `Loopback`, description: `RFC 1122: 127.0.0.0/8 reserved for loopback.` };
  if (a === 169 && b === 254) return { label: `Link Local`, description: `RFC 3927: 169.254.0.0/16 for link-local addressing.` };
  if (a === 172 && b >= 16 && b <= 31) return { label: `Private-Use Networks`, description: `RFC 1918: 172.16.0.0/12 private range.` };
  if (a === 192 && b === 0 && c === 0) return { label: `IETF Protocol Assignments`, description: `RFC 5736: 192.0.0.0/24 for protocol assignment.` };
  if (a === 192 && b === 0 && c === 2) return { label: `TEST-NET-1`, description: `RFC 5737: 192.0.2.0/24 for documentation.` };
  if (a === 192 && b === 88 && c === 99) return { label: `6to4 Relay Anycast`, description: `RFC 3068: 192.88.99.0/24.` };
  if (a === 192 && b === 168) return { label: `Private-Use Networks`, description: `RFC 1918: 192.168.0.0/16 for LANs.` };
  if (a === 198 && (b === 18 || b === 19)) return { label: `Benchmark Testing`, description: `RFC 2544: 198.18.0.0/15 for device testing.` };
  if (a === 198 && b === 51 && c === 100) return { label: `TEST-NET-2`, description: `RFC 5737: 198.51.100.0/24 for documentation.` };
  if (a === 203 && b === 0 && c === 113) return { label: `TEST-NET-3`, description: `RFC 5737: 203.0.113.0/24 for documentation.` };
  if (a >= 224 && a < 240) return { label: `Multicast`, description: `RFC 3171: 224.0.0.0/4 for multicast.` };
  if (a >= 240 && a < 255) return { label: `Reserved for Future Use`, description: `RFC 1112: 240.0.0.0/4 reserved.` };
  if (ip === '255.255.255.255') return { label: `Limited Broadcast`, description: `RFCs 919/922: 255.255.255.255 for broadcast.` };
  return { label: `Public IP`, description: `${ip} is not in any reserved range.` };
}


export function openRfcPanel(context: vscode.ExtensionContext, ip: string): void {
  const { label, description } = getRfcData(ip);
  const panel = vscode.window.createWebviewPanel('rfcInfo', `RFC Summary ▸ ${ip}`, vscode.ViewColumn.Beside, {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri, 'media', 'libs'),
      vscode.Uri.joinPath(context.extensionUri, 'media', 'common')
    ]
  });

  const nonce = getNonce();
  const csp = panel.webview.cspSource;
  const elementsUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'libs', 'vscode-elements', 'bundled.js')).toString();
  const commonCssUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'common', 'css', 'style.css')).toString();

  const tableRowsHtml = rfcTableRows.map((row: RfcRow) => `
    <vscode-table-row>
      <vscode-table-cell>${row.block}</vscode-table-cell>
      <vscode-table-cell>${row.usage}</vscode-table-cell>
      <vscode-table-cell><a href="${row.href}" target="_blank">${row.ref}</a></vscode-table-cell>
    </vscode-table-row>
  `).join('');

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${csp} https: data:;">
  <title>RFC Summary for ${ip}</title>
  <script type="module" nonce="${nonce}" src="${elementsUri}"></script>
  <link rel="stylesheet" href="${commonCssUri}">
</head>
<body>
  <div class="layout">
    <div class="top-bar"><h1>${ip} – ${label}</h1></div>
    <div class="middle section-padding">
      <p>${description}</p>
      <h2>Summary Table</h2>
      <vscode-table bordered-rows zebra>
        <vscode-table-header slot="header">
          <vscode-table-header-cell>Address Block</vscode-table-header-cell>
          <vscode-table-header-cell>Present Use</vscode-table-header-cell>
          <vscode-table-header-cell>Reference</vscode-table-header-cell>
        </vscode-table-header>
        <vscode-table-body slot="body">
          ${tableRowsHtml}
        </vscode-table-body>
      </vscode-table>
      <p>For more details, visit the <a href="https://datatracker.ietf.org/doc/html/rfc5735" target="_blank">IETF RFC 5735</a> page.</p>
    </div>
  </div>
</body>
</html>`;
}
