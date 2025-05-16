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

// src/decorators/networkColorizer.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode from 'vscode';


// =========================================================================
// EXPORT functions
// =========================================================================
// BEGIN categorization and keyword grouping
const defaultKeywords: Record<string, string[]> = {
  generic: [
    "hostname","ntp","date","time","banner login","banner motd",
    "default","exit","end","alias","boot system","version",
    "errdisable recovery cause","errdisable recovery interval",
    "logging buffered","logging console","logging monitor","logging host",
    "logging trap","logging source-interface",
    "service timestamps log datetime msec","service timestamps log uptime",
    "service sequence-numbers","vtp mode","vtp domain","vtp password",
    "spanning-tree mode","spanning-tree extend system-id","spanning-tree vlan",
    "feature bgp","feature ospf","feature eigrp","feature rip",
    "feature hsrp","feature vrrp","feature pim","feature netflow",
    "feature lacp","feature vpc","feature interface-vlan",
    "feature telnet","feature ssh","feature scpServer",
    "feature tacacs+","feature dhcp","feature nxapi"
  ],
  security: [
    "enable secret","shutdown","no shutdown","enable password",
    "service password-encryption","no service password-recovery",
    "aaa new-model","aaa authentication","aaa authorization",
    "aaa accounting","username","login","login local","login block-for",
    "enable algorithm-type","password","line console","line vty",
    "exec-timeout","privilege level","logging synchronous",
    "transport input","transport output","access-list",
    "ip access-list standard","ip access-list extended","ipv6 access-list",
    "mac access-list extended","ip access-group","ipv6 traffic-filter",
    "access-class","snmp-server community","snmp-server host",
    "snmp-server location","snmp-server contact","snmp-server enable traps",
    "tacacs server","tacacs-server host","tacacs-server key",
    "radius server","radius-server host","radius-server key",
    "crypto key generate rsa","crypto key generate ecdsa",
    "crypto pki trustpoint","crypto isakmp policy","crypto ikev2 policy",
    "crypto ikev2 keyring","crypto ikev2 profile","crypto ipsec transform-set",
    "crypto ipsec profile","crypto map","ssh key","ip ssh version",
    "ip ssh authentication-retries","ip ssh time-out","ip http server",
    "ip http secure-server","ip http authentication","ip scp server enable",
    "switchport port-security","switchport port-security maximum",
    "switchport port-security mac-address","switchport port-security violation"
  ],
  ipGroup: [
    "ip address","ipv6 address","ipv6 enable","ip default-gateway",
    "ip routing","ipv6 unicast-routing","ip route","ipv6 route",
    "ip name-server","ip domain-name","ip domain-list","ip domain-lookup",
    "ip host","ip cef","ip default-network","ip nat inside",
    "ip nat outside","ip nat pool","ip nat inside source",
    "ip nat outside source","ip nat inside destination","ip proxy-arp"
  ],
  interfaceGroup: [
    "interface","interface range","description","speed","duplex",
    "speed nonegotiate","no negotiate auto","mtu","bandwidth",
    "no switchport","switchport mode access","switchport mode trunk",
    "switchport access vlan","switchport trunk allowed vlan",
    "switchport trunk native vlan","switchport nonegotiate","channel-group",
    "no channel-group","flowcontrol","storm-control","hsrp","standby",
    "vrrp","glbp","vlan"
  ],
  vrfGroup: [
    "vrf definition","vrf instance","vrf context","ip vrf forwarding",
    "vrf member","rd","route-target import","route-target export",
    "vrf import","vrf export"
  ],
  routingGroup: [
    "router ospf","router ospfv3","router bgp","router eigrp",
    "router rip","router isis","network","passive-interface",
    "no passive-interface","default-information originate","redistribute",
    "router-id","area","maximum-paths","auto-summary","no auto-summary",
    "eigrp stub","address-family","neighbor","remote-as",
    "next-hop-self","send-community","default-originate",
    "route-reflector-client","soft-reconfiguration","maximum-prefix",
    "timers","bgp log-neighbor-changes","bgp bestpath","distance",
    "distribute-list","prefix-list","ip prefix-list","route-map"
  ],
  netflowGroup: [
    "ip flow-export source","ip flow-export destination","ip flow-export version",
    "ip flow-cache timeout","ip flow ingress","ip flow egress",
    "ip flow monitor","flow record","flow exporter","flow monitor",
    "sampler","hardware profile netflow","sflow run","sflow destination",
    "sflow source","sflow source-interface","sflow polling-interval",
    "sflow sample","sflow enable","flow tracking sampled"
  ],
  dhcpGroup: [
    "ip dhcp pool","network","default-router","dns-server","domain-name",
    "lease","next-server","filename","option","ipv6 dhcp pool",
    "address prefix","dns-server ipv6","domain-search",
    "ip dhcp excluded-address","ip helper-address",
    "ip dhcp relay information option","ip dhcp relay information trusted",
    "dhcp relay","ip dhcp snooping","ip dhcp snooping vlan",
    "ip dhcp snooping trust","ip dhcp snooping database"
  ],
  ipLiteral: [
    "\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)"
  + "(?:\\.(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)){3})"
  + "(?:/\\d{1,2})?\\b"
  ],
  ip6Literal: [
    "\\b(?:(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}"
  + "|(?:[A-Fa-f0-9]{1,4}:){1,7}:"
  + "|(?:[A-Fa-f0-9]{1,4}:){1,6}:[A-Fa-f0-9]{1,4}"
  + "|(?:[A-Fa-f0-9]{1,4}:){1,5}(?::[A-Fa-f0-9]{1,4}){1,2}"
  + "|(?:[A-Fa-f0-9]{1,4}:){1,4}(?::[A-Fa-f0-9]{1,4}){1,3}"
  + "|(?:[A-Fa-f0-9]{1,4}:){1,3}(?::[A-Fa-f0-9]{1,4}){1,4}"
  + "|(?:[A-Fa-f0-9]{1,4}:){1,2}(?::[A-Fa-f0-9]{1,4}){1,5}"
  + "|[A-Fa-f0-9]{1,4}:(?:(?::[A-Fa-f0-9]{1,4}){1,6})"
  + "|:(?:(?::[A-Fa-f0-9]{1,4}){1,7}|:))"
  + "(?:/\\d{1,3})?\\b"
  ]
};
// END categorization and keyword grouping


