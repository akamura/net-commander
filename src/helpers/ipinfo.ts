/***************************************************************************
 *   Extension:   Net Commander                                            *
 *   Version:     0.0.2                                                    *
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

// src/helpers/ipinfo.ts

// =========================================================================
// EXPORT functions
// =========================================================================
// BEGIN getipinfo function
export function getIpInfoHtml(data: any, ip: string): string {
    // Build general IP info table rows (exclude keys that hold objects)
    const excludeKeys = ['asn', 'company', 'privacy', 'abuse', 'domains', 'tokenDetails'];
    let generalRows = '';
    for (const key in data) {
      if (data.hasOwnProperty(key) && !excludeKeys.includes(key)) {
        generalRows += `<tr>
          <td style="font-weight: bold;">${key}</td>
          <td>${data[key]}</td>
        </tr>`;
      }
    }
  
    // Build ASN main table rows if ASN exists
    let asnMainRows = '';
    let asnPrefixesRows = '';
    let asnPrefixes6Rows = '';
    if (data.asn) {
      // For ASN main info, exclude "prefixes" and "prefixes6"
      for (const key in data.asn) {
        if (data.asn.hasOwnProperty(key) && key !== 'prefixes' && key !== 'prefixes6') {
          asnMainRows += `<tr>
            <td style="font-weight: bold;">${key}</td>
            <td>${data.asn[key]}</td>
          </tr>`;
        }
      }
      // For IPv4 prefixes
      if (data.asn.prefixes && Array.isArray(data.asn.prefixes)) {
        data.asn.prefixes.forEach((prefix: any) => {
          let row = '';
          for (const key in prefix) {
            if (prefix.hasOwnProperty(key)) {
              row += `<tr>
                <td style="font-weight: bold;">${key}</td>
                <td>${prefix[key]}</td>
              </tr>`;
            }
          }
          asnPrefixesRows += row;
        });
      }
      // For IPv6 prefixes
      if (data.asn.prefixes6 && Array.isArray(data.asn.prefixes6)) {
        data.asn.prefixes6.forEach((prefix6: any) => {
          let row = '';
          for (const key in prefix6) {
            if (prefix6.hasOwnProperty(key)) {
              row += `<tr>
                <td style="font-weight: bold;">${key}</td>
                <td>${prefix6[key]}</td>
              </tr>`;
            }
          }
          asnPrefixes6Rows += row;
        });
      }
    }
// END getipinfo function


// BEGIN Topology WebView
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>IP Info: ${ip}</title>
    <style>
      body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
      h1 { color: #859CA6; }
      h2 { color: #859CA6; margin-top: 40px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #3f3f3f; padding: 8px; text-align: left; }
      th { background-color: #3f3f3f; color: #cccccc; }
      tbody tr:nth-child(odd) { background-color: #222426; }
      a { color: #B6D6F2; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>IP Information for ${ip}</h1>
    <table>
      <thead>
        <tr>
          <th>Field</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${generalRows}
      </tbody>
    </table>
    ${
      data.asn
        ? `<h2>ASN</h2>
    <table>
      <thead>
        <tr>
          <th>Field</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${asnMainRows}
      </tbody>
    </table>
    ${
      asnPrefixesRows
        ? `<h2>IPv4 Prefixes</h2>
    <table>
      <thead>
        <tr>
          <th>Field</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${asnPrefixesRows}
      </tbody>
    </table>`
        : ''
    }
    ${
      asnPrefixes6Rows
        ? `<h2>IPv6 Prefixes</h2>
    <table>
      <thead>
        <tr>
          <th>Field</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${asnPrefixes6Rows}
      </tbody>
    </table>`
        : ''
    }`
        : ''
    }
    <p>Depending on your plan you could get access to more informations please take a look at <a href="https://ipinfo.io/pricing" target="_blank">IPinfo Plans</a> page.</p>
  </body>
  </html>`;
  }
// END Topology WebView