![Net Commander Banner](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/banner/net-commander-banner.png)

<div align="center">

# Network Engineering Toolkit for Visual Studio Code
**Manage and diagnose networks end-to-end without ever leaving your code editor. Conduct real Root Cause Analysis data-driven with no more guessing**


![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/elelabdev.net-commander)
![Open VSX Version](https://img.shields.io/open-vsx/v/elelabdev/net-commander)
[![Uses VSCode Elements](https://img.shields.io/badge/uses-vscode--elements-blue)](https://github.com/vscode-elements/elements/network/dependents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)



</div>
<br><br>

# Why I should use Net Commander
Aimed to be a powerful all-in-one toolkit for Network Engineers, DevOps Engineers or Solution Architects. Net Commander brings the everyday field tools like public ip query including peeringdb and IANA port lookup, ping, traceroute, Wi-Fi Surveys, subnet calculators, SSH profile jumpers, config colourising and more *into* Visual Studio Code. Stop context-switching between terminals and browsers and troubleshoot where you already work.
<br><br>
## ✨ Main Features

| Category      | Highlights                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| **Troubleshoot** | • Live Ping panel & multiple-shot ping<br>• Visual Traceroute with mapped SVG path<br>• Assisted Root-Cause Analysis Report creation for data-driven resolution approach with no more guessing |
| **Wireless**     | • Wi-Fi Analyzer ideal for quick site survey<br>• One-click packet capture for deep inspection with Wireshark                      |
| **Lookup**       | • IANA port registry search<br>• Public IP & ASN info (ipinfo.io)<br>• PeeringDB integration               |
| **Calculate**    | • RFC-compliant CIDR calculator + *what-if* assisted subnet simulator                                               |
| **SSH**     | • SSH profile jumper & terminal enhancer
| **Visualise**    | • Cisco-style config colouriser with inline IP assisted tooltips (more will come)                                                    |

*All exports are CSV-ready—drop results straight into tickets or dashboards.*

<br><br>

## Table of Contents

- [Features](#features)
  - [Root Cause Analysis](#root-cause-analysis) 
  - [WiFi Analyzer](#wifi-analyzer)  
  - [SSH Profile Jumper](#ssh-profile-jumper)  
  - [Optimise Terminal Experience](#optimise-terminal-experience)  
  - [IANA Port Lookup](#iana-port-lookup)  
  - [RFC‑Compliant CIDR Calculator](#rfc‑compliant-cidr-calculator)  
  - [Public IP Lookup (ipinfo.io)](#public-ip-lookup-ipinfoio)  
  - [PeeringDB Lookup](#peeringdb-lookup)  
  - [Ping Modernized](#ping-panel-mode--single‑shot)  
  - [Traceroute with SVG Map](#traceroute-with-svg-map)  
  - [Network Configuration Colorizer](#network-configuration-colorizer) 
- [Quick Start](#quick-start)  
- [Configuration & Settings](#configuration--settings)  
- [Contributing & Feedback](#contributing--feedback)  
- [Sponsor This Project](#sponsor-this-project)  

<br><br>

## 📔 Getting started

<br>

## Root Cause Analysis
![Root Cause Analysis](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/rootcause-analysis.gif)  
Root-cause analysis must be **data-driven** and free from assumptions or feelings.  
Always validate facts with logs, metrics, or reproducible tests before drawing conclusions. 
Even if you are an expert when you are in the middle of a complex troubleshooting alone, in couple or involving multiple teams sometimes it's hard to get focused under pressure specially when dialing with different platforms at the same time for this reason the Root Cause Analysis Checklist come to help in handy offline format with dedicated commands for Cisco, Arista, Ciena, Microsoft Azure, Amazon AWS and Google Cloud Platform.

<br>

## WiFi Analyzer
![WiFi Analyzer](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/wifi-analyzer.gif)  
Conduct fast site surveys getting RAW data from your notebook WiFi socket that you can extract in CSV or execute an on-demand Packet Trace that you can analyze later on with Wireshark.
You can see the neighbor signals and SSID to quickly understand if there are interference that affect your WiFi signal as well as diagnose your signal strenght and quality.

<br>

## SSH Profile Jumper
![SSH Profile Jumper](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/ssh.gif)  
Net Commander **SSH Profile Jumper** simplifies SSH management by letting you jump to saved server profiles with a few keystrokes. No more manually typing hostnames or looking up IP addresses define your SSH connections once and instantly launch into remote servers from VS Code.

<br><br>

## Optimise Terminal Experience
Net Commander leverages VS Code’s Terminal Shell Integration API to track your terminal commands, so you can instantly copy any command’s output or save it directly into your project for later in-depth analysis. All saved outputs land in the terminal-downloads folder.

<br><br>

## IANA Port Lookup
![IANA Port Lookup](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/iana-port-calculator.png)  
Ever come across an unfamiliar port number or service name? The **IANA Port Lookup** tool provides quick insights by referencing the official IANA port registry. Input a TCP/UDP port or service name, and Net Commander displays the assigned service (e.g., `80 → HTTP`, `443 → HTTPS`), making firewall audits and configuration reviews faster.

<br><br>

## RFC‑Compliant CIDR Calculator
![CIDR Calculator](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/cidr-simulator.gif)  
Designing or subnetting a network? The **CIDR Calculator** computes IPv4 and IPv6 subnets on the fly, following RFC standards. Provide an IP and prefix (e.g., `192.168.100.0/24`) to get network address, broadcast, wildcard mask, and usable host range. Supports supernetting and subnetting, with results exported to `cidr-calc.csv`.
<br><br>
The CIDR Calculator provide you also the capability of running **What-if-simulation** this way you can get an estimate if your address space needs fits inside choosen CIDR block or not. No more guessing or mistakes!
<br><br>

## Public IP Lookup (ipinfo.io)
![Public IP Lookup](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/public-ip-info.png)  
Retrieve your external IP or gather details about any IP address with ipinfo.io integration. Instantly fetch geolocation, ASN, hostname, and ISP info without leaving the editor. For higher rate limits or more data, add your ipinfo API token in Settings → Net Commander → Ipinfo API Key.

<br><br>

## PeeringDB Lookup
![PeeringDB Lookup](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/peeringdb.png)  
Query PeeringDB for ASN and facility data directly in VS Code. Enter an ASN or organization name to view peering policies, IX presence, and facility locations—ideal for planning interconnections and verifying existing peering information.

<br><br>

## Ping Supercharged
![Ping Panel](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/ping.png)  
- **Panel Mode:** Continuous ping monitoring in VS Code’s sidebar, with real‑time latency charts and packet‑loss stats.  
- **Single‑Shot:** Quick terminal ping for instant reachability tests.  

Both modes support CSV export (including source MAC & IP) and custom packet size/count via settings.

<br><br>

## Traceroute with SVG Map
![Traceroute Map](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/traceroute.png)  
Run a traceroute and generate an interactive SVG map of each hop, plotted geographically using IP geolocation. Inspect raw hop data alongside the map to troubleshoot routing or latency issues visually.

<br><br>

## Network Configuration Colorizer
![Config Colorizer](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/net-colorizer.gif)  
Automatically apply syntax highlighting to Cisco‑style `.txt` files. Keywords, interfaces, IPs, and protocols are colorized for easy scanning, reducing errors and speeding up config reviews.
<br><br>
![Config Colorizer](https://raw.githubusercontent.com/elelabdev/net-commander/refs/heads/main/media/img/readme/net-colorizer-iptooltips.png)  
Plus the extension will automatically detect private and public IPs placing tooltips above them for your better understanding. In case of Public IPs provide you access to **ipinfo.io database** to get accurate informations without leaving the configuration you are exploring avoiding spam ads or distractions.
<br>

<br><br>

---

<br><br>

## 😎 Quick Start

1. **Install** Net Commander from the VS Code Marketplace.  
2. Setup IPinfo account (you need it to query public IP info DB)
3. Open the **Command Palette** with <kbd>Ctrl + Shift + P</kbd> (Windows/Linux) or <kbd>⇧⌘P</kbd> (macOS).  
4. Type `Net Commander:` to see all commands and select the tool you need.  
5. Enjoy seamless network operations without leaving your editor!
> 💡 Setup guide of IPinfo
> 1. Signup for a free account at https://ipinfo.io/signup.
>
> 2. Once signed up from your dashboard open the **API Token** page and copy your token https://ipinfo.io/dashboard/token.
>
> 3. Open VS Code Settings panel search for **Net Commander** and paste your Token in the Net Commander IPinfo form.

<br><br>


## 🔧 Configuration & Settings

Go to **File > Preferences > Settings** (or <kbd>Ctrl+,</kbd>), search for **Net Commander**, and configure:

- **IANA csv url**: Edit the IANA database CSV in case it change.
- **IPinfo.io API Token**: Save your API Token to be used by the extension.

All settings are exposed via the VS Code UI—no manual JSON edits required.


<br><br>


## ⭐ Contributing & Feedback

I welcome your ideas and feedbacks! Whether you discover a problem or have a feature request, please:

- **Open an issue**: https://github.com/elelabdev/net-commander/issues  
- **Suggest a new idea**: https://github.com/elelabdev/net-commander/discussions/categories/ideas
- **Ask questions and get answers**: https://github.com/elelabdev/net-commander/discussions/categories/q-a

Your insights help prioritize enhancements and ensure Net Commander scale as a very useful **VS Code network tools** extension. Thank you for contributing!

<br><br>

## ❤️ Sponsor This Project
If you find Net Commander valuable, please consider sponsoring its ongoing development. Thank you for helping me building better open-source tools!  
<br>
[![GitHub Sponsors](https://img.shields.io/github/sponsors/elelabdev?label=Sponsor%20this%20project&logo=GitHub&style=flat)](https://github.com/sponsors/elelabdev) 