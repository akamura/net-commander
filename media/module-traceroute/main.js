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

// media/module-traceroute/main.js

const d3     = window.d3;
const vscode = acquireVsCodeApi();
const NODE_WIDTH = 20;
const V_SPACING  = 80;
const LABEL_GAP  = 15;

function hexagonPath(width) {
  const a = width / 2;
  const r = a / Math.cos(Math.PI / 6);
  let path = "";
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    path += (i === 0 ? "M" : "L") + x + "," + y;
  }
  return path + "Z";
}

// helper for timeout color
function nodeColor(d) {
    const ip   = (d.ip       || '').toString().toLowerCase();
    const host = (d.hostname || '').toString().toLowerCase();
    const isTimeout = ip === 'timeout' || host === 'timeout';
    console.log(`node ${d.id}: ip="${d.ip}", hostname="${d.hostname}" → ${isTimeout? 'RED' : 'GREEN'}`);
    return isTimeout ? 'red' : 'green';
  }

const svg       = d3.select(".middle svg")
                    .attr("width",  "100%")
                    .attr("height", "100%");
const container = svg.append("g");

const zoom = d3.zoom().on("zoom", e => {
  container.attr("transform", e.transform);
});
svg.call(zoom);


function renderTopology() {
  container.selectAll("*").remove();

  // compute center
  const { width, height } = svg.node().getBoundingClientRect();
  const cx = width  / 2;
  const cy = height / 2;

  topology.nodes.forEach((n, i) => {
    n.x = cx;
    n.y = cy - ((topology.nodes.length - 1) * V_SPACING) / 2 + i * V_SPACING;
  });

  // draw links
  container.selectAll("line.link")
    .data(topology.links)
    .enter().append("line")
      .attr("class", "link")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("x1", d => findNode(d.source).x)
      .attr("y1", d => findNode(d.source).y + NODE_WIDTH/2)
      .attr("x2", d => findNode(d.target).x)
      .attr("y2", d => findNode(d.target).y - NODE_WIDTH/2);

  // draw hexagon + label
  const nodes = container.selectAll("g.node")
    .data(topology.nodes, d => d.id);

  const enter = nodes.enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag",  dragged)
      );

  // hexagon
  enter.append("path")
    .attr("d", hexagonPath(NODE_WIDTH))
    .attr("fill", d => nodeColor(d))

  // text label
  enter.append("text")
    .attr("dy", NODE_WIDTH/2 + LABEL_GAP)
    .attr("text-anchor", "middle")
    .attr("fill", "#fff")
    .text(d => d.label);
}

function findNode(id) {
  return topology.nodes.find(n => n.id === id) || { x:0, y:0 };
}

function resetView() {
  svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
}

// dragging (disable dragging of source/dest)
function dragstarted(ev, d) {
  if (d.id === "source" || d.id === "dest") return;
  d3.select(this).raise();
}
function dragged(ev, d) {
  if (d.id === "source" || d.id === "dest") return;
  d.x = ev.x; d.y = ev.y;
  d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
  
  // I update links on the fly
  container.selectAll("line.link")
    .attr("x1", l => findNode(l.source).x)
    .attr("y1", l => findNode(l.source).y + NODE_WIDTH/2)
    .attr("x2", l => findNode(l.target).x)
    .attr("y2", l => findNode(l.target).y - NODE_WIDTH/2);
}

document.getElementById("generateBtn").addEventListener("click", () => {
  const tgt = document.getElementById("target").value.trim();
  if (tgt) vscode.postMessage({ command:"traceroute", data:{ target:tgt } });
});
document.getElementById("resetViewBtn").addEventListener("click", resetView);
document.getElementById("exportCSVBtn").addEventListener("click", () => {
  vscode.postMessage({ command:"exportCSV" });
});
document.getElementById("clearBtn").addEventListener("click", () => {
  vscode.postMessage({ command:"clear" });
});

let topology = { nodes:[], links:[] };
window.addEventListener("message", e => {
  const msg = e.data;
  if (msg.command === "updateTopology") {
    topology = msg.topology;
    renderTopology();
  }
  else if (msg.command === "clearResults") {
    container.selectAll("*").remove();
    topology = { nodes:[], links:[] };
  }
});
