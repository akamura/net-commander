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

// src/modules/wifiAnalyzer.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';
import * as os from 'os';
import { promisify } from 'util';
import { exec as execCb, spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { promises as fs } from 'fs'; 
import { getNonce } from '../helpers/nonce';
import { exportCsv, createCaptureFilePath } from '../helpers/exporter';


// =========================================================================
// EXPORT functions
// =========================================================================
const exec = promisify(execCb);
const POLL_INTERVAL_MS = 1000;

export interface WiFiInfo {
  iface?: string;
  mac?: string;
  ipAddr?: string;
  ssid?: string;
  bssid?: string;
  mode?: string;
  frequency?: number;
  channel?: number;
  widthMHz?: number;
  signalPercent?: number;
  signalDbm?: number;
  noiseDbm?: number;
  linkQuality?: string;
  txRateMbps?: number;
  rxRateMbps?: number;
  beacons?: number;
  powerMgmt?: 'on' | 'off';
  txPowerDbm?: number;
  txPowerMw?: number;
  rxBytes?: number;
  txBytes?: number;
  rxDropped?: number;
  txDropped?: number;
  connectedTimeSec?: number;
  inactiveTimeSec?: number;
  timestamp: string;
  neighborBars?: { channel: number; strength: number }[];
  neighborSSIDs?: string[];
  neighborDetails?: Array<{ ssid: string; channel: number; strength: number }>;
}

// BEGIN function to select the adapter (still work in progress)
export async function selectWindowsAdapter() {
  try {
    const { stdout } = await exec(
      `powershell -Command "Get-Counter -ListSet 'Network Interface' | Select -ExpandProperty Paths"`
    );

    const regex = /\\Network Interface\(([^)]+)\)\\Bytes Received\/sec/;
    const adapterNames = Array.from(new Set(
      stdout
        .split(/\r?\n/)
        .map(line => {
          const match = line.match(regex);
          return match?.[1];
        })
        .filter((name): name is string => !!name)
    ));

    const items: vscode.QuickPickItem[] = adapterNames.map(name => ({
      label: name
    }));

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: "Select the network adapter to monitor",
    });

    if (selection?.label) {
      await vscode.workspace.getConfiguration().update(
        'netCommander.windowsAdapterName',
        selection.label,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(`Adapter "${selection.label}" selected for traffic monitoring.`);
    }
  } catch (e) {
    vscode.window.showErrorMessage('Failed to load adapters: ' + e);
  }
}
// END function to select the adapter (still work in progress)


