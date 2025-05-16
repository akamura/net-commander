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

// src/modules/rootcauseAnalysis.ts

// =========================================================================
// IMPORT libraries or modules
// =========================================================================
import * as vscode              from 'vscode';
import * as fs                  from 'fs/promises';
import * as path                from 'path';
import { getNonce }             from '../helpers/nonce';
import { ensureModuleFolder }   from '../helpers/exporter';
import { generatePdfReport }    from '../extension';


// =========================================================================
// EXPORT functions
// =========================================================================

export type Platform =
  | 'onprem_cisco' | 'onprem_arista' | 'onprem_ciena'
  | 'azure' | 'aws' | 'gcp';
export type HostOS = 'windows' | 'linux' | 'macos';

export interface Action {
  id   : string;
  label: string;
  cmd  : string;
}

export interface Section {
  title : string;
  items : Action[];
}

// BEGIN function prepare the folder and rca markdown report
export async function prepareRootCauseAnalysis(selected: Platform) {
const modRoot = await ensureModuleFolder('root-cause-analysis');
if (!modRoot) { return; }
const rcaRoot = vscode.Uri.joinPath(
  vscode.Uri.file(modRoot),
  new Date().toISOString().replace(/[:.]/g,'-')
);

// I create the necesary folders
const baseDirs = ['logs','captures','analysis','screenshots','videos'];
for (const d of baseDirs) {
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(rcaRoot, d));
}
// special handle for configs since I will generate later txt files based on user dropdown selection
const configsRoot = vscode.Uri.joinPath(rcaRoot, 'configs');
await vscode.workspace.fs.createDirectory(configsRoot);

// write out the checklist commands as files under configs
const sections: Section[] = checklist[selected] || [];
for (const { title, items } of sections) {
  // sanitize title for folder name
  const folderName = title.replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  const sectionUri = vscode.Uri.joinPath(configsRoot, folderName);
  await vscode.workspace.fs.createDirectory(sectionUri);

  for (const { cmd } of items) {
    // make a filesystem‐safe filename from the cmd
    const safeName = cmd
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]/g, '')
      .toLowerCase() + '.txt';
    const fileUri = vscode.Uri.joinPath(sectionUri, safeName);
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(cmd, 'utf8'));
  }
}

// I geneate the markdown file in user workspace
const rcaMd = Buffer.from(`
# Root-Cause Analysis (RCA) Report  
write here a brief summary of the incident

## Table of Contents
1. [Preface](#preface)
2. [Incident Overview](#incident-overview)
3. [Impact](#impact)
4. [Timeline of Events](#timeline-of-events)
5. [Detection & Response](#detection--response)
6. [Root Cause Analysis](#root-cause-analysis)
7. [Corrective Actions (Applied)](#corrective-actions-applied)
8. [Preventive Actions (Planned)](#preventive-actions-planned)
9. [Lessons Learned](#lessons-learned)
10. [Stakeholders & Contacts](#stakeholders--contacts)
11. [Appendix](#appendix)

---

## Preface
Root-cause analysis must be **data-driven** and free from assumptions or feelings.  
Always validate facts with logs, metrics, or reproducible tests before drawing conclusions. 

*write here any additional preface text you may want to include*

---

## Incident Overview
| Field               | Value                                       |
|---------------------|---------------------------------------------|
| **Date / Time**     | write here (e.g. 10 June 2025 - 9.00AM)     |
| **Ticket number**   | write here                                  |
| **Affected Service**| write here                                  |
| **Environment**     | write here (e.g. dev / staging / prod)      |
| **Reported By**     | write here email address                    |
| **Team supporting** | write here team distribution list email     |
| **Current Status**  | write here (ongoing / mitigated / resolved) |

---

## Impact
write here brief description of customer and business impact

---

## Timeline of Events
| Timestamp (UTC) | Event Description | Evidence (Log / Metric / Screenshot) |
|-----------------|-------------------|-----------------------------------------------------------------------|
| write here      | write here        | write name of the file attached (e.g. evidence.log or screenshot.jpg) |

---

## Detection & Response
write here how the issue was detected, escalated, and initially triaged

---

## Root Cause Analysis
### Technical Root Cause  
write here the single, primary cause

### Contributing Factors  
write here configuration drift, missing alert, etc.

---

## Corrective Actions (Applied)
| Action     | Owner      | Date       | Evidence / PR |
|------------|------------|------------|---------------|
| write here | write here | write here | write here    |

---

## Preventive Actions (Planned)
| Action     | Owner      | Target Date | Status     |
|------------|------------|-------------|------------|
| write here | write here | write here  | write here |

---

## Lessons Learned
write here what went well, what can improve, tools or playbooks to update

---

## Stakeholders & Contacts
| Role | Name | Team / Line Manager | Contact |
|--------------------|------------|------------|------------|
| Incident Commander | write here | write here | write here |
| Primary Engineer   | write here | write here | write here |
| write here         | write here | write here | write here |

---

## Appendix
### Glossary  
write here acronyms & terms

### References & Links  
write here runbooks, Jira tickets, Slack threads

### Attachments Index  
logs, packet traces, configs saved under \`logs/\`, \`captures/\`, \`configs/\`, \`screenshots/\`, \`videos/\` folders

---
`);
      
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(rcaRoot, 'analysis', 'RCA_Report.md'),
    rcaMd
  );

  vscode.window.showInformationMessage(`RCA folder created: ${rcaRoot.fsPath}`);
  vscode.commands.executeCommand('revealInExplorer', rcaRoot);
}
// END function prepare the folder and rca markdown report


 

// BEGIN function pre-checklist by Operating System
export const preCheck: Record<HostOS, Action[]> = {
  windows: [
    { id: 'pre_win_ping',  label: 'Ping (ping -n 4 <host>)',                          cmd: 'ping -n 4 <host>' },
    { id: 'pre_win_trace', label: 'Traceroute (tracert <host>)',                      cmd: 'tracert <host>' },
    { id: 'pre_win_port',  label: 'Port test (Test-NetConnection -Port <port>)',      cmd: 'Test-NetConnection -Port <port>' },
    { id: 'pre_win_pcap',  label: 'Packet capture (netsh trace start / Wireshark)',   cmd: 'netsh trace start capture=yes' },
    { id: 'pre_win_logs',  label: 'Logs & perf (Get-WinEvent, typeperf, netstat -e)', cmd: 'Get-WinEvent; typeperf; netstat -e' }
  ],
  linux: [
    { id: 'pre_lin_ping',  label: 'Ping (ping -c 4 <host>)',                          cmd: 'ping -c 4 <host>' },
    { id: 'pre_lin_trace', label: 'Traceroute / MTR (traceroute | mtr <host>)',       cmd: 'traceroute <host> || mtr <host>' },
    { id: 'pre_lin_port',  label: 'Port test (nc -vz <host> <port>)',                 cmd: 'nc -vz <host> <port>' },
    { id: 'pre_lin_pcap',  label: 'Packet capture (tcpdump -i <intf> -w file.pcap)',  cmd: 'tcpdump -i <intf> -w <file>.pcap' },
    { id: 'pre_lin_logs',  label: 'Logs & metrics (journalctl, dmesg, sar)',          cmd: 'journalctl; dmesg; sar' }
  ],
  macos: [
    { id: 'pre_mac_ping',  label: 'Ping (ping -c 4 <host>)',                          cmd: 'ping -c 4 <host>' },
    { id: 'pre_mac_trace', label: 'Traceroute (traceroute <host>)',                   cmd: 'traceroute <host>' },
    { id: 'pre_mac_port',  label: 'Port test (nc -vz <host> <port>)',                 cmd: 'nc -vz <host> <port>' },
    { id: 'pre_mac_pcap',  label: 'Packet capture (sudo tcpdump -i <intf> -w file)',  cmd: 'sudo tcpdump -i <intf> -w <file>.pcap' },
    { id: 'pre_mac_logs',  label: 'Logs & metrics (log show, netstat -s)',            cmd: 'log show; netstat -s' }
  ]
};
// END function pre-checklist by Operating System


