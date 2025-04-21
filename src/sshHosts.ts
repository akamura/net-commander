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

// src/sshHosts.ts

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

    // flatten value (string or Token[])
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