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

// src/helpers/rfcs.ts

// =========================================================================
// EXPORT functions
// =========================================================================
function getRfcData(ip: string): { label: string; description: string } {
    const parts = ip.split('.').map(n => parseInt(n, 10));
    if (parts.length !== 4 || parts.some(isNaN)) {
      return {
        label: `Invalid IP`,
        description: `The IP address ${ip} is not valid.`
      };
    }
    const [a, b, c, d] = parts;
    if (a === 0) {
      return {
        label: `This Network`,
        description: `Addresses in the 0.0.0.0/8 block refer to source hosts on "this" network. 0.0.0.0/32 may be used as a source address for this host; other addresses refer to specified hosts on this network. (RFC 1122, Section 3.2.1.3)`
      };
    }
    if (a === 10) {
      return {
        label: `Private-Use Networks`,
        description: `The 10.0.0.0/8 block is reserved for private networks. Its intended use is documented in RFC 1918. Addresses in this block do not appear on the public Internet.`
      };
    }
    if (a === 127) {
      return {
        label: `Loopback`,
        description: `The 127.0.0.0/8 block is reserved for loopback addresses. Typically, only 127.0.0.1 is used for loopback. (RFC 1122, Section 3.2.1.3)`
      };
    }
    if (a === 169 && b === 254) {
      return {
        label: `Link Local`,
        description: `The 169.254.0.0/16 block is used for link-local addresses, usually assigned when DHCP is unavailable. (RFC 3927)`
      };
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return {
        label: `Private-Use Networks`,
        description: `The 172.16.0.0/12 block is reserved for private networks, as documented in RFC 1918. These addresses do not appear on the public Internet.`
      };
    }
    if (a === 192 && b === 0 && c === 0) {
      return {
        label: `IETF Protocol Assignments`,
        description: `The 192.0.0.0/24 block is reserved for IETF protocol assignments. (RFC 5736)`
      };
    }
    if (a === 192 && b === 0 && c === 2) {
      return {
        label: `TEST-NET-1`,
        description: `The 192.0.2.0/24 block is designated for use in documentation and examples, and does not appear on the public Internet. (RFC 5737)`
      };
    }
    if (a === 192 && b === 88 && c === 99) {
      return {
        label: `6to4 Relay Anycast`,
        description: `The 192.88.99.0/24 block is allocated for 6to4 relay anycast addresses. (RFC 3068)`
      };
    }
    if (a === 192 && b === 168) {
      return {
        label: `Private-Use Networks`,
        description: `The 192.168.0.0/16 block is reserved for private networks as per RFC 1918.`
      };
    }
    if (a === 198 && (b === 18 || b === 19)) {
      return {
        label: `Benchmark Testing`,
        description: `The 198.18.0.0/15 block is allocated for benchmark testing of network interconnect devices. (RFC 2544)`
      };
    }
    if (a === 198 && b === 51 && c === 100) {
      return {
        label: `TEST-NET-2`,
        description: `The 198.51.100.0/24 block is designated for use in documentation and examples. (RFC 5737)`
      };
    }
    if (a === 203 && b === 0 && c === 113) {
      return {
        label: `TEST-NET-3`,
        description: `The 203.0.113.0/24 block is designated for use in documentation and examples. (RFC 5737)`
      };
    }
    if (a >= 224 && a < 240) {
      return {
        label: `Multicast`,
        description: `The 224.0.0.0/4 block is allocated for multicast addresses. (RFC 3171)`
      };
    }
    if (a >= 240 && a < 255) {
      return {
        label: `Reserved for Future Use`,
        description: `The 240.0.0.0/4 block is reserved for future use. (RFC 1112, Section 4)`
      };
    }
    if (ip === '255.255.255.255') {
      return {
        label: `Limited Broadcast`,
        description: `The 255.255.255.255/32 address is reserved for limited broadcast. (RFC 919, Section 7 and RFC 922, Section 7)`
      };
    }
    return {
      label: `Public IP`,
      description: `The IP address ${ip} is a public IP address that does not belong to any reserved range.`
    };
  }
  