// BEGIN function specialized commands for Azure
export const specialisedAzure: Record<AzureScenario, Section[]> = {
  general: [],
  specialised: [
    {
      title: 'Advanced route & reachability',
      items: [
        {
          id:   'az_route_table_diff',
          label:'Compare UDR vs system routes (effective route table)',
          cmd:  'az network watcher route-table list-effective --vm <vm> --resource-group <rg> --output table'
        },
        {
          id:   'az_service_tags',
          label:'List Service-Tag IP ranges for a region',
          cmd:  'az network list-service-tags --location <region> --output table'
        },
        {
          id:   'az_conn_mon_stats',
          label:'Show Connection Monitor packet-loss statistics',
          cmd:  'az network watcher connection-monitor show --ids <cmId> --query "connectionMonitorResult.overallTotals"'
        },
        {
          id:   'az_vhub_routes',
          label:'Dump vWAN Hub effective routes',
          cmd:  'az network vhub get-effective-routes --name <hub> --resource-group <rg> --output table'
        }
      ]
    },
    {
      title: 'Kubernetes / PaaS helpers',
      items: [
        {
          id:   'az_aks_netpol',
          label:'Tail AKS network-policy logs (kube-proxy)',
          cmd:  'kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=200 | grep "NetworkPolicy"'
        },
        {
          id:   'az_pe_conn',
          label:'Check Private Endpoint connection state',
          cmd:  'az network private-endpoint-connection list --ids <peId> --output table'
        }
      ]
    },
    {
      title: 'Protection / defence-in-depth',
      items: [
        {
          id:   'az_ddos_status',
          label:'Query DDoS Rapid Response status',
          cmd:  'az network ddos-protection show --name <plan> --resource-group <rg>'
        }
      ]
    }
  ]
};
// END function specialized commands for Azure


// BEGIN function select general and specialised scenarios
export const azureScenarios = [
  { id: 'general',     label: 'General (default)' },
  { id: 'specialised', label: 'Specialised (SME)' }
] as const;

type AzureScenario = typeof azureScenarios[number]['id'];

export const platformScenarios: Record<Platform, { id:string; label:string }[]> = {
  azure: azureScenarios as any,
  aws: [
    { id: 'general',      label: 'General (default)' },
    { id: 'alb_5xx',      label: 'ALB 5xx' },
    { id: 'flow_reject',  label: 'FlowLog Rejects' },
    { id: 'hybrid_dx',    label: 'Hybrid DX/VPN' },
    { id: 'dns_privlink', label: 'DNS & PrivateLink' },
    { id: 'specialised',  label: 'Specialised (SME)' }
  ],
  gcp: [
    { id: 'general',       label: 'General (default)' },
    { id: 'lb_5xx',        label: 'HTTP LB 5xx' },
    { id: 'flow_drops',    label: 'VPC Flow Drops' },
    { id: 'hybrid_ic_vpn', label: 'Hybrid Interconnect/VPN' },
    { id: 'dns_psc',       label: 'DNS & PSC' },
    { id: 'specialised',   label: 'Specialised (SME)' }
  ],
  onprem_cisco:  [],
  onprem_arista: [],
  onprem_ciena:  []
};
// END function select general and specialised scenarios


