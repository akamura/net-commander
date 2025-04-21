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

// src/iana/ianaPortCalc.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';


// =========================================================================
// EXPORT functions
// =========================================================================
// BEGIN IANA calculator function
export async function openIanaPortCalculator() {
  const config = vscode.workspace.getConfiguration('netCommander');
  // Get the IANA CSV URL from settings. The user must update the URL in extension settings.
  const ianaCsvUrl = config.get<string>('ianaCsvUrl', 'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.csv');

  // Download the CSV from the URL.
  let csvContent = "";
  try {
    const response = await fetch(ianaCsvUrl);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    csvContent = await response.text();
  } catch (error: any) {
    vscode.window.showErrorMessage(`Error downloading IANA CSV: ${error.message}`);
    return;
  }

  // Save the CSV into the workspace at net-commander/ianadb/ianaportcalc.csv
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder is open. Please open a folder or a workspace to save IANA Database.");
    return;
  }
  const workspaceRoot = folders[0].uri;
  const ianaFolderUri = vscode.Uri.joinPath(workspaceRoot, 'net-commander', 'ianadb');
  try {
    await vscode.workspace.fs.createDirectory(ianaFolderUri);
  } catch (error) {
    // Folder may already exist.
  }
  const csvFileUri = vscode.Uri.joinPath(ianaFolderUri, 'ianaportcalc.csv');
  try {
    await vscode.workspace.fs.writeFile(csvFileUri, Buffer.from(csvContent, 'utf8'));
  } catch (error: any) {
    vscode.window.showErrorMessage(`Error saving IANA CSV: ${error.message}`);
    return;
  }

  // To avoid sharing junk in your repo I update .gitignore to ignore "net-commander/" folder.
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

  const column = vscode.ViewColumn.Beside;
  const panel = vscode.window.createWebviewPanel(
    'ianaPortCalc',
    'IANA Port Calculator',
    { viewColumn: column, preserveFocus: false },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );
  panel.webview.html = getIanaWebviewContent(csvContent);
}
// END IANA calculator function


// BEGIN Topology WebView Function
function getIanaWebviewContent(csvData: string): string {
  const escapedCsv = JSON.stringify(csvData);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>IANA Port Calculator</title>
  <style>
    body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
    h1 { color: #859CA6; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #3f3f3f; padding: 8px; text-align: left; }
    th { background-color: #3f3f3f; color: #cccccc; }
    tbody tr:nth-child(odd) { background-color: #222426; }
    input, button { font-size: 1em; padding: 5px; margin: 5px 0; }
    a { color: #B6D6F2; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>IANA Port Calculator</h1>
  <p>Search for a port number or keyword from the official IANA database. Please verify the CSV URL in your extension settings.</p>
  <input type="text" id="portInput" placeholder="e.g., 80 or http" />
  <button onclick="searchPort()">Search</button>
  <div id="result"></div>
  
  <script>
    // The CSV data passed from the extension.
    const csvData = ${escapedCsv};

    // Simple CSV parser: split by newline and comma.
    function parseCSV(csv) {
      const lines = csv.split('\\n').filter(line => line.trim() !== '');
      const headers = lines[0].split(',').map(h => h.trim());
      return lines.slice(1).map(line => {
        const values = line.split(',');
        let row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] ? values[index].trim() : "";
        });
        return row;
      });
    }

    const data = parseCSV(csvData);

    function searchPort() {
      const query = document.getElementById('portInput').value.trim().toLowerCase();
      if (!query) {
        alert('Please enter a search term.');
        return;
      }
      // Filter rows by checking every column.
      const results = data.filter(row => {
        return Object.values(row).some(value => value.toLowerCase().includes(query));
      });
      let html = "";
      if (results.length === 0) {
        html = "<p>No results found for '" + query + "'.</p>";
      } else {
        html += "<table><thead><tr>";
        const headers = Object.keys(results[0]);
        headers.forEach(header => {
          html += "<th>" + header + "</th>";
        });
        html += "</tr></thead><tbody>";
        results.forEach(row => {
          html += "<tr>";
          headers.forEach(header => {
            html += "<td>" + row[header] + "</td>";
          });
          html += "</tr>";
        });
        html += "</tbody></table>";
      }
      document.getElementById('result').innerHTML = html;
    }
  </script>
</body>
</html>`;
}
// END Topology WebView Function