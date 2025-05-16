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

// src/modules/ianaPortCalc.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import { getNonce } from '../helpers/nonce';
import { exportCsv } from '../helpers/exporter';


// =========================================================================
// EXPORT functions
// =========================================================================
export async function openIanaPortCalculator(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('netCommander');
  const ianaCsvUrl = config.get<string>(
    'ianaCsvUrl',
    'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.csv'
  );

  let csvContent = '';
  try {
    const response = await fetch(ianaCsvUrl);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    csvContent = await response.text();
  } catch (error: any) {
    vscode.window.showErrorMessage(`Error downloading IANA CSV: ${error.message}`);
    return;
  }
 
  await exportCsv('ianadb', 'ianaportcalc', csvContent);


// BEGIN function to generate user webview content
  const column = vscode.ViewColumn.Beside;
  const panel = vscode.window.createWebviewPanel(
    'ianaPortCalc',
    'IANA Port Calculator',
    column,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media', 'libs'),
        vscode.Uri.joinPath(context.extensionUri, 'media', 'common'),
        vscode.Uri.joinPath(context.extensionUri, 'media', 'module-ianaportcalc')
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
    vscode.Uri.joinPath(context.extensionUri, 'media', 'module-ianaportcalc', 'main.js')
  );

  panel.webview.html = showWebviewContent(
    nonce,
    cspSource,
    elementsUri.toString(),
    commonStyleUri.toString(),
    scriptUri.toString(),
    csvContent
  );
}

function showWebviewContent(
  nonce: string,
  cspSource: string,
  elementsSrc: string,
  commonstyleSrc: string,
  scriptSrc: string,
  rawCsv: string
): string {
  const escapedCsv = rawCsv.replace(/<\/script>/g, '<\\/script>');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; script-src 'nonce-${nonce}' ${cspSource}; style-src 'unsafe-inline' ${cspSource}; font-src ${cspSource} https: data:;">
  <script type="module" nonce="${nonce}" src="${elementsSrc}"></script>
  
  <link rel="stylesheet" href="${commonstyleSrc}" type="text/css" />
</head>
<body>
  <div class="layout">
    <div class="top-bar">
      <h1>IANA Port Calculator</h1>
    </div>

    <div class="header flex-row section-padding">
      <vscode-form-container responsive="true">
        <vscode-label for="portInput">Insert port number or service name</vscode-label>
        <vscode-textfield id="portInput" placeholder="e.g., 80 or http"></vscode-textfield>

        <vscode-form-group id="calc-commands">
          <vscode-button id="searchBtn">Search</vscode-button>
        </vscode-form-group>

        <vscode-form-helper>
          <p>💡 Search for a port number or keyword from the official IANA database. Please verify the CSV URL in your extension settings.</p>
        </vscode-form-helper>
      </vscode-form-container>
    </div>

    <div class="middle section-padding scrollable-y">
      <div id="ianaresult"></div>
    </div>
  </div>
  <script id="csv-data" type="text/csv" style="display: none;">${escapedCsv}</script>
  <script nonce="${nonce}" src="${scriptSrc}"></script>
</body>
</html>`;
}
// END function to generate user webview content