// BEGIN function specialized commands for Amazon AWS and Google Cloud Platform GCP
export const specialisedTasks: Record<Platform, Record<string, Section[]>> = {
  azure: specialisedAzure,
  aws: {
    general: [
      {
        title: 'General – cloud-wide network checks',
        items: [
          {
            id:   'aws_health_net',
            label:'AWS Health: open network-service issues',
            cmd:  'aws health describe-events --filter services=EC2,VPC,DIRECT_CONNECT --query events'
          },
          {
            id:   'aws_reach_path',
            label:'Run VPC Reachability Analyzer path-test',
            cmd:  'aws ec2 start-network-insights-path --source <eniId> --destination <eniId|IPv4>'
          },
          {
            id:   'aws_cfg_diff',
            label:'Config timeline diff – VPC / SG / RT changes',
            cmd:  `aws configservice select-aggregate-resource-config \
--expression "SELECT * WHERE resourceType IN ('AWS::EC2::SecurityGroup','AWS::EC2::RouteTable') \
AND configurationItemCaptureTime >= timestamp('-PT1H')"`
          }
        ]
      }
    ],

    alb_5xx: [
      {
        title: 'ALB / NLB 5xx troubleshooting',
        items: [
          {
            id:   'aws_alb_tg_err',
            label:'Describe ALB target-group health',
            cmd:  'aws elbv2 describe-target-health --target-group-arn <tgArn>'
          },
          {
            id:   'aws_alb_athena_5xx',
            label:'Athena: count ELB_5XX_ERROR in access-logs',
            cmd:  `SELECT elb_status_code, count(*) \
FROM alb_logs WHERE elb_status_code >= 500 \
GROUP BY elb_status_code LIMIT 20;`
          },
          {
            id:   'aws_alb_desync',
            label:'Enable HTTP desync-mitigation mode',
            cmd:  'aws elbv2 modify-load-balancer-attributes --load-balancer-arn <albArn> \
--attributes Key=load_balancing.cross_zone.enabled,Value=true'
          },
          {
            id:   'aws_alb_xff',
            label:'Verify X-Forwarded-For header preservation',
            cmd:  `aws elbv2 describe-load-balancer-attributes \
--load-balancer-arn <albArn> \
--query "Attributes[?Key=='access_logs.s3.enabled']"`
          }
        ]
      }
    ],

    flow_reject: [
      {
        title: 'Flow-log rejects & threat findings',
        items: [
          {
            id:   'aws_flow_athena',
            label:'Athena: recent VPC Flow Log REJECTs',
            cmd:  `SELECT * FROM flow_logs \
WHERE action='REJECT' \
AND from_unixtime(start) > now() - interval '15' minute \
LIMIT 200;`
          },
          {
            id:   'aws_gd_portprobe',
            label:'GuardDuty PortProbe findings',
            cmd:  'aws guardduty list-findings --detector-id <detId> --finding-criteria file://portprobe.json'
          },
          {
            id:   'aws_flow_reason',
            label:'Show Flow-Log drop-reason codes',
            cmd:  'aws ec2 describe-flow-logs --query "FlowLogs[*].LogFormat"'
          }
        ]
      }
    ],

    hybrid_dx: [
      {
        title: 'Hybrid connectivity (Direct Connect / VPN)',
        items: [
          {
            id:   'aws_dx_vifs',
            label:'Direct Connect virtual-interface state',
            cmd:  'aws dx describe-virtual-interfaces --connection-id <dxId>'
          },
          {
            id:   'aws_vpn_tunnel_metric',
            label:'CloudWatch: VPN TunnelState metrics',
            cmd:  'aws cloudwatch get-metric-statistics \
--metric-name TunnelState --namespace AWS/VPN \
--statistics Maximum \
--dimensions Name=VPNId,Value=<vpnId>'
          },
          {
            id:   'aws_dx_los',
            label:'Check DX LOA-CFA light-levels',
            cmd:  'aws dx describe-loa --connection-id <dxId> --provider-name <circuit>'
          }
        ]
      }
    ],

    dns_privlink: [
      {
        title: 'DNS & PrivateLink',
        items: [
          {
            id:   'aws_privlink',
            label:'List VPC endpoint connection state',
            cmd:  'aws ec2 describe-vpc-endpoints \
--filters Name=vpc-endpoint-type,Values=Interface'
          },
          {
            id:   'aws_r53_nxd',
            label:'Route 53 Resolver NXDOMAIN spikes',
            cmd:  `aws logs start-query \
--log-group-name "/aws/route53resolver" \
--start-time <epoch> --end-time <epoch> \
--query-string "fields @timestamp, query_name | filter rcode==3"`
          },
          {
            id:   'aws_r53_rules',
            label:'Show Resolver inbound/outbound rules',
            cmd:  'aws route53resolver list-resolver-rules'
          }
        ]
      }
    ],

    specialised: [
      {
        title: 'Advanced / SME toolbox',
        items: [
          {
            id:   'aws_tgw_diff',
            label:'Transit Gateway route-table diff',
            cmd:  'aws ec2 search-transit-gateway-routes \
--transit-gateway-route-table-id <rtId> \
--prefix-list-id <plId>'
          },
          {
            id:   'aws_ipam_v6',
            label:'List IPv6 scopes in IPAM',
            cmd:  'aws ec2 get-ipam-scope --ipam-scope-id <scopeId>'
          },
          {
            id:   'aws_ena_drv',
            label:'ENA driver stats via SSM',
            cmd:  'aws ssm send-command \
--instance-ids <id> \
--document-name "AWS-RunShellScript" \
--parameters commands="ethtool -S eth0"'
          },
          {
            id:   'aws_gwlb_flow',
            label:'Athena query: Gateway Load Balancer drops',
            cmd:  `SELECT action, count(*) \
FROM gwlbe_logs WHERE action = 'DROP' \
GROUP BY action LIMIT 20;`
          },
          {
            id:   'aws_ga_health',
            label:'Global Accelerator endpoint health',
            cmd:  'aws globalaccelerator describe-endpoint-groups \
--listener-arn <listenerArn>'
          },
          {
            id:   'aws_ddb_dns',
            label:'Dig DynamoDB VPCE DNS endpoint',
            cmd:  'dig +short <table>.dynamodb.<region>.amazonaws.com'
          }
        ]
      }
    ]
  },
  // END Amazon AWS commands

  // BEGIN Google Cloud Platform GCP commands
  gcp: {
    general: [
      {
        title: 'Cloud-wide network sanity',
        items: [
          {
            id:   'gcp_region_status',
            label:'Regional Service-Health – networking services',
            cmd:  'curl -s https://status.cloud.google.com/incidents.json | jq -r \'.[] | select(.service_key=="networking") | .external_desc\''
          },
          {
            id:   'gcp_route_blackhole',
            label:'Find black-hole routes across all VPCs',
            cmd:  'gcloud compute routes list --filter="nextHopGateway:default-internet-gateway AND status:BLACKHOLE" --format="table(name,network,destRange)"'
          },
          {
            id:   'gcp_fw_recent',
            label:'Firewall rule changes in the last hour',
            cmd:  'gcloud logging read \'resource.type="gce_firewall_rule" AND timestamp>="-1h"\' --limit 50 --format="table(timestamp, protoPayload.methodName, protoPayload.request.name)"'
          }
        ]
      }
    ],

    lb_5xx: [
      {
        title: 'HTTP(S) / TCP Load Balancer 5xx',
        items: [
          {
            id:   'gcp_lb_backend',
            label:'Backend-service health probes',
            cmd:  'gcloud compute backend-services get-health <backend-service> --region <region>'
          },
          {
            id:   'gcp_lb_logs_5xx',
            label:'Logging: backend_error & 5xx spikes',
            cmd:  'gcloud logging read \'resource.type="http_load_balancer" AND statusDetails="backend_error" AND timestamp>="-15m"\' --limit 200 --format=json'
          },
          {
            id:   'gcp_armor_preview',
            label:'Cloud Armor preview-mode DROP count',
            cmd:  'gcloud logging read \'jsonPayload.disposition="preview_drop" AND resource.type="http_load_balancer" AND timestamp>="-15m"\' --format="value(jsonPayload.disposition)"'
          }
        ]
      }
    ],

    flow_drops: [
      {
        title: 'VPC Flow-log drops & policy issues',
        items: [
          {
            id:   'gcp_flow_kql',
            label:'Flow-Log: dropped=true, group by src/dst',
            cmd:  'gcloud logging read \'jsonPayload.connection.dropped=true AND timestamp>="-15m"\' --format="table(jsonPayload.src.ip, jsonPayload.dst.ip, jsonPayload.nw.dropped_reason)"'
          },
          {
            id:   'gcp_net_shadow',
            label:'Network Analyzer firewall-shadow findings',
            cmd:  'gcloud compute network-endpoint-groups list-network-endpoints --filter="firewallShadowing:true" --format="table(name, network, instance)"'
          },
          {
            id:   'gcp_flow_drop_reason',
            label:'Top 10 drop-reason codes (BigQuery)',
            cmd:  'bq query --use_legacy_sql=false "SELECT dropped_reason, COUNT(1) AS c FROM `project.vpc_flows.flow_logs_*` WHERE _PARTITIONTIME > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE) GROUP BY dropped_reason ORDER BY c DESC LIMIT 10"'
          }
        ]
      }
    ],

    hybrid_ic_vpn: [
      {
        title: 'Hybrid connectivity: Interconnect & VPN',
        items: [
          {
            id:   'gcp_router_status',
            label:'Cloud Router BGP route-table status',
            cmd:  'gcloud compute routers get-status <router> --region <region> --format="json(result.bgpPeerStatus)"'
          },
          {
            id:   'gcp_ic_optics',
            label:'Dedicated Interconnect optics & LOS',
            cmd:  'gcloud compute interconnects describe <interconnect> --format="table(name,expectedLinkCount,operationalStatus,receivedLightLevel.dBm)"'
          },
          {
            id:   'gcp_vpn_tunnel_state',
            label:'VPN tunnel status & renegotiations',
            cmd:  'gcloud compute vpn-tunnels list --filter="status!=ESTABLISHED" --format="table(name,region,targetVpnGateway,status)"'
          }
        ]
      }
    ],

    dns_psc: [
      {
        title: 'DNS & Private Service Connect',
        items: [
          {
            id:   'gcp_psc_list',
            label:'List PSC forwarding-rules / endpoints',
            cmd:  'gcloud compute forwarding-rules list --filter="purpose:PRIVATE_SERVICE_CONNECT" --format="table(name,loadBalancingScheme,network,subnetwork)"'
          },
          {
            id:   'gcp_dns_policy',
            label:'Enumerate Cloud DNS policies',
            cmd:  'gcloud dns policies list --format="table(name,description,enableInboundForwarding,networks[0].networkUrl)"'
          },
          {
            id:   'gcp_dns_trace',
            label:'Trace-resolve via 35.199.192.0/26',
            cmd:  'dig @35.199.192.0 <fqdn> +tcp +trace'
          }
        ]
      }
    ],

    specialised: [
      {
        title: 'SME toolbox / advanced',
        items: [
          {
            id:   'gcp_hfw_hits',
            label:'Hierarchical FW policy rule hit-count',
            cmd:  'gcloud compute firewall-policies rules list --firewall-policy <policyId> --format="table(priority,direction,action,hitCount)"'
          },
          {
            id:   'gcp_vpcsc_deny',
            label:'VPC-SC perimeter egress denies',
            cmd:  'gcloud logging read \'logName:"access_context_manager.googleapis.com/access_denied" AND timestamp>="-30m"\' --limit=100 --format=json'
          },
          {
            id:   'gcp_pmirror_util',
            label:'Packet Mirroring span-port utilisation',
            cmd:  'gcloud compute packet-mirrorings describe <mirror-name> --region <region> --format="json(mirroredResources)"'
          },
          {
            id:   'gcp_ncc_health',
            label:'Network Connectivity Center hub/spoke health',
            cmd:  'gcloud network-connectivity hubs describe <hub> --format="json(spokesState)"'
          },
          {
            id:   'gcp_dns_resv',
            label:'Cloud DNS resolver endpoint status',
            cmd:  'gcloud dns resolver endpoints list --location=<region> --format="table(name,state,ipAddress)"'
          },
          {
            id:   'gcp_ddos_adapt',
            label:'Adaptive Protection L7 DDoS events',
            cmd:  'gcloud logging read \'jsonPayload.action="BYPASS" AND jsonPayload.attackType="L7_DDOS" AND timestamp>="-1h"\' --format="table(timestamp,jsonPayload.attackType,protoPayload.requestHeaders.x-envoy-original-path)"'
          },
          {
            id:   'gcp_nat_util',
            label:'Cloud NAT port utilisation overview',
            cmd:  'gcloud compute routers nats list --router=<router> --region=<region> --format="table(name,minPortsPerVm,natIpAllocateOption,udpIdleTimeoutSec,tcpEstablishedIdleTimeoutSec)"'
          }
        ]
      }
    ]
  },
  onprem_cisco:  {},
  onprem_arista: {},
  onprem_ciena:  {}
};
// END function specialized commands for Amazon AWS and Google Cloud Platform GCP


   
// BEGIN function specialized commands for On-premise Cisco, Arista and Ciena devices and advanced Azure, AWS and GCP
export const checklist: Record<Platform, Section[]> = {

  // BEGIN Cisco - advanced checklist
  onprem_cisco: [
    {
      title: 'Baseline snapshots',
      items: [
        { id: 'c_run_cfg',  label: 'Capture running configuration',             cmd: 'show running-config' },
        { id: 'c_tech',     label: 'Collect tech-support bundle',               cmd: 'show tech-support' },
        { id: 'c_ver',      label: 'Record hardware & IOS version',             cmd: 'show version' },
        { id: 'c_redund',   label: 'Redundancy',                                cmd: 'show redundancy status' }
      ]
    },
    {
      title: 'Physical & transceiver health',
      items: [
        { id: 'c_intf_status', label: 'Verify link status',                     cmd: 'show interfaces status' },
        { id: 'c_err_cnt',     label: 'Interface error counters',               cmd: 'show interfaces counters errors' },
        { id: 'c_storm',       label: 'Storm-control / burst counters',         cmd: 'show interfaces counters storm-control' },
        { id: 'c_optics',      label: 'Optics / DOM details',                   cmd: 'show interfaces transceiver detail' },
        { id: 'c_phy',         label: 'PHY diagnostics (per port)',             cmd: 'show controllers ethernet-controller <intf> phy' }
      ]
    },
    {
      title: 'Layer-2 control plane',
      items: [
        { id: 'c_stp_root',    label: 'Spanning-tree root & roles',             cmd: 'show spanning-tree root' },
        { id: 'c_stp_incon',   label: 'STP inconsistent ports',                 cmd: 'show spanning-tree inconsistentports' },
        { id: 'c_portchannel', label: 'EtherChannel state summary',             cmd: 'show etherchannel summary' },
        { id: 'c_vlan',        label: 'VLAN database / internal usage',         cmd: 'show vlan brief ; show vlan internal usage' },
        { id: 'c_fhrp',        label: 'HSRP / VRRP / GLBP groups',              cmd: 'show standby brief ; show vrrp brief' }
      ]
    },
    {
      title: 'Layer-3 control plane',
      items: [
        { id: 'c_route',      label: 'Routing table & FIB stats',               cmd: 'show ip route summary ; show ip cef statistics' },
        { id: 'c_cef_lookup', label: 'CEF exact-route lookup',                  cmd: 'show ip cef exact-route <src> <dst>' },
        { id: 'c_ospf',       label: 'OSPF neighbours & interfaces',            cmd: 'show ip ospf neighbor ; show ip ospf interface brief' },
        { id: 'c_eigrp',      label: 'EIGRP neighbour detail',                  cmd: 'show ip eigrp neighbors detail' },
        { id: 'c_bgp',        label: 'BGP summary & flap counters',             cmd: 'show ip bgp summary ; show bgp sessions' }
      ]
    },
    {
      title: 'Data-plane / ASIC diagnostics',
      items: [
        { id: 'c_qfp',       label: 'QFP datapath utilisation',                 cmd: 'show platform hardware qfp active statistics datapath' },
        { id: 'c_qfp_queue', label: 'QFP queue drop stats',                     cmd: 'show platform hardware qfp active queue stats' },
        { id: 'c_tcam',      label: 'TCAM utilisation overview',                cmd: 'show platform tcam utilization' },
        { id: 'c_acl_tcam',  label: 'ACL / QoS TCAM usage',                     cmd: 'show platform hardware fed switch acl usage' },
        { id: 'c_qos',       label: 'QoS policy-map interface stats',           cmd: 'show policy-map interface' }
      ]
    },
    {
      title: 'Control-plane & CPU',
      items: [
        { id: 'c_cpu',         label: 'CPU 5-sec & interrupt load',             cmd: 'show processes cpu sorted 5sec ; show processes cpu interrupt' },
        { id: 'c_mem',         label: 'Memory usage high-water',                cmd: 'show processes memory sorted' },
        { id: 'c_input_queue', label: 'Input queue drops / misses',             cmd: 'show interfaces | include drops|misses' }
      ]
    },
    {
      title: 'Security / filtering',
      items: [
        { id: 'c_acl_hits', label: 'ACL hit counters',                          cmd: 'show access-lists | include hitcnt' },
        { id: 'c_flow',     label: 'NetFlow / NBAR top talkers',                cmd: 'show flow exporter statistics ; show ip nbar protocol-discovery' },
        { id: 'c_cpp',      label: 'Control-plane policing status',             cmd: 'show policy-map control-plane input' }
      ]
    },
    {
      title: 'Tables & forwarding state',
      items: [
        { id: 'c_arp',      label: 'ARP / ND anomalies',                        cmd: 'show ip arp ; show ipv6 neighbor' },
        { id: 'c_mac_move', label: 'MAC address moves / flaps',                 cmd: 'show mac address-table move' }
      ]
    },
    {
      title: 'Environment & power',
      items: [
        { id: 'c_env', label: 'Environmental sensors & PSU',                    cmd: 'show environment all ; show platform power' },
        { id: 'c_poe', label: 'PoE inline power status',                        cmd: 'show power inline ; show poe-inline police' }
      ]
    },
    {
      title: 'Logs & event history',
      items: [
        { id: 'c_logs',       label: 'Recent syslog buffer',                    cmd: 'show logging | tail' },
        { id: 'c_cores',      label: 'Crash / core files',                      cmd: 'dir crashinfo: ; show system cores' },
        { id: 'c_event_hist', label: 'EEM / event history logs',                cmd: 'show event history errors ; show event history events' }
      ]
    }
  ],
  // END Cisco - advanced checklist

  // BEGIN Arista EOS - advanced checklist
  onprem_arista: [
    {
      title: 'Baseline & snapshots',
      items: [
        { id:'a_run_cfg',  label:'Capture running configuration',               cmd:'show running-config full' },
        { id:'a_tech',     label:'Collect tech-support bundle',                 cmd:'show tech-support' },
        { id:'a_ver',      label:'Record hardware model & EOS version',         cmd:'show version' },
        { id:'a_redund',   label:'Redundancy / HA state',                       cmd:'show redundancy status' }
      ]
    },
    {
      title: 'Physical & transceiver health',
      items: [
        { id:'a_intf_status', label:'Interface link status',                    cmd:'show interfaces status' },
        { id:'a_err_cnt',     label:'Error / discard counters',                 cmd:'show interfaces counters errors' },
        { id:'a_queue',       label:'Queue drop counters',                      cmd:'show interfaces counters queue' },
        { id:'a_optics',      label:'Optics / DOM details',                     cmd:'show interfaces transceiver detail' },
        { id:'a_phy',         label:'SFP diagnostics (sfputil)',                cmd:'bash sudo sfputil show' }
      ]
    },
    {
      title: 'Layer-2 control plane',
      items: [
      { id:'a_lldp',       label:'LLDP neighbour detail',                       cmd:'show lldp neighbours detail' },
        { id:'a_stp_root',   label:'Spanning-tree root & roles',                cmd:'show spanning-tree root' },
        { id:'a_portchannel',label:'Port-channel / LAG summary',                cmd:'show port-channel summary' },
        { id:'a_vlan',       label:'VLAN database & usage',                     cmd:'show vlan brief' },
        { id:'a_mlag',       label:'MLAG session state',                        cmd:'show mlag' },
        { id:'a_vrrp',       label:'VRRP groups',                               cmd:'show vrrp brief' }
      ]
    },
    {
      title: 'Layer-3 control plane',
      items: [
        { id:'a_route',     label:'Routing table & ECMP distribution',          cmd:'show ip route summary' },
        { id:'a_fwd',       label:'Forwarding-plane lookup',                    cmd:'show forwarding-table forwarding-paths' },
        { id:'a_ospf',      label:'OSPF neighbour status',                      cmd:'show ip ospf neighbor' },
        { id:'a_isis',      label:'IS-IS adjacencies',                          cmd:'show isis adjacency' },
        { id:'a_bgp',       label:'BGP peers & flap counters',                  cmd:'show ip bgp summary vrf all' }
      ]
    },
    {
      title: 'VXLAN / EVPN overlay',
      items: [
        { id:'a_evpn',        label:'EVPN peer state',                          cmd:'show bgp evpn summary' },
        { id:'a_vxlan_vtep',  label:'VTEP & VXLAN interface status',            cmd:'show vxlan vtep' },
        { id:'a_vxlan_table', label:'Overlay MAC/IP learn table',               cmd:'show vxlan address-table' }
      ]
    },
    {
      title: 'Data-plane / ASIC diagnostics',
      items: [
        { id:'a_sand',     label:'Broadcom ASIC drop counters',                 cmd:'show platform sand drop counters' },
        { id:'a_tcam',     label:'TCAM utilisation',                            cmd:'show platform tcam utilization' },
        { id:'a_acl_hits', label:'ACL hit counters',                            cmd:'show access-lists counters' },
        { id:'a_qos',      label:'QoS queue policy stats',                      cmd:'show interfaces counters qos' }
      ]
    },
    {
      title: 'Control-plane & resources',
      items: [
        { id:'a_cpu', label:'CPU utilisation (one-shot top)',                   cmd:'show processes top once' },
        { id:'a_mem', label:'Memory usage (sorted)',                            cmd:'show processes memory sorted' }
      ]
    },
    {
      title: 'Tables & addressing',
      items: [
        { id:'a_arp',      label:'ARP / ND neighbour anomalies',                cmd:'show ip arp ; show ipv6 neighbors' },
        { id:'a_mac_move', label:'MAC address moves / flaps',                   cmd:'show mac address-table move' }
      ]
    },
    {
      title: 'Environment & power',
      items: [
        { id:'a_env', label:'Temperature / fan / PSU sensors',                  cmd:'show environment all' },
        { id:'a_poe', label:'PoE power draw',                                   cmd:'show power inline' }
      ]
    },
    {
      title: 'Logs & event history',
      items: [
        { id:'a_logs',      label:'Recent syslog messages',                     cmd:'show logging last 200' },
        { id:'a_cores',     label:'Core / crash files',                         cmd:'bash ls /var/core/' },
        { id:'a_event_hist',label:'Event-monitor – flaps / errors',             cmd:'show event-monitor errors' }
      ]
    },
    {
      title: 'Built-in diagnostics',
      items: [
        { id:'a_sensor', label:'Run EOS sensor analyzers',                      cmd:'bash cl_sensor' },
        { id:'a_pcap',   label:'Embedded packet capture',                       cmd:'monitor capture CAP interface <port> match any both ; monitor capture CAP start' }
      ]
    }
  ],
  // END Arista EOS - advanced checklist

  // BEGIN Ciena SAOS - advanced checklist
  onprem_ciena: [
    {
      title: 'Baseline & snapshots',
      items: [
      { id: 'ci_alarms',    label: 'Active & historical alarms',                cmd: 'show alarms active ; show alarms history' },
        { id: 'ci_support',   label: 'Save support bundle',                     cmd: 'admin save-support-info' },
        { id: 'ci_run_cfg',   label: 'Snapshot running configuration',          cmd: 'admin show running-config' },
        { id: 'ci_ver',       label: 'Hardware & software version',             cmd: 'show version ; show system' }
      ]
    },
    {
      title: 'Card & module health',
      items: [
        { id: 'ci_card',   label: 'Card / module status & LEDs',                cmd: 'show card fault ; show card detail' },
        { id: 'ci_queues', label: 'ASIC queue & egress statistics',             cmd: 'show port queue-statistics' }
      ]
    },
    {
      title: 'Optical & physical layer',
      items: [
        { id: 'ci_port_status', label: 'Port state & speed/duplex',             cmd: 'show port status' },
        { id: 'ci_optics',      label: 'Optical power & laser bias',            cmd: 'show port optics detail' },
        { id: 'ci_ddm',         label: 'Pluggable diagnostics (DDM)',           cmd: 'show pluggable-diagnostics all' },
        { id: 'ci_otn',         label: 'OTU / OTN performance monitor',         cmd: 'show otu performance-monitor' }
      ]
    },
    {
      title: 'Carrier Ethernet & L2 control',
      items: [
        { id: 'ci_lldp',     label: 'LLDP neighbours',                          cmd: 'show lldp remote-devices detail' },
        { id: 'ci_g8032',    label: 'G.8032 ring status',                       cmd: 'show g8032 ring detail' },
        { id: 'ci_mef',      label: 'MEF service instances',                    cmd: 'show service mef-uni detail' },
        { id: 'ci_eoam',     label: 'Ethernet OAM link events',                 cmd: 'show ethernet oam remote detail' },
        { id: 'ci_mac_move', label: 'MAC-table moves / flaps',                  cmd: 'show bridge mac-table move-statistics' }
      ]
    },
    {
      title: 'MPLS / L2VPN / Segment-Routing',
      items: [
        { id: 'ci_mpls', label: 'LSP database & path status',                   cmd: 'show mpls lsp detail' },
        { id: 'ci_pw',   label: 'Pseudowire / VLL status',                      cmd: 'show l2vpn pw-service all' },
        { id: 'ci_srgb', label: 'Segment-routing globals',                      cmd: 'show segment-routing' }
      ]
    },
    {
      title: 'Layer-3 control plane',
      items: [
        { id: 'ci_isis', label: 'ISIS / OSPF adjacencies',                      cmd: 'show isis adjacency ; show ospf neighbor' },
        { id: 'ci_route', label: 'Routing table & FIB',                         cmd: 'show ip route summary ; show route-table detail' },
        { id: 'ci_bgp',   label: 'BGP sessions & flap counters',                cmd: 'show bgp summary' },
        { id: 'ci_arp',   label: 'ARP / ND anomalies',                          cmd: 'show arp detail ; show ipv6 neighbor' }
      ]
    },
    {
      title: 'Timing & synchronisation',
      items: [
        { id: 'ci_ptp',    label: 'PTP / IEEE-1588 status',                     cmd: 'show ptp clock-status ; show ptp ports' },
        { id: 'ci_synce',  label: 'SyncE ESMC state',                           cmd: 'show synce esmc-status' },
        { id: 'ci_timing', label: 'BITS / TOD input quality',                   cmd: 'show timing-sources' }
      ]
    },
    {
      title: 'Environment & power',
      items: [
        { id: 'ci_env',   label: 'Temperature / fan / PSU sensors',             cmd: 'show environment all' },
        { id: 'ci_power', label: 'Power draw per slot',                         cmd: 'show power nominal ; show power actual' }
      ]
    },
    {
      title: 'Control-plane & resources',
      items: [
        { id: 'ci_cpu', label: 'CPU utilisation per process',                   cmd: 'show system cpu' },
        { id: 'ci_mem', label: 'Memory usage high-water',                       cmd: 'show system memory detail' }
      ]
    },
    {
      title: 'Logs & diagnostics',
      items: [
        { id: 'ci_logs',      label: 'Syslog buffer & filters',                 cmd: 'show logging buffer' },
        { id: 'ci_cores',     label: 'Core / exception logs',                   cmd: 'dir core: ; show tech core' },
        { id: 'ci_event_hist',label: 'Event history (flaps / deletes)',         cmd: 'show event-history system' }
      ]
    },
    {
      title: 'Packet capture & test tools',
      items: [
        { id: 'ci_pcap',        label: 'Embedded packet capture',               cmd: 'pkt-cap start interface <port> write-file <file>.pcap' },
        { id: 'ci_traffic_gen', label: 'Built-in traffic generator',            cmd: 'traffic test pattern-gen start ; traffic test pattern-gen stop' }
      ]
    }
  ],
  // END Ciena SAOS - advanced checklist

  // BEGIN Microsoft Azure – advanced (network‑centric)
  azure: [
    {
      title: 'Subscription & Service Health',
      items: [
        { id: 'az_health',     label: 'Current Azure-wide service issues',        cmd: 'az service-health show --query issues --output table' },
        { id: 'az_res_health', label: 'Resource Health – VNets / NICs / LBs',     cmd: 'az resource-health list-by-resource --resource-type Microsoft.Network' },
        { id: 'az_activity',   label: 'Activity-log failures (last 200)',         cmd: 'az monitor activity-log list --status Failed --max-events 200' },
        { id: 'az_change',     label: 'Change-analysis diff – network resources', cmd: 'az resource-graph query --query "Resources | where type =~ \'Microsoft.Network\'"' }
      ]
    },
    {
      title: 'Connectivity Diagnostics (Network Watcher)',
      items: [
        { id: 'az_conn_tr',    label: 'Single-hop connectivity test',             cmd: 'az network watcher test-connectivity --source-resource <vm> --dest-address <ip> --dest-port 443' },
        { id: 'az_conn_check', label: 'Multi-hop connectivity path',              cmd: 'az network watcher test-connectivity --source-resource <vmA> --dest-resource <vmB>' },
        { id: 'az_topology',   label: 'Topology map (JSON)',                      cmd: 'az network watcher show-topology --location <region>' }
      ]
    },
    {
      title: 'Effective Policy Evaluation',
      items: [
        { id: 'az_effective_nsg',   label: 'Effective NSG – NIC & subnet',        cmd: 'az network nic show-effective-nsg --ids <nicId>' },
        { id: 'az_effective_route', label: 'Effective route table',               cmd: 'az network nic show-effective-route-table --ids <nicId>' }
      ]
    },
    {
      title: 'Packet & Flow Inspection',
      items: [
        { id: 'az_pcap_start', label: 'Start packet capture (5 min)',      cmd: 'az network watcher packet-capture create --vm <vmId> --file-path /capt/cap1 --time-limit 300' },
        { id: 'az_pcap_dl',    label: 'Download packet capture file',      cmd: 'az network watcher packet-capture show --resource-group <rg> --vm <vmId> --name cap1 --query storageLocation.filePath' },
        { id: 'az_flow',       label: 'Enable NSG flow-logs + analytics',  cmd: 'az network watcher flow-log configure --nsg <nsgId> --enabled true --traffic-analytics' }
      ]
    },
    {
      title: 'NIC-level Telemetry',
      items: [
        { id: 'az_nic_metrics', label: 'NIC packet counters (Monitor)',         cmd: 'az monitor metrics list --resource <nicId> --metric "NetworkPacketsIn,NetworkPacketsOut"' },
        { id: 'az_accel_net',   label: 'SR-IOV / accelerated-networking stats', cmd: 'az vm nic-show-detail --ids <nicId> --query "srIovStats"' }
      ]
    },
    {
      title: 'Load Balancer',
      items: [
        { id: 'az_lb_backend', label: 'LB backend health',     cmd: 'az network lb show-backend-health --lb-name <lb> --resource-group <rg>' },
        { id: 'az_lb_probe',   label: 'LB probe status',       cmd: 'az network lb probe show --lb-name <lb> --name <probe> --resource-group <rg>' },
        { id: 'az_lb_snat',    label: 'SNAT port utilisation', cmd: 'az monitor metrics list --resource <lbId> --metric SnatConnectionCount' }
      ]
    },
    {
      title: 'App Gateway / WAF',
      items: [
        { id: 'az_appgw_health', label: 'App Gateway backend health', cmd: 'az network application-gateway show-backend-health --name <agw> --resource-group <rg>' },
        { id: 'az_appgw_waf',    label: 'WAF log query (KQL)',        cmd: '"AzureDiagnostics | where ResourceType==\'APPLICATIONGATEWAYFIREWALL\'"' }
      ]
    },
    {
      title: 'Azure Firewall',
      items: [
        { id: 'az_afw_logs', label: 'Firewall rule hits (KQL)', cmd: '"AzureDiagnostics | where Category==\'AzureFirewallNetworkRule\'"' }
      ]
    },
    {
      title: 'Routing & Hybrid connectivity',
      items: [
        { id: 'az_ars_bgp',      label: 'Route Server BGP peer status',         cmd: 'az network route-server peering list --resource-group <rg> --name <rs>' },
        { id: 'az_er_vpn',       label: 'VPN / ExpressRoute IPSec stats',       cmd: 'az network vpn-connection list-ipsec-ike-stats --name <conn> --resource-group <rg>' },
        { id: 'az_vwan',         label: 'Virtual WAN connection health',        cmd: 'az network vwan list-connections --vwan-name <vw> --resource-group <rg>' },
        { id: 'az_vnet_peering', label: 'VNet-peering flags & state',           cmd: 'az network vnet peering show --vnet-name <vnet> --name <peer> --resource-group <rg>' }
      ]
    },
    {
      title: 'Private Link / DNS',
      items: [
        { id: 'az_priv_dns', label: 'Private DNS zone-to-VNet links',             cmd: 'az network private-dns link vnet list --zone-name <zone> --resource-group <rg>' },
        { id: 'az_dns',      label: 'Internal DNS resolve test (168.63.129.16)',  cmd: 'dig @168.63.129.16 <fqdn>' }
      ]
    },
    {
      title: 'Security & Protection',
      items: [
        { id: 'az_ddos',           label: 'DDoS plan Under-Attack metric', cmd: 'az monitor metrics list --resource <planId> --metric UnderDDoSAttack' },
        { id: 'az_monitor_alerts', label: 'NSG counter alert query (KQL)', cmd: '"AzureNetworkAnalytics_CL | summarize count()"' }
      ]
    },
    {
      title: 'Cloud Shell / advanced helpers',
      items: [
        { id: 'az_ipflow',       label: 'IP Flow Verify',                   cmd: 'az network watcher test-ip-flow --local <srcIP> --remote <dstIP> --port 443 --protocol TCP' },
        { id: 'az_next_hop',     label: 'Next-hop lookup',                  cmd: 'az network watcher show-next-hop --source-ip <srcIP> --dest-ip <dstIP>' },
        { id: 'az_nsg_watch',    label: 'Real-time NSG hit counters',       cmd: 'watch -n1 az network watcher nsg-flow-log show --location <region> --nsg-name <nsg>' },
        { id: 'az_conn_monitor', label: 'Connection Monitor list',          cmd: 'az network watcher connection-monitor list --location <region>' },
        { id: 'az_vm_netstat',   label: 'In-guest netstat via Run Command', cmd: 'az vm run-command invoke --command-id RunShellScript --scripts "ss -ant" --ids <vmId>' }
      ]
    }
  ],
  // END Microsoft Azure – advanced (network‑centric)

  // BEGIN Amazon Web Services – advanced (net‑engineer view)
  aws: [
    {
      title: 'Cloud-wide health & change tracking',
      items: [
        {
          id:   'aws_health',
          label:'AWS Health – open networking issues',
          cmd:  'aws health describe-events --filter services=EC2,VPC,DIRECT_CONNECT --query events'
        },
        {
          id:   'aws_cloudtrail',
          label:'CloudTrail – last hour VPC / SG / NACL changes',
          cmd:  'aws cloudtrail lookup-events --start-time $(date -u -d "-1 hour" +%Y-%m-%dT%H:%M:%SZ) --lookup-attributes AttributeKey=EventSource,AttributeValue=ec2.amazonaws.com'
        },
        {
          id:   'aws_config',
          label:'AWS Config diff – network resources',
          cmd:  'aws configservice select-aggregate-resource-config --expression "SELECT * WHERE resourceType IN (\'AWS::EC2::VPC\',\'AWS::EC2::SecurityGroup\',\'AWS::EC2::NetworkAcl\') AND configurationItemCaptureTime >= timestamp(\'-PT1H\')"'
        }
      ]
    },
    {
      title: 'VPC reachability & policy evaluation',
      items: [
        {
          id:   'aws_reach',
          label:'Reachability Analyzer path test',
          cmd:  'aws ec2 start-network-insights-path --source <eniId> --destination <eniId|IPv4>'
        },
        {
          id:   'aws_net_access',
          label:'Network Access Analyzer multi-account scan',
          cmd:  'aws ec2 start-network-insights-access-scope-analysis --access-scope-id <scopeId>'
        },
        {
          id:   'aws_effective_route',
          label:'Effective route table on ENI',
          cmd:  'aws ec2 describe-network-interfaces --network-interface-ids <eniId> --query "NetworkInterfaces[0].Routes"'
        },
        {
          id:   'aws_effective_sg',
          label:'Effective SG rules on ENI',
          cmd:  'aws ec2 describe-network-interfaces --network-interface-ids <eniId> --query "NetworkInterfaces[0].Groups"'
        },
        {
          id:   'aws_nacl',
          label:'NACL rules & hit-counts (Athena)',
          cmd:  'SELECT nacl_rule, COUNT(*) FROM vpc_flow_logs WHERE action=\'REJECT\' AND from_unixtime(start) > now() - interval \'15\' minute GROUP BY nacl_rule LIMIT 20;'
        }
      ]
    },
    {
      title: 'ENI & instance networking',
      items: [
        {
          id:   'aws_eni',
          label:'ENI link & Rx/Tx drops',
          cmd:  'aws ec2 describe-network-interfaces --network-interface-ids <eniId> --query "NetworkInterfaces[0].Attachment,NetworkInterfaces[0].InterfaceType,NetworkInterfaces[0].TagSet"'
        },
        {
          id:   'aws_ena',
          label:'ENA driver – errors / interrupts',
          cmd:  'aws ssm send-command --instance-ids <iId> --document-name "AWS-RunShellScript" --parameters commands="dmesg | grep ena; ethtool -S eth0"'
        },
        {
          id:   'aws_nic_metrics',
          label:'CloudWatch – packets & errors',
          cmd:  'aws cloudwatch get-metric-statistics --metric-name NetworkErrors --namespace AWS/EC2 --statistics Sum --dimensions Name=InstanceId,Value=<iId> --period 300 --start-time $(date -u -d "-15 minutes" +%Y-%m-%dT%H:%M:%SZ) --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ)'
        },
        {
          id:   'aws_cpu_credit',
          label:'Burstable instance credit balance',
          cmd:  'aws cloudwatch get-metric-statistics --metric-name CPUSurplusCreditBalance --namespace AWS/EC2 --statistics Average --dimensions Name=InstanceId,Value=<iId>'
        },
        {
          id:   'aws_tr',
          label:'In-guest MTR / traceroute via EC2 Instance Connect',
          cmd:  'aws ec2-instance-connect send-ssh-public-key --instance-id <iId> --os-user ec2-user --ssh-public-key file://id_rsa.pub ; ssh ec2-user@<publicIp> "mtr -rw -c 5 <dst>"'
        }
      ]
    },
    {
      title: 'VPC core constructs',
      items: [
        {
          id:   'aws_vpc_route',
          label:'Route tables & black-hole routes',
          cmd:  'aws ec2 describe-route-tables --query "RouteTables[*].Routes[?State==\'blackhole\']"'
        },
        {
          id:   'aws_sg_change',
          label:'SG rule modifications – last 24 h',
          cmd:  'aws ec2 describe-security-group-rules --filters Name=last-seen-always,Values=true'
        },
        {
          id:   'aws_ipam',
          label:'VPC IPAM – address space usage',
          cmd:  'aws ec2 get-ipam-address-space --ipam-id <ipamId>'
        },
        {
          id:   'aws_tgw',
          label:'Transit Gateway route-tables & attachments',
          cmd:  'aws ec2 get-transit-gateway-route-tables'
        },
        {
          id:   'aws_nat',
          label:'NAT Gateway connection errors',
          cmd:  'aws cloudwatch get-metric-statistics --namespace AWS/NATGateway --metric-name ConnectionErrorCount --statistics Sum --dimensions Name=NatGatewayId,Value=<natId>'
        }
      ]
    },
    {
      title: 'Load balancing & edge services',
      items: [
        {
          id:   'aws_alb',
          label:'ALB/NLB target health & 5xx spikes',
          cmd:  'aws elbv2 describe-target-health --target-group-arn <tgArn>'
        },
        {
          id:   'aws_elb_logs',
          label:'ELB access-logs – ELB_5xx errors (Athena)',
          cmd:  'SELECT elb_status_code, count(*) FROM alb_logs WHERE elb_status_code >= 500 GROUP BY elb_status_code LIMIT 20;'
        },
        {
          id:   'aws_waf',
          label:'WAF rule matches & blocks',
          cmd:  'aws wafv2 get-sampled-requests --web-acl-arn <aclArn> --rule-metric-name <rule> --time-window StartTime=$(date -u -d "-15 minutes" +%s),EndTime=$(date -u +%s) --max-items 100'
        },
        {
          id:   'aws_cf',
          label:'CloudFront distribution health summary',
          cmd:  'aws cloudfront list-distributions | jq ".DistributionList.Items[] | {Id,DomainName,Enabled,Status}"'
        }
      ]
    },
    {
      title: 'Hybrid connectivity',
      items: [
        {
          id:   'aws_vpn',
          label:'Site-to-Site VPN tunnel state',
          cmd:  'aws ec2 describe-vpn-connections --query "VpnConnections[].{Id:VpnConnectionId,State:State,Tunnels:Tunnels[*].Status}"'
        },
        {
          id:   'aws_dx',
          label:'Direct Connect – virtual-interface BGP',
          cmd:  'aws dx describe-virtual-interfaces --connection-id <dxId>'
        },
        {
          id:   'aws_ga',
          label:'Global Accelerator endpoint health',
          cmd:  'aws globalaccelerator describe-endpoint-groups --listener-arn <listenerArn>'
        }
      ]
    },
    {
      title: 'Flow logs & threat findings',
      items: [
        {
          id:   'aws_flow',
          label:'VPC Flow logs – REJECT actions (Athena)',
          cmd:  'SELECT action, dstaddr, dstport, protocol, COUNT(*) AS hits FROM flow_logs WHERE action = \'REJECT\' AND from_unixtime(start) > now() - interval \'15\' minute GROUP BY action,dstaddr,dstport,protocol LIMIT 50;'
        },
        {
          id:   'aws_gd',
          label:'GuardDuty – PortProbe & UnauthorizedAccess',
          cmd:  'aws guardduty list-findings --detector-id <detId> --finding-criteria file://net-findings.json'
        }
      ]
    },
    {
      title: 'DNS & service discovery',
      items: [
        {
          id:   'aws_r53_logs',
          label:'Route 53 Resolver NXDOMAIN / SERVFAIL spikes',
          cmd:  'aws logs start-query --log-group-name "/aws/route53resolver" --query-string "fields query_name, rcode | filter rcode>=2 | stats count() by query_name | sort by count desc" --start-time $(($(date +%s) - 900)) --end-time $(date +%s)'
        },
        {
          id:   'aws_privlink',
          label:'PrivateLink endpoint state & DNS entries',
          cmd:  'aws ec2 describe-vpc-endpoints --filters Name=vpc-endpoint-type,Values=Interface'
        }
      ]
    }
  ],
  // END Amazon Web Services – advanced (net‑engineer view)

  // BEGIN Google Cloud Platform GCP - advanced (network-centric)
  gcp: [
    {
      title: 'Cloud-wide health & change auditing',
      items: [
        {
          id:   'gcp_health',
          label:'Status dashboard – networking incidents',
          cmd:  'curl -s https://status.cloud.google.com/incidents.json | jq -r \'.[] | select(.service_key=="networking") | .external_desc\''
        },
        {
          id:   'gcp_audit_fw',
          label:'Audit-log: firewall API calls (last 1 h)',
          cmd:  'gcloud logging read \'resource.type="gce_firewall_rule" AND protoPayload.methodName:firewalls.* AND timestamp>="-1h"\' --limit 50 --format="table(timestamp, protoPayload.methodName, protoPayload.request.name)"'
        },
        {
          id:   'gcp_asset_diff',
          label:'Asset-inventory diff – net resources',
          cmd:  'gcloud asset search-all-iam-policies --scope=projects/<projId> --query \'policy:"compute.networkAdmin"\''
        }
      ]
    },
    {
      title: 'Connectivity diagnostics',
      items: [
        {
          id:   'gcp_conn_test',
          label:'Connectivity Test probe (NIC)',
          cmd:  'gcloud compute connectivity-tests run <test-name>'
        },
        {
          id:   'gcp_net_analyzer',
          label:'Network Analyzer – asymmetry / shadowing',
          cmd:  'gcloud compute network-topology list --include-internal-errors'
        },
        {
          id:   'gcp_tr_shell',
          label:'Cloud Shell traceroute / MTR',
          cmd:  'traceroute -n <dst> || mtr -rw -c 5 <dst>'
        }
      ]
    },
    {
      title: 'Effective policy evaluation',
      items: [
        {
          id:   'gcp_effective_fw',
          label:'Effective firewall rules on NIC',
          cmd:  'gcloud compute instances describe <vm> --zone <zone> --format="flattened(networkInterfaces[].effectiveFirewalls[].rules)"'
        },
        {
          id:   'gcp_effective_route',
          label:'VPC route viewer – longest-prefix match',
          cmd:  'gcloud compute routes list --filter="destRange=<dstIP>/32"'
        },
        {
          id:   'gcp_hfw',
          label:'Hierarchical FW policy hit-count',
          cmd:  'gcloud compute firewall-policies rules list --firewall-policy <policyId> --format="table(priority, direction, action, hitCount)"'
        }
      ]
    },
    {
      title: 'Packet & flow inspection',
      items: [
        {
          id:   'gcp_pcap',
          label:'Packet Mirroring session describe',
          cmd:  'gcloud compute packet-mirrorings describe <mirror> --region <region>'
        },
        {
          id:   'gcp_flow',
          label:'Flow-log drops (connection_dropped=true)',
          cmd:  'gcloud logging read \'jsonPayload.connection.dropped=true AND timestamp>="-15m"\' --format="table(jsonPayload.src.ip, jsonPayload.dst.ip, jsonPayload.dropped_reason)"'
        }
      ]
    },
    {
      title: 'VM & interface telemetry',
      items: [
        {
          id:   'gcp_nic_metrics',
          label:'NIC metrics – bytes & drops',
          cmd:  'gcloud monitoring metrics list --filter metric.type="compute.googleapis.com/instance/network/received_bytes_count" --limit 5'
        },
        {
          id:   'gcp_live_mig',
          label:'Host maintenance / live-migrate events',
          cmd:  'gcloud compute instances ops-describe <vm> --zone <zone> --catalog LIVE_MIGRATION'
        }
      ]
    },
    {
      title: 'Load balancing & edge services',
      items: [
        {
          id:   'gcp_lb',
          label:'LB backend health & 5xx rate',
          cmd:  'gcloud compute backend-services get-health <backend> --region <region>'
        },
        {
          id:   'gcp_armor',
          label:'Cloud Armor policy hits / preview drops',
          cmd:  'gcloud compute security-policies list --format="table(name,ruleCount,description)"'
        },
        {
          id:   'gcp_cdn',
          label:'Cloud CDN hit ratio & latency (metrics)',
          cmd:  'gcloud monitoring metrics list --filter metric.type="loadbalancing.googleapis.com/https/request_count" --limit 5'
        }
      ]
    },
    {
      title: 'NAT & egress',
      items: [
        {
          id:   'gcp_nat',
          label:'Cloud NAT connection-count / drops',
          cmd:  'gcloud compute routers nats list --router <router> --region <region> --format="table(name,totalAllocatedPorts,udpIdleTimeoutSec)"'
        },
        {
          id:   'gcp_nat_logs',
          label:'NAT logs – NO_TRANSLATION_ENTRY',
          cmd:  'gcloud logging read \'resource.type="nat_gateway" AND jsonPayload.connection.dropped_reason="NO_TRANSLATION_ENTRY" AND timestamp>="-15m"\''
        }
      ]
    },
    {
      title: 'Hybrid & interconnect',
      items: [
        {
          id:   'gcp_router_bgp',
          label:'Cloud Router BGP status',
          cmd:  'gcloud compute routers get-status <router> --region <region> --format="json(result.bgpPeerStatus)"'
        },
        {
          id:   'gcp_interconnect',
          label:'Dedicated / Partner Interconnect optics',
          cmd:  'gcloud compute interconnects describe <ic> --format="table(name,operationalStatus,receivedLightLevel.dBm)"'
        },
        {
          id:   'gcp_vpn',
          label:'Cloud VPN tunnel state',
          cmd:  'gcloud compute vpn-tunnels list --filter="status!=ESTABLISHED" --format="table(name,region,status)"'
        },
        {
          id:   'gcp_ncc',
          label:'Network Connectivity Center hub health',
          cmd:  'gcloud network-connectivity hubs describe <hub> --format="json(spokesState)"'
        }
      ]
    },
    {
      title: 'Private connectivity & DNS',
      items: [
        {
          id:   'gcp_psc',
          label:'Private Service Connect endpoints',
          cmd:  'gcloud compute forwarding-rules list --filter="purpose:PRIVATE_SERVICE_CONNECT"'
        },
        {
          id:   'gcp_dns',
          label:'dig +trace inside Cloud Shell',
          cmd:  'dig +trace <fqdn>'
        },
        {
          id:   'gcp_dns_policy',
          label:'DNS policy overlaps & forwarding',
          cmd:  'gcloud dns policies list --format="table(name,enableInboundForwarding,networks[0].networkUrl)"'
        }
      ]
    },
    {
      title: 'Security & observability',
      items: [
        {
          id:   'gcp_iam',
          label:'IAM policy changes (last 1 h)',
          cmd:  'gcloud logging read \'protoPayload.methodName="SetIamPolicy" AND timestamp>="-1h"\' --limit 100 --format="table(timestamp,resource.labels.project_id,protoPayload.resourceName)"'
        },
        {
          id:   'gcp_ddos',
          label:'Adaptive Protection DDoS events',
          cmd:  'gcloud logging read \'jsonPayload.attackType="L7_DDOS" AND timestamp>="-1h"\' --format="table(timestamp,jsonPayload.attackType)"'
        },
        {
          id:   'gcp_vpc_sc',
          label:'VPC-SC perimeter egress denies',
          cmd:  'gcloud access-context-manager perimeters list --format="table(name,status)"'
        }
      ]
    }
  ],
  // END Google Cloud Platform GCP - advanced (network-centric)
};
// END function specialized commands for On-premise Cisco, Arista and Ciena devices and advanced Azure, AWS and GCP


