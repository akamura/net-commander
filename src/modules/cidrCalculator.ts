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

// src/modules/cidrCalculator.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';  
import { getNonce } from '../helpers/nonce';
import { exportCsv } from '../helpers/exporter';

// =========================================================================
// EXPORT functions
// =========================================================================

// BEGIN CIDR Calculator Function
export function openCidrCalculator(context: vscode.ExtensionContext) {
  const column = vscode.ViewColumn.Beside;

  const panel = vscode.window.createWebviewPanel(
    'cidrCalculator',
    'CIDR Calculator',
    column,                       // ← use the “Beside” column here
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media', 'libs'),
        vscode.Uri.joinPath(context.extensionUri, 'media', 'common'),
        vscode.Uri.joinPath(context.extensionUri, 'media', 'module-cidrcalculator')
      ]
    }
  );

  const nonce     = getNonce();
  const cspSource = panel.webview.cspSource;
  const elementsUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'libs', 'vscode-elements', 'bundled.js')
  );
  const commonStyleUri = panel.webview.asWebviewUri(
          vscode.Uri.joinPath(context.extensionUri, 'media', 'common', 'css', 'style.css')
  );    
  const styleUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'module-cidrcalculator', 'style.css')
  );
  const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'module-cidrcalculator', 'main.js')
  );


  panel.webview.html = showWebviewContent(
    nonce,
    cspSource,
    elementsUri.toString(),
    commonStyleUri.toString(),
    styleUri.toString(),
    scriptUri.toString()
  );

  // I listen for messages received from the webview
  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === 'saveCalc') {
      await exportCsv(
        'cidr-calculator',
        'net-commander-CIDR-calc',
        message.result,
        'Input,Network Address,Broadcast Address,Subnet Mask,First Host,Last Host,Usable Host Count,Extra Info,Comment\n'
      );
    }
  });
  
}
// END CIDR Calculator Function

 
// BEGIN CIDR Calculator WebView Function
function showWebviewContent(
  nonce: string,
  cspSource: string,
  elementsSrc: string,
  commonstyleSrc: string,
  styleSrc: string,
  scriptSrc: string
): string {
  return `<!DOCTYPE html>
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; script-src 'nonce-${nonce}' ${cspSource}; style-src 'unsafe-inline' ${cspSource}; font-src ${cspSource} https: data:;">
  
  <!-- vscode-elements/elements bundle.js -->
  <script type="module" nonce="${nonce}" src="${elementsSrc}"></script> 
  <link rel="stylesheet" href="${commonstyleSrc}" type="text/css" />
  <link rel="stylesheet" href="${styleSrc}" type="text/css"/>
</head>
<body>
  <div class="layout">
    <div class="top-bar">
      <h1>CIDR Calculator</h1>
    </div>

    <!-- HEADER ROW -->
    <div class="header">
      <div class="section info-block-left">
        <!-- CIDR Calculator -->
        <h2>Calculator</h2>
        <vscode-form-container responsive="true">
          <vscode-label for="cidrInput">Insert your CIDR</vscode-label>
          <vscode-textfield id="cidrInput" placeholder="192.168.1.0/24"></vscode-textfield>

          <vscode-label for="calcMode">Select calculation mode</vscode-label>
          <vscode-single-select id="calcMode" name="calcMode" position="below">
            <vscode-option value="subnet">Subnetting</vscode-option>
            <vscode-option value="supernet">Supernetting</vscode-option>
            <vscode-option value="whatif">CIDR Simulation</vscode-option>
          </vscode-single-select>

          <div id="whatifOptions" style="display:none;">
            <vscode-label for="additionalHosts">Simulate additional hosts</vscode-label>
            <vscode-textfield id="additionalHosts" placeholder="e.g., 50"></vscode-textfield>
          </div>
          <div id="supernetOptions" style="display:none;">
            <vscode-label for="numNetworks">Networks to merge</vscode-label>
            <vscode-textfield id="numNetworks" placeholder="e.g., 4"></vscode-textfield>
          </div>

          <vscode-label for="calcComment">Add a comment</vscode-label>
          <vscode-textarea id="calcComment" placeholder="Your notes…"></vscode-textarea>

          <vscode-form-group id="calc-commands">
            <vscode-button id="calculateBtn">Calculate</vscode-button>
            <vscode-button id="saveBtn">Save Calculation</vscode-button>
            <vscode-button id="clearBtn" secondary>Clear History</vscode-button>
          </vscode-form-group>

          <vscode-form-helper>
            <p>💡 Please remember to save your calculations before leaving this tab otherwise history will reset.</p>
          </vscode-form-helper>
        </vscode-form-container>
      </div>

      <div class="section info-block-right">
        <h2>Summary Table</h2>
          <vscode-table zebra bordered-rows>
            <vscode-table-header slot="header">
              <vscode-table-header-cell>Address Block</vscode-table-header-cell>
              <vscode-table-header-cell>Present Use</vscode-table-header-cell>
              <vscode-table-header-cell>Reference</vscode-table-header-cell>
            </vscode-table-header>
            <vscode-table-body slot="body">
              <vscode-table-row>
                <vscode-table-cell>0.0.0.0/8</vscode-table-cell>
                <vscode-table-cell>"This" Network</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3" target="_blank">
                    RFC 1122
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>10.0.0.0/8</vscode-table-cell>
                <vscode-table-cell>Private-Use Networks</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">
                    RFC 1918
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>127.0.0.0/8</vscode-table-cell>
                <vscode-table-cell>Loopback</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3" target="_blank">
                    RFC 1122
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>169.254.0.0/16</vscode-table-cell>
                <vscode-table-cell>Link Local</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc3927" target="_blank">
                    RFC 3927
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>172.16.0.0/12</vscode-table-cell>
                <vscode-table-cell>Private-Use Networks</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">
                    RFC 1918
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>192.0.0.0/24</vscode-table-cell>
                <vscode-table-cell>IETF Protocol Assignments</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc5736" target="_blank">
                    RFC 5736
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>192.0.2.0/24</vscode-table-cell>
                <vscode-table-cell>TEST-NET-1</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">
                    RFC 5737
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>192.88.99.0/24</vscode-table-cell>
                <vscode-table-cell>6to4 Relay Anycast</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc3068" target="_blank">
                    RFC 3068
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>192.168.0.0/16</vscode-table-cell>
                <vscode-table-cell>Private-Use Networks</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">
                    RFC 1918
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>198.18.0.0/15</vscode-table-cell>
                <vscode-table-cell>Network Interconnect Device Benchmark Testing</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc2544" target="_blank">
                    RFC 2544
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>198.51.100.0/24</vscode-table-cell>
                <vscode-table-cell>TEST-NET-2</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">
                    RFC 5737
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>203.0.113.0/24</vscode-table-cell>
                <vscode-table-cell>TEST-NET-3</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">
                    RFC 5737
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>224.0.0.0/4</vscode-table-cell>
                <vscode-table-cell>Multicast</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc3171" target="_blank">
                    RFC 3171
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>240.0.0.0/4</vscode-table-cell>
                <vscode-table-cell>Reserved for Future Use</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc1112#section-4" target="_blank">
                    RFC 1112
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
              <vscode-table-row>
                <vscode-table-cell>255.255.255.255/32</vscode-table-cell>
                <vscode-table-cell>Limited Broadcast</vscode-table-cell>
                <vscode-table-cell>
                  <a href="https://datatracker.ietf.org/doc/html/rfc0919#section-7" target="_blank">
                    RFC 919
                  </a><br>
                  <a href="https://datatracker.ietf.org/doc/html/rfc0922#section-7" target="_blank">
                    RFC 922
                  </a>
                </vscode-table-cell>
              </vscode-table-row>
            </vscode-table-body>
          </vscode-table>
        <p>For more details, please visit the <a href="https://datatracker.ietf.org/doc/html/rfc5735" target="_blank">IETF RFC 5735</a> page.</p>
      </div>
    </div>

    <div class="bottom-grid">
      <div class="result-panel">
        <h2>Results</h2>
        <div id="result"></div>
      </div>

      <div id="history" class="history-panel">
        <h2>History</h2>
      </div>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptSrc}"></script>
</body>
</html>`;
}
// END CIDR Calculator WebView Function