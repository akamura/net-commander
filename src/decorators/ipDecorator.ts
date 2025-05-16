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

// src/decorators/ipDecorators.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import { isPrivateIp, isDefaultRoute } from '../helpers/ipUtils';


// =========================================================================
// EXPORT functions
// =========================================================================
// BEGIN IP's decorator function
export function decorateIps(editor: vscode.TextEditor) {
    const text = editor.document.getText();
    const ipRegex = /\b(\d{1,3}\.){3}\d{1,3}\b/g;
    const lineMap = new Map<number, string[]>();

    let match: RegExpExecArray | null;
    while ((match = ipRegex.exec(text)) !== null) {
        const pos = editor.document.positionAt(match.index);
        const lineNum = pos.line;
        const ip = match[0];
        const label = getLabel(ip);
        if (!lineMap.has(lineNum)) {
            lineMap.set(lineNum, []);
        }
        lineMap.get(lineNum)?.push(label);
    }

    // Clear previous decorations by recreating a new decoration type without any ranges.
    editor.setDecorations(emptyDecorationType, []);

    lineMap.forEach((labels, lineNum) => {
        const summary = labels.join(' | ');
        const range = new vscode.Range(lineNum, 0, lineNum, 0);
        const decoType = vscode.window.createTextEditorDecorationType({
            before: {
                contentText: summary,
                textDecoration: 'display: block; font-weight: bold; margin-bottom: 4px; padding: 2px; border-radius: 4px;'
            }
        });
        // Set decoration for the line above the original line.
        editor.setDecorations(decoType, [range]);
    });
}
// END IP's decorator function

const emptyDecorationType = vscode.window.createTextEditorDecorationType({});
function getLabel(ip: string): string {
    if (isDefaultRoute(ip)) {
        return `Default Route ${ip}`;
    } else if (isPrivateIp(ip)) {
        return `Private IP ${ip}`;
    } else {
        return `Public IP ${ip}`;
    }
}