// BEGIN function to generate user webview content
export function openRootcauseAnalysis(
  context: vscode.ExtensionContext,
  platform: Platform = 'onprem_cisco'
): void {
 
  const panel = vscode.window.createWebviewPanel(
    'netCommander.rootcauseAnalysis',
    'Emergency Troubleshooting Checklist',
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media')
      ]
    }
  );
 
  const nonce       = getNonce();
  const csp         = panel.webview.cspSource;
  const scriptUri   = panel.webview.asWebviewUri(
                        vscode.Uri.joinPath(context.extensionUri, 'media', 'module-checklist', 'main.js')
                      ).toString();
  const styleUri    = panel.webview.asWebviewUri(
                        vscode.Uri.joinPath(context.extensionUri, 'media', 'module-checklist', 'style.css')
                      ).toString();
  const commonUri   = panel.webview.asWebviewUri(
                        vscode.Uri.joinPath(context.extensionUri, 'media', 'common', 'css', 'style.css')
                      ).toString();
  const elementsUri = panel.webview.asWebviewUri(
                        vscode.Uri.joinPath(context.extensionUri, 'media', 'libs', 'vscode-elements', 'bundled.js')
                      ).toString();
 
  panel.webview.html = showWebviewContent(
    scriptUri, styleUri, commonUri, elementsUri, csp, nonce, platform
  );
 
  const disposable = panel.webview.onDidReceiveMessage(async (msg) => {
    switch (msg.command) {

      case 'prepareRca': {
        await prepareRootCauseAnalysis(msg.platform as Platform);
        break;
      }

      case 'generatePdf': {
        const modRoot = await ensureModuleFolder('root-cause-analysis');
        if (!modRoot) { break; }

        const dirs = (await fs.readdir(modRoot, { withFileTypes: true }))
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .sort()
          .reverse();

        if (!dirs.length) {
          vscode.window.showWarningMessage('No RCA folder found – create one first.');
          break;
        }

        const latestFolderUri = vscode.Uri.file(path.join(modRoot, dirs[0]));
        await generatePdfReport(latestFolderUri);
        break;
      }

    }
  });

  panel.onDidDispose(() => disposable.dispose());
}
 