// BEGIN colorization
const defaultColors: Record<string, string> = {
  genericColor:       "#3881ff",
  securityColor:      "#ff3838",
  ipGroupColor:       "#38ffa5",
  interfaceGroupColor:"#38ff45",
  vrfGroupColor:      "#208c27",
  routingGroupColor:  "#2937ff",
  netflowGroupColor:  "#9729ff",
  dhcpGroupColor:     "#f68fff",

  ipRFC0Color:        "#FFFDE7",
  ipRFC10Color:       "#FFF9C4",
  ipLoopbackColor:    "#FFF9C4",
  ipLinkLocalColor:   "#FFF59D",
  ipPrivate172Color:  "#FFF59D",
  ipProtoAssignColor: "#FFF176",
  ipTestNet1Color:    "#FFF176",
  ip6to4Color:        "#FFEE58",
  ipPrivate192Color:  "#FFEE58",
  ipBenchmarkColor:   "#FFEB3B",
  ipTestNet2Color:    "#FFEB3B",
  ipTestNet3Color:    "#FDD835",
  ipMulticastColor:   "#FDD835",
  ipReservedColor:    "#FBC02D",
  ipBroadcastColor:   "#FBC02D",

  ipPublicColor:      "#ff5d38",
  ip6LiteralColor:    "#ff5d38"
};
// END colorization


