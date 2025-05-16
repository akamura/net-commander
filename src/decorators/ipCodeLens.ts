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

// src/decorators/ipCodeLens.ts

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
