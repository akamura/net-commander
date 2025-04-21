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

// src/peeringdb/peeringDB.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';


// =========================================================================
// EXPORT functions
// =========================================================================
// BEGIN PeeringDB function
export function openPeeringDB() {
  const column = vscode.ViewColumn.Beside;

  const panel = vscode.window.createWebviewPanel(
    'peeringDB',
    'PeeringDB Lookup',
    { viewColumn: column, preserveFocus: false },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getPeeringDBWebviewContent();
  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'lookupPeeringDB') {
      const asn = message.asn;
      try {
        // First query: search by ASN.
        const searchResponse = await fetch(`https://www.peeringdb.com/api/net?asn=${encodeURIComponent(asn)}`);
        if (!searchResponse.ok) {
          throw new Error(`PeeringDB API returned: ${searchResponse.status}`);
        }
        const searchJson = (await searchResponse.json()) as any;
        if (!searchJson.data || searchJson.data.length === 0) {
          throw new Error(`No records found for ASN ${asn}`);
        }
        // Use the first record's id.
        const initialRecord = searchJson.data[0];
        const id = initialRecord.id;

        // Second query: detailed data.
        const detailResponse = await fetch(`https://www.peeringdb.com/api/net/${id}`);
        if (!detailResponse.ok) {
          throw new Error(`PeeringDB detail API returned: ${detailResponse.status}`);
        }
        const detailJson = (await detailResponse.json()) as any;
        // Assume detailed data is in detailJson.data[0]
        const detailedRecord = detailJson.data && detailJson.data.length > 0 ? detailJson.data[0] : null;
        if (!detailedRecord) {
          throw new Error(`No detailed record found for id ${id}`);
        }

        panel.webview.postMessage({
          command: 'displayResults',
          initial: initialRecord,
          details: detailedRecord
        });
      } catch (error: any) {
        panel.webview.postMessage({ command: 'error', message: error.message });
      }
    }
  });
}
// END PeeringDB function


// BEGIN Topology WebView Function
function getPeeringDBWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PeeringDB Lookup</title>
  <style>
    body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
    h1 { color: #859CA6; border-bottom: 1px solid #3f3f3f; }
    h2 { color: #859CA6; margin-top: 40px; }
    h3 { color: #859CA6; margin-top: 40px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #3f3f3f; padding: 8px; text-align: left; vertical-align: top; }
    th { background-color: #3f3f3f; color: #cccccc; }
    tbody tr:nth-child(odd) { background-color: #222426; }
    a { color: #B6D6F2; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>PeeringDB Lookup</h1>
  <p>Please search the Autonomous System below by searching only the number for example for AS3356 (Lumen) search 3356. If you don't know the Organization ASN please search it in <a href="https://asrank.caida.org/" target="_blank">CAIDA's portal</a></p>
  <input type="text" id="asnInput" placeholder="Enter ASN" />
  <button onclick="lookup()">Lookup</button>
  <div id="results"></div>
  <script>
    const vscode = acquireVsCodeApi();

    function lookup() {
      const asn = document.getElementById('asnInput').value.trim();
      if (!asn) {
        alert('Please enter an ASN.');
        return;
      }
      document.getElementById('results').innerHTML = '<p>Searching...</p>';
      vscode.postMessage({ command: 'lookupPeeringDB', asn: asn });
    }
    
    // Convert URLs in text to clickable links.
    function makeClickableLinks(text) {
      return text.replace(/(https?:\\/\\/[^\\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    }
    
    // Convert speed (in Mbps) to Gbps.
    function convertSpeed(key, value) {
      if (key.toLowerCase().includes("speed") && !isNaN(Number(value))) {
        const gbps = Number(value) / 1000;
        return (gbps % 1 === 0 ? gbps : gbps.toFixed(2)) + " Gbps";
      }
      return value;
    }
    
    // Check if value is empty.
    function isEmpty(value) {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string' && value.trim() === "") return true;
      if (Array.isArray(value) && value.length === 0) return true;
      if (typeof value === 'object' && Object.keys(value).length === 0) return true;
      return false;
    }
    
    // Format an object’s primitive properties in a table.
    function formatBasicTable(obj) {
      let html = '<table><thead><tr><th>Property</th><th>Value</th></tr></thead><tbody>';
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (isEmpty(value) || typeof value === 'object') continue;
          let displayVal = String(value);
          displayVal = convertSpeed(key, displayVal);
          displayVal = makeClickableLinks(displayVal);
          html += '<tr><td>' + key + '</td><td>' + displayVal + '</td></tr>';
        }
      }
      html += '</tbody></table>';
      return html;
    }
    
    // Format an object recursively for nested objects.
    function formatNestedObject(key, obj) {
      let html = '<h3>' + key + '</h3>';
      html += formatBasicTable(obj);
      // For nested objects, iterate and create separate tables.
      for (const subKey in obj) {
        if (obj.hasOwnProperty(subKey)) {
          const subVal = obj[subKey];
          if (!isEmpty(subVal) && typeof subVal === 'object' && !Array.isArray(subVal)) {
            html += formatNestedObject(subKey, subVal);
          }
        }
      }
      return html;
    }
    
    // Format an array. If elements are objects, render each as its own table.
    function formatArray(key, arr) {
      let html = '<h3>' + key + '</h3>';
      arr.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          html += '<h4>Record ' + (index + 1) + '</h4>';
          html += formatBasicTable(item);
          // Also check for nested objects within each record.
          for (const subKey in item) {
            if (item.hasOwnProperty(subKey)) {
              const subVal = item[subKey];
              if (!isEmpty(subVal) && typeof subVal === 'object' && !Array.isArray(subVal)) {
                html += formatNestedObject(subKey, subVal);
              }
            }
          }
        } else {
          // For primitives, join them.
          html += '<p>' + makeClickableLinks(String(item)) + '</p>';
        }
      });
      return html;
    }
    
    // Build the full details view.
    function buildDetailsView(details) {
      let html = '';
      // Header: AS Name, Looking Glass, Website.
      const asName = details.name && !isEmpty(details.name) ? details.name : "Unknown ASN";
      html += '<h1>' + asName + '</h1>';
      if (details.looking_glass && !isEmpty(details.looking_glass)) {
        html += '<p>Looking Glass: <a href="' + details.looking_glass + '" target="_blank">' + details.looking_glass + '</a></p>';
      }
      if (details.website && !isEmpty(details.website)) {
        html += '<p>Website: <a href="' + details.website + '" target="_blank">' + details.website + '</a></p>';
      }
      
      // Basic Info: keys that are primitives.
      html += '<h2>Basic Information</h2>';
      html += formatBasicTable(details);
      
      // For each key that is an object or array, render separately.
      for (const key in details) {
        if (details.hasOwnProperty(key)) {
          const value = details[key];
          if (isEmpty(value)) continue;
          if (typeof value === 'object') {
            if (Array.isArray(value)) {
              // Only render if array is non-empty.
              if (value.length > 0) {
                html += formatArray(key, value);
              }
            } else {
              html += formatNestedObject(key, value);
            }
          }
        }
      }
      
      return html;
    }
    
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'displayResults') {
        const details = message.details;
        const html = buildDetailsView(details);
        document.getElementById('results').innerHTML = html;
      } else if (message.command === 'error') {
        document.getElementById('results').innerHTML = '<p style="color:red;">Error: ' + message.message + '</p>';
      }
    });
  </script>
</body>
</html>`;
}
// END Topology WebView Function

export function deactivate() {}