![Net Commander Logo](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/icons/net-commander-full.png)

<div align="center">

# Network Engineering Toolkit for Visual Studio Code
**Troubleshoot and manage networks end-to-end without ever leaving your code editor.**

</div>
<br><br>

### What is Net Commander
Net Commander is aimed to be a powerful all-in-one toolkit for Network Engineers, DevOps professionals or Architects. This Visual Studio Code extension integrates a suite of common networking tools directly into VS Code, streamlining your daily workflow.
<br><br>
Net Commander combines everything from SSH management and port lookups to subnet calculations and network topology visualization. With this extension, you can troubleshoot and manage networks end-to-end without ever leaving your code editor.

<br><br>

## Table of Contents

- [Features](#features)  
  - [SSH Profile Jumper](#ssh-profile-jumper)  
  - [IANA Port Lookup](#iana-port-lookup)  
  - [RFC‑Compliant CIDR Calculator](#rfc‑compliant-cidr-calculator)  
  - [Public IP Lookup (ipinfo.io)](#public-ip-lookup-ipinfoio)  
  - [PeeringDB Lookup](#peeringdb-lookup)  
  - [Ping Supercharged](#ping-panel-mode--single‑shot)  
  - [Traceroute with SVG Map](#traceroute-with-svg-map)  
  - [Network Configuration Colorizer](#network-configuration-colorizer)  
  - [Cisco Topology Generator (CDP/LLDP)](#cisco-topology-generator-cdplldp)  
- [Quick Start](#quick-start)  
- [Configuration & Settings](#configuration--settings)  
- [Contributing & Feedback](#contributing--feedback)  
- [Sponsor This Project](#sponsor-this-project)  

<br><br>

## 📔 Getting started

<br>

### SSH Profile Jumper
![SSH Profile Jumper](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/ssh.gif)  
Net Commander **SSH Profile Jumper** simplifies SSH management by letting you jump to saved server profiles with a few keystrokes. No more manually typing hostnames or looking up IP addresses define your SSH connections once and instantly launch into remote servers from VS Code.<br>Windows friends still using PuTTY have no more excuses! Sorry Simon 😏
<br>
> 💡 Did you know
>
>If you work in team you can quickly share the **.ssh/config** file so everyone benefits of the same experience. Just pay attention of sharing sensitive informations.

<br><br>

## Supercharge Terminal Experience
![IANA Port Lookup](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/terminal-download.gif)  
Net Commander leverages VS Code’s Terminal Shell Integration API to track your terminal commands, so you can instantly copy any command’s output or save it directly into your project for later in-depth analysis. All saved outputs land in the net-commander/terminal-downloads.

<br><br>

## IANA Port Lookup
![IANA Port Lookup](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/iana.gif)  
Ever come across an unfamiliar port number or service name? The **IANA Port Lookup** tool provides quick insights by referencing the official IANA port registry. Input a TCP/UDP port or service name, and Net Commander displays the assigned service (e.g., `80 → HTTP`, `443 → HTTPS`), making firewall audits and configuration reviews faster.

<br><br>

## RFC‑Compliant CIDR Calculator
![CIDR Calculator](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/cidr.gif)  
Designing or subnetting a network? The **CIDR Calculator** computes IPv4 and IPv6 subnets on the fly, following RFC standards. Provide an IP and prefix (e.g., `192.168.100.0/24`) to get network address, broadcast, wildcard mask, and usable host range. Supports supernetting and subnetting, with results exported to `net-commander/cidr-calc.csv`.
<br><br>
![CIDR Calculator](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/cidr-simulation.gif)  
The CIDR Calculator provide you also the capability of running **What-if-simulation** this way you can get an estimate if your address space needs fits inside choosen CIDR block or not. No more guessing or mistakes!
<br><br>

## Public IP Lookup (ipinfo.io)
![Public IP Lookup](https://github.com/akamura/net-commander/blob/main/resources/readme/ipinfo.gif)  
Retrieve your external IP or gather details about any IP address with ipinfo.io integration. Instantly fetch geolocation, ASN, hostname, and ISP info without leaving the editor. For higher rate limits or more data, add your ipinfo API token in Settings → Net Commander → Ipinfo API Key.

<br><br>

## PeeringDB Lookup
![PeeringDB Lookup](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/peeringdb.gif)  
Query PeeringDB for ASN and facility data directly in VS Code. Enter an ASN or organization name to view peering policies, IX presence, and facility locations—ideal for planning interconnections and verifying existing peering information.

<br><br>

## Ping Supercharged
![Ping Panel](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/ping.gif)  
- **Panel Mode:** Continuous ping monitoring in VS Code’s sidebar, with real‑time latency charts and packet‑loss stats.  
- **Single‑Shot:** Quick terminal ping for instant reachability tests.  

Both modes support CSV export (including source MAC & IP) and custom packet size/count via settings.

<br><br>

## Traceroute with SVG Map
![Traceroute Map](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/traceroute.gif)  
Run a traceroute and generate an interactive SVG map of each hop, plotted geographically using IP geolocation. Inspect raw hop data alongside the map to troubleshoot routing or latency issues visually.

<br><br>

## Network Configuration Colorizer
![Config Colorizer](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/net-colorizer.gif)  
Automatically apply syntax highlighting to Cisco‑style `.cfg`/`.conf` files. Keywords, interfaces, IPs, and protocols are colorized for easy scanning, reducing errors and speeding up config reviews.
<br><br>
![Config Colorizer](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/net-colorizer-iptooltips.gif)  
Plus the extension will automatically detect private and public IPs placing tooltips above them for your better understanding. In case of Public IPs provide you access to **ipinfo.io database** to get accurate informations without leaving the configuration you are exploring avoiding spam ads or distractions.

<br><br>

## Cisco Topology Generator (CDP/LLDP) - **beta release**
![Cisco Topology](https://raw.githubusercontent.com/akamura/net-commander/refs/heads/main/resources/readme/topology.gif)  
Parse Cisco CDP/LLDP text exports (e.g., `show cdp neighbors detail`) to auto‑generate a network topology diagram (SVG or Draw.io format). Nodes represent devices and links represent connections, giving you an instant **CDP topology visualization**. **Note:** Currently optimized for Cisco; support for other vendors is planned on next release.
<br>
> 💡 Setup guide
> 1. Run the command for the first time **Net Commander topology viewer** it will generate a folder in your workspace root named **net-commander/topology-viewer**.
>
> 2. Place inside **topology-viewer** subfolder all your **show-cdp-neghbors-detail.txt* files you can organize them by subfolders if you have many.
>
> 3. Close and run again the **Net Commander topology viewer** it will generate the topology reading your files.

<br><br>

---

<br><br>

## 😎 Quick Start

1. **Install** Net Commander from the VS Code Marketplace.  
2. Open the **Command Palette** with <kbd>Ctrl + Shift + P</kbd> (Windows/Linux) or <kbd>⇧⌘P</kbd> (macOS).  
3. Type `Net Commander:` to see all commands and select the tool you need.  
4. Enjoy seamless network operations without leaving your editor!


<br><br>


## 🔧 Configuration & Settings

Go to **File > Preferences > Settings** (or <kbd>Ctrl+,</kbd>), search for **Net Commander**, and configure:

- **IANA csv url**: Edit the IANA database CSV in case it change.
- **IPinfo.io API Token**: Save your API Token to be used by the extension.

All settings are exposed via the VS Code UI—no manual JSON edits required.


<br><br>


## ⭐ Contributing & Feedback

I welcome your ideas and feedbacks! Whether you discover a problem or have a feature request, please:

- **Open an issue**: https://github.com/akamura/net-commander/issues  
- **Suggest a new idea**: https://github.com/akamura/net-commander/discussions/categories/ideas
- **Ask questions and get answers**: https://github.com/akamura/net-commander/discussions/categories/q-a

Your insights help prioritize enhancements and ensure Net Commander scale as a very useful **VS Code network tools** extension. Thank you for contributing!

<br><br>

## ❤️ Sponsor This Project
If you find Net Commander valuable, please consider sponsoring its ongoing development. Thank you for helping me building better open-source tools!  
<br>
[![GitHub Sponsors](https://img.shields.io/github/sponsors/akamura?label=Sponsor%20this%20project&logo=GitHub&style=flat)](https://github.com/sponsors/akamura) 