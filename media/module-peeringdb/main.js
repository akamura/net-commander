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

// media/module-peeringdb/main.js
 
const vscode = acquireVsCodeApi();
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('lookupBtn')?.addEventListener('click', lookup);
  });
  

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
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
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
    let html = '<vscode-table zebra bordered-rows><vscode-table-header slot="header"><vscode-table-header-cell>Property</vscode-table-header-cell><vscode-table-header-cell>Value</vscode-table-header-cell></vscode-table-header><vscode-table-body>';
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (isEmpty(value) || typeof value === 'object') continue;
        let displayVal = String(value);
        displayVal = convertSpeed(key, displayVal);
        displayVal = makeClickableLinks(displayVal);
        html += '<vscode-table-row>';
        html += '<vscode-table-cell>' + key + '</vscode-table-cell>';
        html += '<vscode-table-cell>' + displayVal + '</vscode-table-cell>';
        html += '</vscode-table-row>';
      }
    }
    html += '</vscode-table-body></vscode-table>';
    return html;
  }
  

// Format an object recursively for nested objects.
function formatNestedObject(key, obj) {
  let html = '<h3>' + key + '</h3>';
  html += formatBasicTable(obj);
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