function showWebviewContent(
  scriptUri: string,
  styleUri: string,
  commonStyleUri: string,
  elementsUri: string,
  cspSource: string,
  nonce: string,
  _defaultPlatform: Platform
): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 img-src ${cspSource} https: data:;
                 script-src 'nonce-${nonce}' ${cspSource};
                 style-src 'unsafe-inline' ${cspSource};
                 font-src ${cspSource} https: data:;">
  <script nonce="${nonce}" type="module" src="${elementsUri}"></script>
  <link rel="stylesheet" href="${commonStyleUri}" />
  <link rel="stylesheet" href="${styleUri}" />


  <script nonce="${nonce}">
    window.defaultPlatform   = "";   /* no auto‑selection */
    window.preCheckData      = ${JSON.stringify(preCheck)};
    window.checklistData     = ${JSON.stringify(checklist)};
    window.platformScenarios = ${JSON.stringify(platformScenarios)};
    window.specialisedTasks  = ${JSON.stringify(specialisedTasks)};
  </script>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</head>
<body>
  <div class="layout">
    <div class="top-bar"><h1>Root Cause Analysis Checklist</h1></div>
    <div class="middle section-padding">
      <vscode-form-container responsive>
        <vscode-label for="hostSelect"><b>Select your Host OS</b></vscode-label>
        <vscode-single-select id="hostSelect" name="hostSelect" position="below">
          <vscode-option value="windows" selected>Windows</vscode-option>
          <vscode-option value="linux">Linux</vscode-option>
          <vscode-option value="macos">macOS</vscode-option>
        </vscode-single-select>

        <!-- Pre-Check -->
        <vscode-table zebra bordered-rows id="preTable">
          <vscode-table-header slot="header">
            <vscode-table-header-cell>Checkpoint</vscode-table-header-cell>
            <vscode-table-header-cell>Command</vscode-table-header-cell>
          </vscode-table-header>
          <vscode-table-body id="preBody" slot="body"></vscode-table-body>
        </vscode-table>


        <!-- Create RCA folder -->
        <vscode-button id="prepareRcaBtn" appearance="primary" style="margin-top:12px;">
          Prepare Root Cause Analysis Folder
        </vscode-button>

        <vscode-button id="generatePdfBtn" appearance="secondary" style="margin-left:8px;">
          Generate PDF Report
        </vscode-button>
        <vscode-form-helper>
          <p>💡 Click the button to create a new folder at the root of your workspace where you can document, save and organize packet captures, logs, and configurations for easier analysis. Be sure to store your switch configurations as .txt files so you benefit from syntax highlighting and can more easily explore their structure.</p>
        </vscode-form-helper>

        <!-- Step 1 -->
        <vscode-label style="margin-top:24px;" for="platformSelect"><b>Step 1 – Select Platform</b></vscode-label>
        <vscode-single-select id="platformSelect" name="platformSelect" position="below">
          <vscode-option value="" selected disabled>Select a platform…</vscode-option>
          <vscode-option value="onprem_cisco">On-premise - Cisco</vscode-option>
          <vscode-option value="onprem_arista">On-premise - Arista</vscode-option>
          <vscode-option value="onprem_ciena">On-premise - Ciena</vscode-option>
          <vscode-option value="azure">Cloud - Azure</vscode-option>
          <vscode-option value="aws">Cloud - AWS</vscode-option>
          <vscode-option value="gcp">Cloud - Google Cloud</vscode-option>
        </vscode-single-select>

        <!-- Scenario -->
        <vscode-label id="scenarioLbl" style="margin-top:12px;" for="scenarioSelect"><b>Scenario</b></vscode-label>
        <vscode-single-select id="scenarioSelect" name="scenarioSelect" position="below"></vscode-single-select>
        <!-- Step 2 – Work the Checklist -->
        <div id="step2" class="step2-hidden">
          <vscode-table zebra bordered-rows id="mainTable">
            <vscode-table-header slot="header">
              <vscode-table-header-cell>Checkpoint</vscode-table-header-cell>
              <vscode-table-header-cell>Command</vscode-table-header-cell>
            </vscode-table-header>
            <vscode-table-body id="mainBody" slot="body"></vscode-table-body>
          </vscode-table>
        </div>



      </vscode-form-container>
    </div>
  </div>
</body>
</html>`;
}
// END function to generate user webview content