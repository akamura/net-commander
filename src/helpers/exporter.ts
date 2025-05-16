/***************************************************************************
 *   Extension:   Net Commander                                            *
 *   Version:     0.0.1                                                    *
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

// src/helpers/exporter.ts
 
// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import { join } from 'path';


// =========================================================================
// EXPORT functions
// =========================================================================

// BEGIN function to ensure /elelabdev exist or not in user worskpace
async function ensureModuleFolder(moduleName: string): Promise<string | undefined> {
  const wk = vscode.workspace.workspaceFolders?.[0];
  if (!wk) {
    vscode.window.showErrorMessage('ATTENTION: Open a folder or Workspace first.');
    return;
  }

  const moduleFolder = join(wk.uri.fsPath, 'elelabdev', 'net-commander', moduleName);
  try {
    await fs.mkdir(moduleFolder, { recursive: true });
  } catch (e: any) {
    vscode.window.showErrorMessage(`Cannot create folder: ${e.message}`);
    return;
  }

  // to prevent sensitive info to be uploaded to GIT unintentionally I ensure .gitignore excludes /elelabdev
  const gitignorePath = join(wk.uri.fsPath, '.gitignore');
  try {
    await fs.access(gitignorePath);
    let content = await fs.readFile(gitignorePath, 'utf8');
    const entry = '/elelabdev';
    if (!content.includes(entry)) {
      if (!content.endsWith('\n')) content += '\n';
      content += entry + '\n';
      await fs.writeFile(gitignorePath, content, 'utf8');
    }
  } catch {
    // No .gitignore found or error = ignore
  }

  return moduleFolder;
}
// END function to ensure /elelabdev exist or not in user worskpace



// BEGIN function to export CSV
export async function exportCsv(
  moduleName: string,
  baseFileName: string,
  csvContent: string,
  csvHeader?: string
): Promise<void> {
  const folder = await ensureModuleFolder(moduleName);
  if (!folder) return;

  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const fullPath = join(folder, `${baseFileName}-${ts}.csv`);

  let content = csvHeader ?? '';
  try {
    const existing = await fs.readFile(fullPath, 'utf8');
    content = existing + '\n';
  } catch {
    // File does not exist; use header if provided
  }

  content += csvContent + '\n';

  try {
    await fs.writeFile(fullPath, content, 'utf8');
    vscode.window.showInformationMessage(`CSV saved to ${fullPath}`);
  } catch (err: any) {
    vscode.window.showErrorMessage(`CSV save failed: ${err.message}`);
  }
}
// END function to export CSV


// BEGIN function to allow wifiAnalyzer.ts to save PCAP files in user workspace
export async function createCaptureFilePath(
    moduleName: string,
    baseFileName: string,
    extension: string = '.pcap'
  ): Promise<string | undefined> {
    const folder = await ensureModuleFolder(moduleName);
    if (!folder) return;
  
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${baseFileName}-${ts}${extension}`;
    return join(folder, fileName);
  }

  
export { ensureModuleFolder };
// END function to allow wifiAnalyzer.ts to save PCAP files in user workspace