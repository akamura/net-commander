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

// src/modules/ipinfo.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import { getNonce } from '../helpers/nonce';


// =========================================================================
// EXPORT functions
// =========================================================================

// BEGIN function to generate user webview content
export function openIpInfoPanel(context: vscode.ExtensionContext, data: any, ip: string): void {
  const column = vscode.ViewColumn.Beside;

  const panel = vscode.window.createWebviewPanel(
    'ipInfo',
    `IP Info: ${ip}`,
    column,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media', 'libs'),
        vscode.Uri.joinPath(context.extensionUri, 'media', 'common'),
        vscode.Uri.joinPath(context.extensionUri, 'media', 'module-ipinfo')
      ]
    }
  );

  const nonce = getNonce();
  const cspSource = panel.webview.cspSource;
  const elementsUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'libs', 'vscode-elements', 'bundled.js')
  );
  const commonStyleUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'common', 'css', 'style.css')
  );
  const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'module-ipinfo', 'main.js')
  );

  panel.webview.html = showWebviewContent(data, ip, {
    nonce,
    cspSource,
    elementsUri: elementsUri.toString(),
    commonStyleUri: commonStyleUri.toString(),
    scriptUri: scriptUri.toString()
  });
}

function showWebviewContent(data: any, ip: string, opts: {
  nonce: string;
  cspSource: string;
  elementsUri: string;
  commonStyleUri: string;
  scriptUri: string;
}): string {
  const { nonce, cspSource, elementsUri, commonStyleUri, scriptUri } = opts;

  const excludeKeys = ['asn', 'company', 'privacy', 'abuse', 'domains', 'tokenDetails'];
  const gen = Object.entries(data)
    .filter(([key]) => !excludeKeys.includes(key))
    .map(([key, val]) => `<tr><td><strong>${key}</strong></td><td>${val}</td></tr>`)
    .join('');

  let asnMain = '', asnV4 = '', asnV6 = '';

  if (data.asn) {
    asnMain = Object.entries(data.asn)
      .filter(([k]) => k !== 'prefixes' && k !== 'prefixes6')
      .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`)
      .join('');

      if (Array.isArray(data.asn.prefixes)) {
        data.asn.prefixes.forEach((prefix: Record<string, string>) => {
          let row = '';
          for (const key in prefix) {
            if (prefix.hasOwnProperty(key)) {
              row += `<tr><td><strong>${key}</strong></td><td>${prefix[key]}</td></tr>`;
            }
          }
          asnV4 += row;
        });
      }
      

      if (Array.isArray(data.asn.prefixes6)) {
        data.asn.prefixes6.forEach((prefix6: Record<string, string>) => {
          let row = '';
          for (const key in prefix6) {
            if (prefix6.hasOwnProperty(key)) {
              row += `<tr><td><strong>${key}</strong></td><td>${prefix6[key]}</td></tr>`;
            }
          }
          asnV6 += row;
        });
      }
      
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             img-src ${cspSource} https: data:;
             script-src 'nonce-${nonce}' ${cspSource};
             style-src 'unsafe-inline' ${cspSource};
             font-src ${cspSource} https: data:;">
  <script type="module" nonce="${nonce}" src="${elementsUri}"></script>
  <link rel="stylesheet" href="${commonStyleUri}" />
  <script nonce="${nonce}" src="${scriptUri}"></script>
</head>
<body>
  <div class="layout">
    <div class="top-bar">
      <h1>IP Information for ${ip}</h1>
    </div>
    <div class="middle section-padding">
      <div id="ipinfo-result"></div>
      <pre id="ipinfo-json" style="display: none;">${JSON.stringify(data)}</pre>
    </div>
  </div>
</body>
</html>`;
}
// END function to generate user webview content