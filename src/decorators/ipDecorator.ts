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

// src/decorators/ipDecorator.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import { isPrivateIp, isDefaultRoute } from '../utils/ipUtils';


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