/***************************************************************************
 *   Extension:   Net Commander                                            *
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

// src/helpers/ipUtils.ts

// =========================================================================
// EXPORT functions
// =========================================================================
export function isPrivateIp(ip: string): boolean {
  if (isDefaultRoute(ip)) return false;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  if (parts[0] === '10') return true;
  if (parts[0] === '172') {
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (parts[0] === '192' && parts[1] === '168') return true;
  return false;
}

export function isDefaultRoute(ip: string): boolean {
  return ip === '0.0.0.0';
}