// BEGIN function to register WiFi Analyzer
export function registerWiFiAnalyzer(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('net-commander.wifiAnalyzer', () => {
      const panel = vscode.window.createWebviewPanel(
        'wifiAnalyzer',
        'NET Commander: WiFi Analyzer',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, 'media', 'libs'),
            vscode.Uri.joinPath(context.extensionUri, 'media', 'common'),
            vscode.Uri.joinPath(context.extensionUri, 'media', 'module-wifianalyzer')
          ]
        }
      );

      const cspSource = panel.webview.cspSource; 

      const nonce = getNonce();
      // build URIs…
      const d3Uri      = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'libs', 'd3', 'd3.v7.min.js')
      );
      const elementsUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'libs', 'vscode-elements', 'bundled.js')
      );
      const commonStyleUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'common', 'css', 'style.css')
      );      
      const styleUri   = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'module-wifianalyzer', 'style.css')
      );
      const scriptUri  = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'module-wifianalyzer', 'main.js')
      );

      panel.webview.html = showWebviewContent(
        nonce,
        cspSource,
        d3Uri.toString(),
        elementsUri.toString(),
        commonStyleUri.toString(),
        styleUri.toString(),
        scriptUri.toString()
      );

      // Keep latest info for SSID/BSSID
      let lastInfo: WiFiInfo = { timestamp: new Date().toLocaleTimeString() };

      // Single polling loop
      const startTs = Date.now();
      const timer = setInterval(async () => {
        const info = await gatherWiFiInfo();
        lastInfo = info;
        if (!info.connectedTimeSec) {
          info.connectedTimeSec = Math.floor((Date.now() - startTs) / 1000);
        }
        panel.webview.postMessage(info);
      }, POLL_INTERVAL_MS);

      // Packet captur start/stop
      let pcapProcess: ChildProcessWithoutNullStreams | undefined;
      panel.webview.onDidReceiveMessage(async message => { 

  if (message.command === 'exportCsv') {
    const ssid  = (lastInfo.ssid  ?? 'unknown').replace(/[^\w\-]/g, '_');
    const bssid = (lastInfo.bssid ?? 'unknown').replace(/[^\w\-]/g, '_');
    const baseFile = `${ssid}-${bssid}-info`;
    const headers = Object.keys(lastInfo);
    const values = headers.map(h =>
      `"${String((lastInfo as any)[h] ?? '').replace(/"/g, '""')}"`
    );
    const csv = headers.join(',') + '\n' + values.join(',');
    await exportCsv('wifi-analyzer', baseFile, csv);
    return;
  }

  if (!pcapProcess) {
    const ssid  = (lastInfo.ssid  ?? 'unknown').replace(/[^\w\-]/g, '_');
    const bssid = (lastInfo.bssid ?? 'unknown').replace(/[^\w\-]/g, '_');
    const base  = `${ssid}-${bssid}-capture`;
  
    const outPath = await createCaptureFilePath('wifi-analyzer', base);
    if (!outPath) return;
  
    pcapProcess = spawn('tcpdump', ['-w', outPath]);
  
    pcapProcess.on('error', err => {
      vscode.window.showErrorMessage(
        `WARNING: Failed to start tcpdump: ${err.message}\n` +
        `Windows I am still developing that part.\n` +
        `LINUX you may need to elevate your user with this command:\n` +
        `  sudo setcap cap_net_raw,cap_net_admin+eip $(which tcpdump)`
      );
      pcapProcess = undefined;
    });
  
    pcapProcess.on('close', () => {
      pcapProcess = undefined;
      panel.webview.postMessage({ command: 'pcapStopped' });
    });
  
    panel.webview.postMessage({ command: 'pcapStarted', filePath: outPath });
  
  } else {
    pcapProcess.kill('SIGINT');
  }
  
    });
 
      panel.onDidDispose(() => {
        clearInterval(timer);
        if (pcapProcess) {
          pcapProcess.kill('SIGINT');
          pcapProcess = undefined;
        }
      }, null, context.subscriptions);
    })
  );
}
// END function to register WiFi Analyzer


// BEGIN function to gather Windows RSSI
async function getWindowsRSSI(): Promise<number|undefined> {
  try {
    const { stdout } = await exec(
      'powershell -Command "Get-CimInstance -Namespace root\\wmi -Class MSNdis_80211_ReceivedSignalStrength | Select-Object -ExpandProperty Ndis80211ReceivedSignalStrength"'
    );
    return parseInt(stdout.trim().split(/\r?\n/)[0], 10);
  } catch {
    return undefined;
  }
}

export async function getWindowsInterfaceBytesFromSettings(): Promise<{ rxBytes: number; txBytes: number }> {
  try {
    const adapterName = vscode.workspace.getConfiguration().get<string>('netCommander.windowsAdapterName') || '';
    if (!adapterName) return { rxBytes: 0, txBytes: 0 };

    const safeInstance = adapterName.replace(/([()\\])/g, '\\$1');

    const rxCmd = `Get-Counter "\\Network Interface(${safeInstance})\\Bytes Received/sec" | Select -ExpandProperty CounterSamples`;
    const txCmd = `Get-Counter "\\Network Interface(${safeInstance})\\Bytes Sent/sec" | Select -ExpandProperty CounterSamples`;

    const { stdout: rxOut } = await exec(`powershell -Command "${rxCmd}"`);
    const { stdout: txOut } = await exec(`powershell -Command "${txCmd}"`);

    const parseValue = (out: string) => {
      const m = out.match(/CookedValue\s*:\s*([\d.]+)/);
      return m ? parseFloat(m[1]) : 0;
    };

    return {
      rxBytes: parseValue(rxOut),
      txBytes: parseValue(txOut)
    };
  } catch (e) {
    console.error('Get-Counter error:', e);
    return { rxBytes: 0, txBytes: 0 };
  }
}
// END function to gather Windows RSSI


