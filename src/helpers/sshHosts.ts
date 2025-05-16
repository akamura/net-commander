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

// src/helpers/sshHosts.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { parse } from 'ssh-config';
import * as vscode from 'vscode';


// =========================================================================
// EXPORT functions
// =========================================================================
export interface HostEntry {
  host: string;
  user?: string;
  hostname?: string;
  port?: string;
}

export async function getHosts(): Promise<HostEntry[]> {
  const cfgPath = `${os.homedir()}/.ssh/config`;
  let raw: string;
  try {
    raw = await fs.readFile(cfgPath, 'utf8');
  } catch {
    return [];
  }

  const cfg: any[] = parse(raw);
  const hosts: HostEntry[] = [];

  for (const entry of cfg) {
    if (entry.param !== 'Host') continue;
 
    const rawValue = Array.isArray(entry.value)
      ? entry.value.map((t: any) => t.val).join('')
      : typeof entry.value === 'string'
        ? entry.value
        : String(entry.value);

    const names = rawValue
      .split(/\s+/)
      .filter((name: string) => name && !/[*?]/.test(name));

    if (!names.length) continue;

    const settings: Record<string, string> = {};
    const cfgLines = Array.isArray(entry.config) ? entry.config : [];

    for (const line of cfgLines) {
      if (!line.param) continue;
      const val = Array.isArray(line.value)
        ? line.value.map((t: any) => t.val).join('')
        : String(line.value ?? '');
      settings[line.param.toLowerCase()] = val;
    }

    for (const host of names) {
      hosts.push({
        host,
        user: settings['user'],
        hostname: settings['hostname'],
        port: settings['port']
      });
    }
  }

  return hosts;
}