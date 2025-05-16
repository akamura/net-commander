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

// media/module-ipinfo/main.js

window.addEventListener('DOMContentLoaded', () => {
  const jsonElement = document.getElementById('ipinfo-json');
  const resultDiv = document.getElementById('ipinfo-result');
  if (!jsonElement || !resultDiv) return;

  const data = JSON.parse(jsonElement.textContent || '{}');
  const excludeKeys = ['asn', 'company', 'privacy', 'abuse', 'domains', 'tokenDetails'];

  function renderTable(title, rowsHtml) {
    return `<h2>${title}</h2><vscode-table zebra bordered-rows><vscode-table-header slot="header">
      <vscode-table-header-cell>Field</vscode-table-header-cell>
      <vscode-table-header-cell>Value</vscode-table-header-cell>
    </vscode-table-header><vscode-table-body slot="body">${rowsHtml}</vscode-table-body></vscode-table>`;
  }

  function makeRows(obj) {
    return Object.entries(obj)
      .map(([k, v]) => `<vscode-table-row><vscode-table-cell>${k}</vscode-table-cell><vscode-table-cell>${v}</vscode-table-cell></vscode-table-row>`)
      .join('');
  }

  let html = renderTable('General Info',
    makeRows(Object.fromEntries(Object.entries(data).filter(([k]) => !excludeKeys.includes(k))))
  );

  if (data.asn) {
    const { prefixes, prefixes6, ...asnMain } = data.asn;
    html += renderTable('ASN Info', makeRows(asnMain));

    if (Array.isArray(prefixes)) {
      prefixes.forEach((p, i) => {
        html += renderTable(`IPv4 Prefix #${i + 1}`, makeRows(p));
      });
    }
    if (Array.isArray(prefixes6)) {
      prefixes6.forEach((p, i) => {
        html += renderTable(`IPv6 Prefix #${i + 1}`, makeRows(p));
      });
    }
  }

  html += `<p>💡 More data available via <a href="https://ipinfo.io/pricing" target="_blank">IPinfo Plans</a>.</p>`;
  resultDiv.innerHTML = html;
});

window.addEventListener('DOMContentLoaded', () => {
    const jsonElement = document.getElementById('ipinfo-json');
    const resultDiv = document.getElementById('ipinfo-result');
    if (!jsonElement || !resultDiv) return;
  
    const data = JSON.parse(jsonElement.textContent || '{}');
    const exclude = ['asn', 'company', 'privacy', 'abuse', 'domains', 'tokenDetails'];
  
    const makeRows = obj =>
      Object.entries(obj)
        .map(([k, v]) => `<vscode-table-row>
          <vscode-table-cell>${k}</vscode-table-cell>
          <vscode-table-cell>${v}</vscode-table-cell>
        </vscode-table-row>`)
        .join('');
  
    const renderTable = (title, content) => `
      <h2>${title}</h2>
      <vscode-table zebra bordered-rows>
        <vscode-table-header slot="header">
          <vscode-table-header-cell>Field</vscode-table-header-cell>
          <vscode-table-header-cell>Value</vscode-table-header-cell>
        </vscode-table-header>
        <vscode-table-body slot="body">
          ${content}
        </vscode-table-body>
      </vscode-table>`;
  
    let html = renderTable('General Info', makeRows(
      Object.fromEntries(Object.entries(data).filter(([k]) => !exclude.includes(k)))
    ));
  
    if (data.asn) {
      const { prefixes, prefixes6, ...main } = data.asn;
      html += renderTable('ASN Info', makeRows(main));
  
      if (Array.isArray(prefixes)) {
        prefixes.forEach((p, i) => html += renderTable(`IPv4 Prefix #${i + 1}`, makeRows(p)));
      }
      if (Array.isArray(prefixes6)) {
        prefixes6.forEach((p, i) => html += renderTable(`IPv6 Prefix #${i + 1}`, makeRows(p)));
      }
    }
  
    html += `<p>💡 More data available via <a href="https://ipinfo.io/pricing" target="_blank">IPinfo Plans</a>.</p>`;
    resultDiv.innerHTML = html;
  });