// BEGIN function to gather WiFi MACOS netstat
async function parseDarwinStats(info: WiFiInfo) {
  if (!info.iface) return;
  try {
    const { stdout } = await exec(`netstat -bI ${info.iface}`);
    const lines = stdout.trim().split('\n');
    for (const l of lines) {
      if (l.startsWith(info.iface + ' ')) {
        const cols = l.trim().split(/\s+/);
        info.rxDropped = parseInt(cols[5], 10);
        info.rxBytes   = parseInt(cols[6], 10);
        info.txDropped = parseInt(cols[8], 10);
        info.txBytes   = parseInt(cols[9], 10);
        break;
      }
    }
  } catch {
  }
}
// END function to gather WiFi MACOS netstat


// BEGIN function to gather WiFi stats cross-platform
async function gatherWiFiInfo(): Promise<WiFiInfo> {
  const platform = os.platform();
  let info: Partial<WiFiInfo> = { timestamp: new Date().toLocaleTimeString() };

  try {
    // 1) OS-specific parsing
    if (platform === 'win32') {
      const { stdout } = await exec('netsh wlan show interfaces');
      info = parseWindows(stdout);
    
      if (os.platform() === 'win32') {
        const { rxBytes, txBytes } = await getWindowsInterfaceBytesFromSettings();
        info.rxBytes = rxBytes;
        info.txBytes = txBytes;
      }
      
    }
    
    else if (platform === 'darwin') {
      const { stdout } = await exec(
        '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I'
      );
      info = parseDarwin(stdout);
    
      await parseDarwinStats(info as WiFiInfo);
    } else {
      const { stdout } = await exec('iwconfig');
      info = parseLinux(stdout);
    }

    enrichAdapterInfo(info);

    if (platform === 'linux' && info.iface) {
      await populateLinuxStats(info as WiFiInfo);
      await parseLinuxStation(info as WiFiInfo);
      await parseLinuxDev(info as WiFiInfo);
    }

    let raw: Array<{ channel: number; strength: number }> = [];
    if (info.iface) {
      raw = await parseNeighbors(info.iface, platform) as any;
    }

    const maxByCh = new Map<number, number>();
    for (const { channel, strength } of raw) {
      const prev = maxByCh.get(channel) || 0;
      maxByCh.set(channel, Math.max(prev, strength));
    }

    if (info.channel != null) {
      const myPct =
        info.signalPercent != null
          ? info.signalPercent
          : info.signalDbm != null
          ? Math.min(100, Math.round(((info.signalDbm + 100) / 70) * 100))
          : 0;
      const prev = maxByCh.get(info.channel) || 0;
      maxByCh.set(info.channel, Math.max(prev, myPct));
    }

    let rawNeighbors: Array<{ssid:string;channel:number;strength:number}> = [];
    if (info.iface) {
      rawNeighbors = await parseNeighborsDetailed(info.iface, platform);
    }
    info.neighborDetails = rawNeighbors;
    info.neighborBars = Array.from(maxByCh.entries())
      .map(([channel, strength]) => ({ channel, strength }))
      .sort((a, b) => a.channel - b.channel);
    if (info.iface) {
      info.neighborSSIDs = await parseNeighborSSIDs(info.iface, platform);
    }

return {
      timestamp: new Date().toLocaleTimeString(),
      ...info
    } as WiFiInfo;
  } catch (e) {
    console.error('WiFi Analyzer error', e);
    return { timestamp: new Date().toLocaleTimeString() };
  }
}
// END function to gather WiFi stats cross-platform