// BEGIN Topology WebView Function
  export function getRfcHtml(ip: string): string {
    const data = getRfcData(ip);
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>RFC Summary for ${ip}</title>
    <style>
      body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
      h1 { color: #859CA6; }
      h2 { color: #859CA6; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #3f3f3f; padding: 8px; text-align: left; }
      th { background-color:#3f3f3f; color: #cccccc; }
      /* Color odd rows in the table body */
      tbody tr:nth-child(odd) { background-color:#222426; }
      a { color: #B6D6F2; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>${ip} - ${data.label}</h1>
    <p>${data.description}</p>
    <h2>Summary Table</h2>
    <table>
      <thead>
        <tr>
          <th>Address Block</th>
          <th>Present Use</th>
          <th>Reference</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>0.0.0.0/8</td>
          <td>"This" Network</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3" target="_blank">RFC 1122, Section 3.2.1.3</a></td>
        </tr>
        <tr>
          <td>10.0.0.0/8</td>
          <td>Private-Use Networks</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">RFC 1918</a></td>
        </tr>
        <tr>
          <td>127.0.0.0/8</td>
          <td>Loopback</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.3" target="_blank">RFC 1122, Section 3.2.1.3</a></td>
        </tr>
        <tr>
          <td>169.254.0.0/16</td>
          <td>Link Local</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc3927" target="_blank">RFC 3927</a></td>
        </tr>
        <tr>
          <td>172.16.0.0/12</td>
          <td>Private-Use Networks</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">RFC 1918</a></td>
        </tr>
        <tr>
          <td>192.0.0.0/24</td>
          <td>IETF Protocol Assignments</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc5736" target="_blank">RFC 5736</a></td>
        </tr>
        <tr>
          <td>192.0.2.0/24</td>
          <td>TEST-NET-1</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">RFC 5737</a></td>
        </tr>
        <tr>
          <td>192.88.99.0/24</td>
          <td>6to4 Relay Anycast</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc3068" target="_blank">RFC 3068</a></td>
        </tr>
        <tr>
          <td>192.168.0.0/16</td>
          <td>Private-Use Networks</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc1918" target="_blank">RFC 1918</a></td>
        </tr>
        <tr>
          <td>198.18.0.0/15</td>
          <td>Network Interconnect Device Benchmark Testing</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc2544" target="_blank">RFC 2544</a></td>
        </tr>
        <tr>
          <td>198.51.100.0/24</td>
          <td>TEST-NET-2</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">RFC 5737</a></td>
        </tr>
        <tr>
          <td>203.0.113.0/24</td>
          <td>TEST-NET-3</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc5737" target="_blank">RFC 5737</a></td>
        </tr>
        <tr>
          <td>224.0.0.0/4</td>
          <td>Multicast</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc3171" target="_blank">RFC 3171</a></td>
        </tr>
        <tr>
          <td>240.0.0.0/4</td>
          <td>Reserved for Future Use</td>
          <td><a href="https://datatracker.ietf.org/doc/html/rfc1112#section-4" target="_blank">RFC 1112, Section 4</a></td>
        </tr>
        <tr>
          <td>255.255.255.255/32</td>
          <td>Limited Broadcast</td>
          <td>
            <a href="https://datatracker.ietf.org/doc/html/rfc0919#section-7" target="_blank">RFC 919, Section 7</a><br>
            <a href="https://datatracker.ietf.org/doc/html/rfc0922#section-7" target="_blank">RFC 922, Section 7</a>
          </td>
        </tr>
      </tbody>
    </table>
    <p>For more details, please visit the <a href="https://datatracker.ietf.org/doc/html/rfc5735" target="_blank">IETF RFC 5735</a> page.</p>
  </body>
  </html>`;
  }
// END Topology WebView Function