/***************************************************************************
 *   Extension:   Net Commander                                            *
 *   Version:     0.0.2                                                    *
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

// src/utils/ipUtils.ts

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