// BEGIN function to generate neighbors SSID stats cross-platform
async function parseNeighborSSIDs(
  iface: string,
  platform: string
): Promise<string[]> {
  if (platform === 'linux') {
    try {
      const { stdout } = await exec('nmcli -t -f SSID dev wifi list');
      return Array.from(
        new Set(
          stdout
            .split('\n')
            .map(line => line.trim())
            .filter(ssid => ssid && ssid !== '--')
        )
      );
    } catch {
      return [];
    }
  }

  if (platform === 'win32') {
    try {
      const { stdout } = await exec('netsh wlan show networks mode=bssid');
      const ssids: string[] = [];
      // lines like:     SSID 1 : MyNetwork
      stdout.split(/\r?\n/).forEach(line => {
        const m = line.match(/^\s*SSID\s+\d+\s*:\s*(.+)$/);
        if (m) ssids.push(m[1].trim());
      });
      return Array.from(new Set(ssids));
    } catch {
      return [];
    }
  }

  if (platform === 'darwin') {
    try {
      const airport =
        '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';
      const { stdout } = await exec(`${airport} -s`);
      return Array.from(
        new Set(
          stdout
            .split(/\r?\n/)
            .slice(1)
            .map(l => {
              const cols = l.trim().split(/\s+/);
              return cols[0] || '';
            })
            .filter(ssid => ssid)
        )
      );
    } catch {
      return [];
    }
  }
  return [];
}
// END function to generate neighbors SSID stats cross-platform


// BEGIN function to generate neighbors detailed stats cross-platform
async function parseNeighborsDetailed(
  iface: string,
  platform: string
): Promise<Array<{ ssid: string; channel: number; strength: number }>> {

  if (platform === 'linux') {
    try {
      const { stdout } = await exec('nmcli -t -f SSID,CHAN,SIGNAL dev wifi list');
      return stdout
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [ssid, ch, sig] = line.split(':');
          return {
            ssid: ssid || '<hidden-SSID>',
            channel: Number(ch),
            strength: Number(sig)
          };
        });
    } catch {
      return [];
    }
  }

  if (platform === 'win32') {
    const { stdout } = await exec('netsh wlan show networks mode=bssid');
    const blocks = stdout.split(/\r?\n\s*\r?\n/).map(b=>b.trim()).filter(b=>b);
    const out: Array<{ssid:string,channel:number,strength:number}> = [];
    for (const blk of blocks) {
      const ssidM = blk.match(/^\s*SSID\s+\d+\s*:\s*(.+)$/m);
      const sigM  = blk.match(/Signal\s*:\s*(\d+)%/i);
      const chM   = blk.match(/Channel\s*:\s*(\d+)/i);
      if (ssidM && sigM && chM) {
        out.push({
          ssid: ssidM[1].trim(),
          channel:  parseInt(chM[1],10),
          strength: parseInt(sigM[1],10)
        });
      }
    }
    return out;
  }

  if (platform === 'darwin') {
    try {
      const airport =
        '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';
      const { stdout } = await exec(`${airport} -s`);
      return stdout
        .split('\n')
        .slice(1)
        .map(line => {
          const m = line.match(/^(.{1,32}?)\s{2,}([0-9A-F:]{17})\s+(-?\d+)\s+(\d+)/);
          if (!m) return null;
          const ssid    = m[1].trim();
          const bssid   = m[2];
          const rssi    = parseInt(m[3], 10);
          const channel = parseInt(m[4], 10);
          const strength = Math.min(100, Math.max(0, rssi + 100));
          return { ssid, channel, strength };
        })
        .filter((x): x is { ssid:string, channel:number, strength:number } => !!x);
    } catch {
      return [];
    }
  }
  return [];
}
// END function to generate neighbors detailed stats cross-platform


