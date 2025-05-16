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

// src/modules/terminaEnhancer.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';

// =========================================================================
// EXPORT functions
// =========================================================================
export function activate(context: vscode.ExtensionContext) {
  const rootUri = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (rootUri) {
    updateGitignore(rootUri);
  }

  const lastOutputByTerminal = new Map<
    vscode.Terminal,
    { output: string; commandLine: string }
  >();

  context.subscriptions.push(
    vscode.window.onDidChangeTerminalShellIntegration((e) => {
      if (!e.terminal.shellIntegration) {
        console.warn(
          `Shell integration not yet in terminal ${e.terminal.name}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidStartTerminalShellExecution(async (e) => {
      const { terminal, execution } = e;
      if (!execution.read) {
        return;
      }

      let buffer = '';
      for await (const chunk of execution.read()) {
        buffer += chunk;
      }

      lastOutputByTerminal.set(terminal, {
        output: buffer,
        commandLine: execution.commandLine.value,
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('netcmd.copyLastOutput', async () => {
      const term = vscode.window.activeTerminal;
      if (!term) {
        vscode.window.showWarningMessage('No active terminal.');
        return;
      }
      const record = lastOutputByTerminal.get(term);
      if (record?.output) {
        const clean = stripAnsiCodes(record.output);
        await vscode.env.clipboard.writeText(clean);
        vscode.window.showInformationMessage(
          'Copied last command output to clipboard.'
        );
      } else {
        vscode.window.showWarningMessage(
          'No captured output for the last command.'
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('netcmd.saveLastOutput', async () => {
      const term = vscode.window.activeTerminal;
      if (!term) {
        vscode.window.showWarningMessage('No active terminal.');
        return;
      }
      const record = lastOutputByTerminal.get(term);
      if (!record?.output) {
        vscode.window.showWarningMessage(
          'No captured output for the last command.'
        );
        return;
      }

      const cleanOutput = stripAnsiCodes(record.output);
      const workspaceRoot =
        vscode.workspace.workspaceFolders?.[0].uri.fsPath || process.cwd();
      const timestamp = createTimestampFolderName();
      const basePath = path.join(workspaceRoot, 'elelabdev', 'net-commander', 'ssh-downloads', timestamp);
      const baseUri = vscode.Uri.file(basePath);
      await vscode.workspace.fs.createDirectory(baseUri);

      const host = sanitizeFilename(getHostFromTerminal(term));
      const rawCmd = record.commandLine.trim();  
      const cmdName = sanitizeFilename(rawCmd);
      const fileName = `${host}-${cmdName}.txt`;
      const fileUri = vscode.Uri.file(path.join(basePath, fileName));

      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(cleanOutput, 'utf8')
      );

      vscode.window.showInformationMessage(
        `Saved output to ${fileUri.fsPath}`
      );
    })
  );
}

export function deactivate() {
}

function createTimestampFolderName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}-${mi}`;
}

function getHostFromTerminal(term: vscode.Terminal): string {
  const name = term.name;
  const m = name.match(/ssh\s+\S+@([\w.-]+)/i);
  if (m) {
    return m[1];
  }
  return os.hostname();
}

function stripAnsiCodes(input: string): string {
  return input
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\x1b\][0-?]*[ -\/]*[@-~]/g, '')
    .replace(/\u0007/g, '');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function updateGitignore(rootUri: vscode.Uri) {
  const gitignoreUri = vscode.Uri.joinPath(rootUri, '.gitignore');
  try {
    const content = await vscode.workspace.fs.readFile(gitignoreUri);
    let text = Buffer.from(content).toString('utf-8');

    if (!/^\/net-commander\s*$/m.test(text)) {
      text += '\n/net-commander\n';
      await vscode.workspace.fs.writeFile(
        gitignoreUri,
        Buffer.from(text, 'utf-8')
      );
      vscode.window.showInformationMessage(
        "Added '/net-commander' to .gitignore."
      );
    }
  } catch {
    console.warn(".gitignore not found; skipping update.");
  }
}