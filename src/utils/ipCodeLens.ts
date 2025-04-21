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

// src/utils/ipCodeLens.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';


// =========================================================================
// EXPORT functions
// =========================================================================
export interface MyCodeLens extends vscode.CodeLens {
  order: number;
  ip: string;
}


// BEGIN function to add lightbulb tooltip in editor above ip's
function getIpCategory(ip: string): { label: string } {
  const parts = ip.split('.').map(n => parseInt(n, 10));
  let baseLabel: string;
  if (parts.length !== 4 || parts.some(isNaN)) {
    baseLabel = `Invalid IP ${ip}`;
  } else {
    const [a, b, c] = parts;
    if (a === 0) {
      baseLabel = `This Network IP ${ip}`;
    } else if (a === 10) {
      baseLabel = `Private-Use Network IP ${ip}`;
    } else if (a === 127) {
      baseLabel = `Loopback IP ${ip}`;
    } else if (a === 169 && b === 254) {
      baseLabel = `Link Local IP ${ip}`;
    } else if (a === 172 && b >= 16 && b <= 31) {
      baseLabel = `Private-Use Network IP ${ip}`;
    } else if (a === 192 && b === 0 && c === 0) {
      baseLabel = `IETF Protocol Assignments IP ${ip}`;
    } else if (a === 192 && b === 0 && c === 2) {
      baseLabel = `TEST-NET-1 IP ${ip}`;
    } else if (a === 192 && b === 88 && c === 99) {
      baseLabel = `6to4 Relay Anycast IP ${ip}`;
    } else if (a === 192 && b === 168) {
      baseLabel = `Private-Use Networks IP ${ip}`;
    } else if (a === 198 && (b === 18 || b === 19)) {
      baseLabel = `Benchmark Testing IP ${ip}`;
    } else if (a === 198 && b === 51 && c === 100) {
      baseLabel = `TEST-NET-2 IP ${ip}`;
    } else if (a === 203 && b === 0 && c === 113) {
      baseLabel = `TEST-NET-3 IP ${ip}`;
    } else if (a >= 224 && a < 240) {
      baseLabel = `Multicast IP ${ip}`;
    } else if (a >= 240 && a < 255) {
      baseLabel = `Reserved IP ${ip}`;
    } else if (ip === '255.255.255.255') {
      baseLabel = `Limited Broadcast IP ${ip}`;
    } else {
      baseLabel = `Public IP ${ip}`;
    }
  }
  return { label: `$(lightbulb) ${baseLabel}` };
}
// END function to add lightbulb tooltip in editor above ip's


// BEGIN function to apply decoration to the given line
function applyIpBadgeDecoration(editor: vscode.TextEditor, line: number, ip: string): void {
  const { label } = getIpCategory(ip);
  const decorationType = vscode.window.createTextEditorDecorationType({
    before: {
      contentText: label,
      textDecoration: 'none; font-weight: bold; padding: 0 4px; margin-right: 5px;'
    }
  });
  const range = new vscode.Range(line, 0, line, 0);
  editor.setDecorations(decorationType, [range]);
}
// END function to apply decoration to the given line


// BEGIN codelens export class
export class IpCodeLensProvider implements vscode.CodeLensProvider {
  private ipRegex = /\b(\d{1,3}\.){3}\d{1,3}\b/g;

  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const lenses: MyCodeLens[] = [];
    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text;
      let match: RegExpExecArray | null;
      let order = 0;
      while ((match = this.ipRegex.exec(lineText)) !== null) {
        const ip = match[0];
        const range = new vscode.Range(i, 0, i, 0);
        const lens = new vscode.CodeLens(range) as MyCodeLens;
        lens.order = order;
        lens.ip = ip;
        // The CodeLens command title uses the label that includes the lightbulb icon
        lens.command = {
          title: getIpCategory(ip).label,
          command: getCommand(ip),
          arguments: [ip],
          tooltip: getTooltip(ip)
        };
        lenses.push(lens);
        order++;
      }
    }
    return lenses;
  }

  public resolveCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens {
    const myLens = codeLens as MyCodeLens;
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      // Use the inline decoration (badge) to show the label which includes the lightbulb icon
      applyIpBadgeDecoration(editor, myLens.range.start.line, myLens.ip);
    }
    return codeLens;
  }
}
// END codelens export class


// BEGIN auxiliary functions and commands
function getCommand(ip: string): string {
  const category = getIpCategory(ip);
  return category.label.includes('Public IP')
    ? 'net-commander.checkIpInfo'
    : 'net-commander.showRFC';
}

function getTooltip(ip: string): string {
  const category = getIpCategory(ip);
  return category.label.includes('Public IP')
    ? 'Click to lookup IP info via ipinfo.io'
    : 'Click to view IETF RFC summary';
}
// END auxiliary functions and commands