// BEGIN function to generate neighbors stats cross-platform
async function parseNeighbors(
  iface: string,
  platform: string
): Promise<{ channel: number; strength: number }[]> {
  if (platform === 'linux') {
    try {
      const { stdout } = await exec('nmcli -t -f CHAN,SIGNAL dev wifi list');
      return stdout
        .split('\n')
        .filter(l => l.trim() !== '')
        .map(l => {
          const [ch, sig] = l.split(':');
          return { channel: +ch, strength: +sig };
        })
        .filter(x => !isNaN(x.channel) && !isNaN(x.strength));
    } catch {
      return [];
    }
  }

  // Windows fallback
  if (platform === 'win32') {
    try {
      const { stdout } = await exec('netsh wlan show networks mode=bssid');
      // Split output into per-BSSID blocks
      const blocks = stdout
        .split(/\r?\n\s*\r?\n/)  // blank line separates blocks
        .map(b => b.trim())
        .filter(b => b.length);

      const entries: { channel: number; strength: number }[] = [];

      for (const blk of blocks) {
        const sigMatch = blk.match(/Signal\s*:\s*(\d+)%/i);
        const chMatch  = blk.match(/Channel\s*:\s*(\d+)/i);
        if (sigMatch && chMatch) {
          const strength = parseInt(sigMatch[1], 10);
          const channel  = parseInt(chMatch[1], 10);
          entries.push({ channel, strength });
        }
      }

      // dedupe by channel, keep the max strength per channel
      const maxByCh = new Map<number, number>();
      for (const { channel, strength } of entries) {
        const prev = maxByCh.get(channel) || 0;
        maxByCh.set(channel, Math.max(prev, strength));
      }
      return Array.from(maxByCh, ([channel, strength]) => ({ channel, strength }))
        .sort((a, b) => a.channel - b.channel);
    } catch {
      return [];
    }
  }

  // macOS fallback
  if (platform === 'darwin') {
    const chans: number[] = [];
    try {
      const airport =
        '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';
      const { stdout } = await exec(`${airport} -s`);
      stdout.split(/\r?\n/).slice(1).forEach(line => {
        const c = parseInt(line.trim().split(/\s+/)[3], 10);
        if (!isNaN(c)) chans.push(c);
      });
    } catch {}
    return Array.from(new Set(chans)).map(c => ({ channel: c, strength: 0 }));
  }

  return [];
}
// END function to generate neighbors stats cross-platform


// BEGIN function to generate WINDOWS stats
function parseWindows(output: string): Partial<WiFiInfo> {
  const m = (re: RegExp) => {
    const r = output.match(re);
    return r ? r[1].trim() : undefined;
  };
  const pct = Number(m(/Signal\s*:\s*(\d+)%/i) || 0);
  return {
    iface: m(/Name\s*:\s*(.+)/i),
    mac: m(/Physical address\s*:\s*([0-9A-F:-]+)/i),
    ssid: m(/SSID\s*:\s*(.+)/i),
    bssid: m(/BSSID\s*:\s*([0-9A-F:-]+)/i),
    channel: Number(m(/Channel\s*:\s*(\d+)/i) || 0),
    txRateMbps: Number(m(/Transmit rate[^\d]*(\d+)/i) || 0),
    rxRateMbps: Number(m(/Receive rate[^\d]*(\d+)/i) || 0),
    /* ← new */
    linkQuality: `${pct}/100`,
    /* approximate dBm from % */
    signalDbm: Math.round(((pct/100)*70) - 100)
  };
}
// END function to generate WINDOWS stats


// BEGIN function to generate MACOS stats
function parseDarwin(output: string): Partial<WiFiInfo> {
  const m = (re: RegExp) => {
    const r = output.match(re);
    return r ? r[1].trim() : undefined;
  };
  const rssi = Number(m(/agrCtlRSSI:\s*(-?\d+)/m) || 0);
  // map –100…–30 dBm onto 0…100%
  const pct = Math.min(100, Math.max(0, Math.round(((rssi + 100) / 70) * 100)));

  return {
    iface:    m(/agrCtlInterface:\s*(\w+)/m) ?? 'en0',
    ssid:     m(/SSID:\s*(.+)/m),
    bssid:    m(/BSSID:\s*([0-9A-F:]+)/im),
    signalDbm:rssi,
    noiseDbm: Number(m(/agrCtlNoise:\s*(-?\d+)/m) || 0),
    txRateMbps:Number(m(/lastTxRate:\s*(\d+)/m) || 0),
    channel:  Number(m(/channel:\s*(\d+)/m) || 0),
    linkQuality: `${pct}/100`
  };
}
// END function to generate MACOS stats


// BEGIN function to generate LINUX stats
function parseLinux(output: string): Partial<WiFiInfo> {
  const lines = output.split(/\r?\n/);
  const first = lines[0] || '';
  const m = (re: RegExp) => {
    for (const l of lines) {
      const r = l.match(re);
      if (r) return r[1].trim();
    }
    return undefined;
  };
  const linkQ = m(/Link Quality=(\d+\/\d+)/i);
  const [num, den] = linkQ?.split('/').map(Number) || [0, 1];
  return {
    iface: first.split(/\s+/)[0],
    ssid: m(/ESSID:"([^"]+)"/i),
    bssid: m(/Access Point:\s*([0-9A-F:]+)/i),
    mode: m(/Mode:(\S+)/i),
    frequency: m(/Frequency:(\d+\.\d+)/i)
      ? Math.round(Number(m(/Frequency:(\d+\.\d+)/i)) * 1000)
      : undefined,
    channel: Number(m(/Channel:(\d+)/i) || 0),
    linkQuality: linkQ,
    signalPercent: Math.round((num / den) * 100),
    signalDbm: Number(m(/Signal level[=:\s]*(-?\d+)/i) || 0),
    txRateMbps: Number(m(/Bit Rate[=:\s]*([\d.]+)/i) || 0)
  };
}

