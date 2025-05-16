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

// media/module-ianaportcalc/main.js

let data = [];

function parseCSV(csv) {
  const lines = csv.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i]?.trim() || "";
    });
    return row;
  });
}

function searchPort() {
  const query = document.getElementById('portInput').value.trim().toLowerCase();
  if (!query) {
    alert('Please enter a search term.');
    return;
  }

  const results = data.filter(row =>
    Object.values(row).some(val => val.toLowerCase().includes(query))
  );

  const resultDiv = document.getElementById('ianaresult');
  if (!results.length) {
    resultDiv.innerHTML = `<p>No results found for '${query}'.</p>`;
    return;
  }

  const headers = Object.keys(results[0]);
  let html = `<vscode-table zebra bordered-rows><vscode-table-header slot="header">${headers.map(h => `<vscode-table-header-cell>${h}</vscode-table-header-cell>`).join('')}</vscode-table-header slot="header"><vscode-table-body slot="body">`;
  results.forEach(row => {
    html += `<vscode-table-row>${headers.map(h => `<vscode-table-cell>${row[h]}</vscode-table-cell>`).join('')}</vscode-table-row>`;
  });
  html += `</vscode-table-body slot="body"></vscode-table zebra bordered-rows>`;
  resultDiv.innerHTML = html;
}

window.addEventListener('DOMContentLoaded', () => {
  const csvElement = document.getElementById('csv-data');
  if (csvElement) {
    data = parseCSV(csvElement.textContent);
  }

  document.getElementById('searchBtn')?.addEventListener('click', searchPort);
});
