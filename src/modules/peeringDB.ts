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

// src/modules/peeringDB.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import { getNonce } from '../helpers/nonce';


// =========================================================================
// EXPORT functions
// =========================================================================

// BEGIN function to generate user webview content
export function openPeeringDB(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'peeringDB',
    'PeeringDB Lookup',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media', 'libs'),
        vscode.Uri.joinPath(context.extensionUri, 'media', 'common'),
        vscode.Uri.joinPath(context.extensionUri, 'media', 'module-peeringdb')
      ]
    }
  );

  const nonce = getNonce();
  const cspSource = panel.webview.cspSource;
  const elementsUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'libs', 'vscode-elements', 'bundled.js')
  ).toString();
  const commonStyleUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'common', 'css', 'style.css')
  ).toString();
  const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'module-peeringdb', 'main.js')
  ).toString();

  panel.webview.html = showWebviewContent({
    nonce,
    cspSource,
    elementsUri,
    commonStyleUri,
    scriptUri
  });

  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'lookupPeeringDB') {
      const asn = message.asn;
      try {
        const searchResponse = await fetch(`https://www.peeringdb.com/api/net?asn=${encodeURIComponent(asn)}`);
        if (!searchResponse.ok) throw new Error(`PeeringDB API returned: ${searchResponse.status}`);
        const searchJson = await searchResponse.json() as { data: any[] };


        if (!searchJson.data?.length) throw new Error(`No records found for ASN ${asn}`);

        const id = searchJson.data[0].id;
        const detailResponse = await fetch(`https://www.peeringdb.com/api/net/${id}`);
        if (!detailResponse.ok) throw new Error(`Detail fetch failed: ${detailResponse.status}`);
        const detailJson = await detailResponse.json() as { data: any[] };


        const detailedRecord = detailJson.data?.[0];
        if (!detailedRecord) throw new Error(`No detailed record for ID ${id}`);

        panel.webview.postMessage({ command: 'displayResults', initial: searchJson.data[0], details: detailedRecord });
      } catch (err: any) {
        panel.webview.postMessage({ command: 'error', message: err.message || String(err) });
      }
    }
  });
}

function showWebviewContent(opts: {
  nonce: string;
  cspSource: string;
  elementsUri: string;
  commonStyleUri: string;
  scriptUri: string;
}): string {
  const { nonce, cspSource, elementsUri, commonStyleUri, scriptUri } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${cspSource} 'unsafe-inline';
                 script-src 'nonce-${nonce}';
                 font-src ${cspSource} https: data:;
                 img-src https: data:;
                 connect-src https:;">
  <title>PeeringDB Lookup</title>
  <script type="module" nonce="${nonce}" src="${elementsUri}"></script>
  <link rel="stylesheet" href="${commonStyleUri}">
  <script nonce="${nonce}" src="${scriptUri}"></script>
</head>
<body>
  <div class="layout">
    <div class="top-bar"><h1>PeeringDB Lookup</h1></div>
      <div class="header flex-row section-padding">
        <vscode-form-container responsive="true">
          <vscode-label for="asnInput">Enter ASN number</vscode-label>
          <vscode-textfield id="asnInput" placeholder="e.g. 3356"></vscode-textfield>

          <vscode-form-group id="calc-commands">
            <vscode-button id="lookupBtn">Lookup</vscode-button>
          </vscode-form-group>

          <vscode-form-helper>
            <p>💡 Search an Autonomous System Number (ASN) like <strong>3356</strong> for Lumen. 
            If unknown, lookup on <a href="https://asrank.caida.org/" target="_blank">CAIDA ASRank</a>.</p>
          </vscode-form-helper>
        </vscode-form-container>
    </div>

    <div class="middle section-padding scrollable-y">
      <div id="results"></div>
    </div>
    </div>
  </div>
</body>
</html>`;
}
// END function to generate user webview content