function enrichAdapterInfo(info: Partial<WiFiInfo>) {
  const nets = os.networkInterfaces();
  const name = info.iface!;
  const addrs = nets[name] || [];
  const ipv4 = addrs.find(i => i.family === 'IPv4');
  if (ipv4) {
    info.ipAddr = `${ipv4.address}/${ipv4.netmask}`;
    info.mac = info.mac || ipv4.mac;
  }
}

async function populateLinuxStats(info: WiFiInfo) {
  if (!info.iface) return;
  const stats: [string, keyof WiFiInfo][] = [
    ['rx_bytes', 'rxBytes'],
    ['tx_bytes', 'txBytes'],
    ['rx_dropped', 'rxDropped'],
    ['tx_dropped', 'txDropped']
  ];
  for (const [file, prop] of stats) {
    try {
      const txt = await fs.readFile(
        `/sys/class/net/${info.iface}/statistics/${file}`,
        'utf8'
      );
      (info as any)[prop] = Number(txt.trim());
    } catch {
      (info as any)[prop] = 0;
    }
  }
}

async function parseLinuxStation(info: WiFiInfo) {
  if (!info.iface) return;
  try {
    const { stdout } = await exec(`iw dev ${info.iface} station dump`);
    const m = (re: RegExp) => {
      const r = stdout.match(re);
      return r ? Number(r[1]) : undefined;
    };
    const inact = m(/inactive time:\s*(\d+)\s*ms/);
    const conn = m(/connected time:\s*(\d+)\s*ms/);
    info.inactiveTimeSec = inact != null ? inact / 1000 : undefined;
    info.connectedTimeSec = conn != null ? conn / 1000 : info.connectedTimeSec;
    info.beacons = m(/beacon rx:\s*(\d+)/);
  } catch {}
}

async function parseLinuxDev(info: WiFiInfo) {
  if (!info.iface) return;
  try {
    const { stdout } = await exec(`iw dev ${info.iface} info`);
    const c = stdout.match(
      /channel\s+(\d+)\s+\((\d+)\s*MHz\),\s*width:\s*(\d+)\s*MHz/
    );
    if (c) {
      info.channel = Number(c[1]);
      info.frequency = Number(c[2]);
      info.widthMHz = Number(c[3]);
    }
    const { stdout: iwcOut } = await exec(`iwconfig ${info.iface}`);
    const pm = iwcOut.match(/Power Management:(on|off)/i);
    if (pm) info.powerMgmt = pm[1] as 'on' | 'off';
    const txp = iwcOut.match(/Tx-Power=(\d+)/i);
    if (txp) {
      info.txPowerDbm = Number(txp[1]);
      info.txPowerMw = Math.round(10 ** (info.txPowerDbm! / 10));
    }
  } catch {}
}
// END function to generate LINUX stats