// BEGIN function helpers
function mergeKeywords(base: Record<string,string[]>, overrides: Record<string,string[]>): Record<string,string[]> {
  const m = { ...base };
  for (const k of Object.keys(overrides)) {
    m[k] = overrides[k];
  }
  return m;
}
function escapeRegExp(txt: string): string {
  return txt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function classifyIPv4(o: number[]): string {
  const [A,B,C,D] = o;
  if (A===0)                       return 'ipRFC0';
  if (A===10)                      return 'ipRFC10';
  if (A===127)                     return 'ipLoopback';
  if (A===169 && B===254)          return 'ipLinkLocal';
  if (A===172 && B>=16 && B<=31)   return 'ipPrivate172';
  if (A===192 && B===0  && C===0)  return 'ipProtoAssign';
  if (A===192 && B===0  && C===2)  return 'ipTestNet1';
  if (A===192 && B===88 && C===99) return 'ip6to4';
  if (A===192 && B===168)          return 'ipPrivate192';
  if (A===198 && (B===18||B===19)) return 'ipBenchmark';
  if (A===198 && B===51 && C===100)return 'ipTestNet2';
  if (A===203 && B===0  && C===113)return 'ipTestNet3';
  if (A>=224 && A<=239)            return 'ipMulticast';
  if (A>=240 && A<=254)            return 'ipReserved';
  if (A===255 && B===255 && C===255 && D===255) return 'ipBroadcast';
  return 'ipPublic';
}
// END function helpers


// BEGIN module level state
let keywordRegexes: Record<string, RegExp>;
let ip4Regex: RegExp;
let ip6Regex: RegExp;
let decorations: Record<string, vscode.TextEditorDecorationType>;
// END function helpers


// BEGIN function to activate networkcolorizer
export function activateNetworkColorizer(ctx: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration('netCommander');
  const kws = mergeKeywords(defaultKeywords, cfg.get<Record<string,string[]>>('keywords', {}));
  const cols= { ...defaultColors, ...cfg.get<Record<string,string>>('colors', {}) };
  const fileAssociations = cfg.get<string[]>('fileAssociations', ['*.txt']);

  // build keyword regexes once
  keywordRegexes = {};
  for (const group of Object.keys(kws)) {
    if (group === 'ipLiteral' || group === 'ip6Literal') continue;
    const pat = kws[group].map(escapeRegExp).join('|');
    keywordRegexes[group] = new RegExp(`(?<![\\w])(?:${pat})(?![\\w])`, 'gi');
  }

  // build IP catch‑alls once
  ip4Regex = new RegExp(kws.ipLiteral[0], 'g');
  ip6Regex = new RegExp(kws.ip6Literal[0], 'g');

  // create decorations once
  decorations = {};
  for (const grp of Object.keys(keywordRegexes)) {
    decorations[grp] = vscode.window.createTextEditorDecorationType({ color: cols[grp + 'Color'] });
  }
  // IPv4 buckets
  const ipv4Buckets = [
    'ipRFC0','ipRFC10','ipLoopback','ipLinkLocal','ipPrivate172',
    'ipProtoAssign','ipTestNet1','ip6to4','ipPrivate192','ipBenchmark',
    'ipTestNet2','ipTestNet3','ipMulticast','ipReserved','ipBroadcast','ipPublic'
  ];
  for (const b of ipv4Buckets) {
    decorations[b] = vscode.window.createTextEditorDecorationType({ color: cols[b + 'Color'] });
  }
  // IPv6 bucket
  decorations.ip6Literal = vscode.window.createTextEditorDecorationType({ color: cols.ip6LiteralColor });

  // paint function
  const repaint = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !cfg.get<boolean>('enableDecorations', true)) return;

    // skip files not in your associations list
    const name = editor.document.fileName.toLowerCase();
    const lang = editor.document.languageId;
    const ok = fileAssociations.some(pat => {
      pat = pat.toLowerCase();
      if (pat.startsWith('*.')) return name.endsWith(pat.slice(1));
      return lang === pat;
    });
    if (!ok) return;

    // init empty ranges
    const ranges: Record<string, vscode.DecorationOptions[]> = {};
    for (const k of Object.keys(decorations)) ranges[k] = [];

    // scan each line
    const doc = editor.document;
    for (let i = 0; i < doc.lineCount; i++) {
      const text = doc.lineAt(i).text;

      // IPv6 first
      ip6Regex.lastIndex = 0;
      let m6: RegExpExecArray | null;
      while ((m6 = ip6Regex.exec(text))) {
        ranges.ip6Literal.push({
          range: new vscode.Range(i, m6.index, i, m6.index + m6[0].length)
        });
      }

      // IPv4 next
      ip4Regex.lastIndex = 0;
      let m4: RegExpExecArray | null;
      while ((m4 = ip4Regex.exec(text))) {
        const raw = m4[0];
        const octs = raw.split('/')[0].split('.').map(n => parseInt(n, 10));
        const bucket = classifyIPv4(octs);
        ranges[bucket].push({
          range: new vscode.Range(i, m4.index, i, m4.index + raw.length)
        });
      }

      // then keywords
      for (const [grp, re] of Object.entries(keywordRegexes)) {
        re.lastIndex = 0;
        let mk: RegExpExecArray | null;
        while ((mk = re.exec(text))) {
          ranges[grp].push({
            range: new vscode.Range(i, mk.index, i, mk.index + mk[0].length)
          });
        }
      }
    }

    // apply all
    for (const key of Object.keys(decorations)) {
      editor.setDecorations(decorations[key], ranges[key]);
    }
  };

  repaint();
  ctx.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(repaint),
    vscode.workspace.onDidChangeTextDocument(e => {
      if (vscode.window.activeTextEditor
          && e.document === vscode.window.activeTextEditor.document) {
        repaint();
      }
    })
  );
}
// END function to activate networkcolorizer

export function deactivateNetworkColorizer() {
}