// BEGIN function to generate user webview content
function showWebviewContent(nonce: string, cspSource: string, d3Src: string, elementsSrc: string, commonstyleSrc: string, styleSrc: string, scriptSrc: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Security-Policy"
        content="
          default-src 'none';
          img-src ${cspSource} https: data:;
          script-src 'nonce-${nonce}' ${cspSource};
          style-src 'unsafe-inline' ${cspSource};
          font-src ${cspSource} https: data:;
        ">
  <script type="module" nonce="${nonce}" src="${elementsSrc}"></script>
  <script nonce="${nonce}" src="${d3Src}"></script>
  <link rel="stylesheet" href="${commonstyleSrc}" type="text/css" />
  <link rel="stylesheet" href="${styleSrc}" type="text/css"/>
</head>
<body>

  <div class="layout">
    <!-- TOP BAR: title + controls -->
    <div class="top-bar">
      <h1>NET Commander WiFi Analyzer</h1>
      <div class="controls">
        <vscode-button id="csvBtn">Get RAW csv data</vscode-button>
        <vscode-button id="pcapBtn">Start Packet Capture</vscode-button>
      </div>
    </div>

    <div class="header">
      <div class="section" id="col1">
        <h2>You are connected to</h2>
        <div><span id="ssid-val"></span></div>
        <div><span id="bssid-val"></span></div>
      </div>
      <div class="section" id="col2">
        <h2>Your NIC details</h2>
        <div><span id="ip-val"></span></div>
        <div><span id="mac-val"></span></div>
      </div>
      <div class="section" id="col3">
        <h2>You have received</h2>
        <div><span id="rx-rate-val"></span></div>
        <div>Dropped RX: <span id="rx-dropped-val"></span></div>
      </div>
      <div class="section" id="col4">
        <h2>You have transmitted</h2>
        <div><span id="tx-rate-val"></span></div>
        <div>Dropped TX: <span id="tx-dropped-val"></span></div>
      </div>
    </div>

    <!-- MIDDLE GRID -->
    <div class="middle">
      <!-- NEIGHBOR SIGNAL PANEL -->
      <div class="section panel chart" id="neighbor-signal-block">
        <div class="chart-header">
          <h2>Neighbor Signal Level (dBm)</h2>
          <div class="static-legend">
            <div class="legend-item">
              <span class="legend-color" style="background:green"></span>
              <span>All good -81/-95</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:lightgreen"></span>
              <span>Away -71/-80</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:yellow"></span>
              <span>Distant -61/-70</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:orange"></span>
              <span>Close -51/-60</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:red"></span>
              <span>Too close -30/-50</span>
            </div>
          </div>
        </div>
        <svg></svg>
      </div>

      <div class="section panel chart" id="signal-chart">
        <div class="chart-header">
          <h2>Signal Level (dBm)</h2>
          <div class="static-legend">
            <div class="legend-item">
              <span class="legend-color" style="background:red"></span>
              <span>Very weak –81/–95</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:orange"></span>
              <span>Weak –71/–80</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:yellow"></span>
              <span>Medium –61/–70</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:lightgreen"></span>
              <span>Good –51/–60</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:green"></span>
              <span>Excellent –30/–50</span>
            </div>
          </div>
        </div>
        <svg></svg>
      </div>

      <div class="section info-block">
        <div class="chart-header">
          <h2>Technical Informations</h2>
        </div>
        <div class="info-scrollable">
          <vscode-table zebra bordered-rows>
            <vscode-table-header slot="header">
              <vscode-table-header-cell>Property</vscode-table-header-cell>
              <vscode-table-header-cell>Value</vscode-table-header-cell>
            </vscode-table-header>
            <vscode-table-body slot="body" id="info-table-body">
              <!-- rows will be injected here -->
            </vscode-table-body>
          </vscode-table>
        </div>
      </div>

      <div class="section panel chart" id="link-chart">
        <div class="chart-header">
          <h2>Link Quality (%)</h2>
          <div class="static-legend">
            <div class="legend-item">
              <span class="legend-color" style="background:red"></span>
              <span>Really? 0–20%</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:orange"></span>
              <span>Poor 21–40%</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:yellow"></span>
              <span>Fair 41–60%</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:lightgreen"></span>
              <span>Good 61–80%</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background:green"></span>
              <span>Excellent 81–100%</span>
            </div>
          </div>
        </div>
        <svg></svg>
      </div>
    </div>

    <!-- FOOTER ROW -->
    <div class="footer">
      <div class="section chart" id="bot1">
        <div class="chart-header">
          <h2>Neighbor channels 2.4 GHz</h2>
        </div>
        <svg id="neighbors-chart-2g"></svg>
      </div>
      <div class="section chart" id="bot2">
        <div class="chart-header">
          <h2>Neighbor channels 5–6 GHz</h2>
        </div>
        <svg id="neighbors-chart-5g"></svg>
      </div>
    </div>
  </div>
<script nonce="${nonce}" src="${scriptSrc}"></script>
</body>
</html>`;
}
// END function to generate user webview content