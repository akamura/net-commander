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

// media/module-wifianalyzer/main.js

(function(){
    const maxPoints = 60;
    const neighborSeries = {};
    const color = d3.scaleOrdinal(d3.schemeCategory10);
  
    let sigChart, linkChart, nbSigChart, nbBars2g, nbBars5g;
    let prevRxBytes = null, prevTxBytes = null;
    const sigData = [], linkData = [];
  
    function updateByteRates(info) {
      if (info.rxBytes != null) {
        if (prevRxBytes != null) {
          const mbps = ((info.rxBytes - prevRxBytes) * 8) / 1e6;
          document.getElementById('rx-rate-val').textContent = mbps.toFixed(2) + ' Mbps';
        }
        prevRxBytes = info.rxBytes;
      }
      if (info.txBytes != null) {
        if (prevTxBytes != null) {
          const mbps = ((info.txBytes - prevTxBytes) * 8) / 1e6;
          document.getElementById('tx-rate-val').textContent = mbps.toFixed(2) + ' Mbps';
        }
        prevTxBytes = info.txBytes;
      }
    }
  

    function updateTopCols(info) {
    document.getElementById('ssid-val').textContent        = info.ssid || '';
    document.getElementById('bssid-val').textContent       = info.bssid || '';
    document.getElementById('ip-val').textContent          = info.ipAddr || '';
    document.getElementById('mac-val').textContent         = info.mac || '';
  
    document.getElementById('rx-rate-val').textContent     = info.rxRateMbps != null
      ? info.rxRateMbps.toFixed(2) + ' Mbps' : 'N/A';
    document.getElementById('rx-dropped-val').textContent  = info.rxDropped != null
      ? info.rxDropped.toString() : 'N/A';
  
    document.getElementById('tx-rate-val').textContent     = info.txRateMbps != null
      ? info.txRateMbps.toFixed(2) + ' Mbps' : 'N/A';
    document.getElementById('tx-dropped-val').textContent  = info.txDropped != null
      ? info.txDropped.toString() : 'N/A';
  }
  
     function initChart(id, yDomain, colorScale) {
      const svgEl = document.querySelector('#' + id + ' svg');
      if (!svgEl) return null;
      const svg = d3.select(svgEl);
      const rect = svgEl.getBoundingClientRect();
      const vb = '0 0 ' + rect.width + ' ' + rect.height;
      svgEl.setAttribute('viewBox', vb);
      const m = { top:20, right:10, bottom:20, left:40 };
      const w = rect.width  - m.left - m.right;
      const h = rect.height - m.top  - m.bottom;
  
      // use string concatenation, not backticks
      const g = svg
        .attr('viewBox', '0 0 ' + rect.width + ' ' + rect.height)
        .append('g')
          .attr('transform', 'translate(' + m.left + ',' + m.top + ')');
  
      const x = d3.scaleTime().range([0, w]);
      const y = d3.scaleLinear().domain(yDomain).range([h, 0]);
  
      g.append('g').attr('class','y-axis');
      g.append('g')
        .attr('class','x-axis')
        .attr('transform', 'translate(0,' + h + ')');
  
      const line = d3.line()
        .x(function(d){ return x(d.time); })
        .y(function(d){ return y(d.value); })
        .curve(d3.curveMonotoneX);
  
      const path = g.append('path')
        .attr('fill','none')
        .attr('stroke-width',2);
  
      const area = d3.area()
        .x(d => x(d.time))
        .y0(h)
        .y1(d => y(d.value))
        .curve(d3.curveMonotoneX);
  
      const areaPath = g.append('path')
        .attr('class', 'area-fill')
        .attr('fill', 'steelblue')
        .attr('opacity', 0.2);
  
  
      return { g, x, y, line, path, area, areaPath, colorScale };
  
  
    }
  
    function initNeighborBars(selector) {
      const svgEl = document.querySelector(selector);
      if (!svgEl) return null;
      const svg = d3.select(svgEl);
      const rect = svgEl.getBoundingClientRect();
      const vb = '0 0 ' + rect.width + ' ' + rect.height;
      svgEl.setAttribute('viewBox', vb);
      const m = { top:20, right:10, bottom:30, left:40 };
      const w = rect.width  - m.left - m.right;
      const h = rect.height - m.top  - m.bottom;
  
      const g = svg
        .attr('viewBox', '0 0 ' + rect.width + ' ' + rect.height)
        .append('g')
          .attr('transform', 'translate(' + m.left + ',' + m.top + ')');
  
      const x = d3.scaleBand().range([0, w]).padding(0.2);
      const y = d3.scaleLinear().domain([0,100]).range([h,0]);
  
      g.append('g').attr('class','y-axis');
      g.append('g')
        .attr('class','x-axis')
        .attr('transform', 'translate(0,' + h + ')');
  
      const colorScale = d3.scaleLinear()
        .domain([0,100])
        .range(['red','green']);
  
      return { g: g, x: x, y: y, h: h, colorScale: colorScale };
    }
  
  
    function kernelDensityEstimator(kernel, X) {
    return function(V) {
      return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
  }
  function kernelEpanechnikov(k) {
    return function(v) {
      v /= k;
      return Math.abs(v) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
  }
  
  
  function updateNeighborSignalChart(info) {
    if (!nbSigChart || !Array.isArray(info.neighborDetails)) return;
    const { g, x, y } = nbSigChart;
  
    // Update data
    info.neighborDetails.forEach(n => {
      if (n.ssid === info.ssid) return;
      const dBm = (n.strength / 100) * 70 - 100;
      if (!neighborSeries[n.ssid]) neighborSeries[n.ssid] = [];
      neighborSeries[n.ssid].push({ time: new Date(), value: dBm });
      if (neighborSeries[n.ssid].length > maxPoints) {
        neighborSeries[n.ssid].shift();
      }
    });
  
    const allPoints = Object.values(neighborSeries).flat();
    if (!allPoints.length) return;
  
    x.domain(d3.extent(allPoints, d => d.time));
    y.domain([-95, -30]); // Fixed dBm scale
  
    // Color scale for dBm
    const dBmColor = d3.scaleThreshold()
      .domain([-80, -70, -60, -50])
      .range(['green', 'lightgreen', 'yellow', 'orange', 'red']);
  
    const line = d3.line()
      .x(d => x(d.time))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);
  
    const ssids = Object.keys(neighborSeries);
  
    const lines = g.selectAll('.ssid-line')
      .data(ssids, d => d);
  
    lines.enter()
      .append('path')
      .attr('class', 'ssid-line')
      .merge(lines)
      .attr('fill', 'none')
      .attr('stroke-width', 1.2)
      .attr('stroke', d => {
        const last = neighborSeries[d].slice(-1)[0]?.value ?? -90;
        return dBmColor(last);
      })
      .attr('d', d => line(neighborSeries[d]));
  
    lines.exit().remove();
  
    // Y axis (dBm)
    g.select('.y-axis').call(d3.axisLeft(y));
    g.select('.x-axis').call(d3.axisBottom(x).ticks(5));
  
    // Legends
    g.selectAll('.ssid-legend').remove();
    ssids.slice(0, 15).forEach((ssid, i) => {
      const last = neighborSeries[ssid].slice(-1)[0]?.value ?? -90;
      const yPos = 15 + i * 12;
  const textGroup = g.append('g').attr('class', 'ssid-legend');
  
  const label = textGroup.append('text')
    .attr('x', 5)
    .attr('y', yPos)
    .style('font-size', '10px')
    .style('fill', dBmColor(last))
    .text(ssid);
  
  // Get label size after rendering
  requestAnimationFrame(() => {
    const bbox = label.node().getBBox();
    textGroup.insert('rect', 'text')
      .attr('x', bbox.x - 2)
      .attr('y', bbox.y - 1)
      .attr('width', bbox.width + 4)
      .attr('height', bbox.height + 2)
      .attr('fill', '#000')
      .attr('fill-opacity', 0.35)
      .attr('rx', 2);
  });
  
    });
  }
  
  
   
  
   
  
  

    function updateCharts(info) {
      if (info.signalDbm != null && sigChart) {
        sigData.push({ time:new Date(), value: info.signalDbm });
        if (sigData.length > maxPoints) sigData.shift();
  
        const { g, x, y, line, path, colorScale, area, areaPath } = sigChart;
        x.domain(d3.extent(sigData, d => d.time));
        y.domain([-90, -30]);
  
        path.datum(sigData)
          .attr('stroke', colorScale(info.signalDbm))
          .attr('d', line);
  
        areaPath.datum(sigData)
          .attr('fill', colorScale(info.signalDbm))
          .attr('opacity', 0.2)
          .attr('d', area);
  
        g.select('.y-axis').call(d3.axisLeft(y));
        g.select('.x-axis').call(d3.axisBottom(x).ticks(5));
      }
  
      // Link Quality timeseries
      if (info.linkQuality && linkChart) {
        const [n,d] = info.linkQuality.split('/').map(Number);
        const pct = d ? (n/d)*100 : 0;
        linkData.push({ time:new Date(), value: pct });
        if (linkData.length > maxPoints) linkData.shift();
  
        const { g, x, y, line, path, area, areaPath, colorScale } = linkChart;
        x.domain(d3.extent(linkData, d => d.time));
        y.domain([0, 100]);
  
        path.datum(linkData)
          .attr('stroke', colorScale(pct))
          .attr('d', line);
  
        areaPath.datum(linkData)
          .attr('fill', colorScale(pct))
          .attr('opacity', 0.2)
          .attr('d', area);
  
        g.select('.y-axis').call(d3.axisLeft(y));
        g.select('.x-axis').call(d3.axisBottom(x).ticks(5));
      }
  
    }
    function updateNeighborBars(bars, myCh) {
      if (!nbBars2g || !nbBars5g) return;
    
      const configs = [
        { chart: nbBars2g, data: bars.filter(d => d.channel <= 14),   allCh: Array.from({length:14}, (_,i)=>i+1) },
        { chart: nbBars5g, data: bars.filter(d => d.channel >  14),   allCh: null }
      ];
    
      configs.forEach(({ chart, data, allCh }) => {
        const { g, x, y, h, colorScale } = chart;
    
        // if I have no data AND I have an allCh list, force domain to [1..14]
        if (allCh && data.length === 0) {
          x.domain(allCh);
        } else {
          x.domain(data.map(d => d.channel));
        }
    
        g.select('.x-axis')
         .call(d3.axisBottom(x).ticks(allCh ? 14 : data.length));
    
        g.select('.y-axis').call(d3.axisLeft(y));
    
        // draw bars (none will appear if data is empty)
        const sel = g.selectAll('rect').data(data, d => d.channel);
        sel.join(
          enter => enter.append('rect'),
          update => update
        )
        .attr('x',      d => x(d.channel))
        .attr('width',  d => x.bandwidth())
        .transition().duration(100)
          .attr('y',      d => y(d.strength))
          .attr('height', d => h - y(d.strength))
          .attr('fill',   d => d.channel === myCh ? 'steelblue' : colorScale(d.strength));
      });
    }
    
    
    // Rewrite updateSSIDs to use createElement() only:
    function updateSSIDs(list) {
      const tbody = document.getElementById('ssid-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';               // clear old rows
      (Array.isArray(list) ? list : []).forEach(ssid => {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.textContent = ssid;
        tr.appendChild(td);
        tbody.appendChild(tr);
      });
    }
  
    // Rewrite updateInfo to use createElement() only:
  function updateInfo(info) {
    const tbody = document.getElementById('info-table-body');
    if (!tbody) return;
    tbody.innerHTML = ''; // clear
  
    Object.entries(info).forEach(([key, value]) => {
      const row = document.createElement('vscode-table-row');
  
      const cellKey = document.createElement('vscode-table-cell');
      cellKey.textContent = key;
      row.appendChild(cellKey);
  
      const cellVal = document.createElement('vscode-table-cell');
      cellVal.textContent = String(value ?? '');
      row.appendChild(cellVal);
  
      tbody.appendChild(row);
    });
  }

    const vscode = acquireVsCodeApi();
    const pcapBtn = document.getElementById('pcapBtn');
    const csvBtn  = document.getElementById('csvBtn');
    pcapBtn .onclick = () => vscode.postMessage({ command: 'togglePcap' });
    csvBtn  .onclick = () => vscode.postMessage({ command: 'exportCsv' });



    // andle all incoming messages in one place
    window.addEventListener('message', e => {
      const msg = e.data;

      if (msg.command === 'pcapStarted') {
        pcapBtn.textContent  = 'Stop Packet Capture';
        pcapBtn.disabled     = false;
        return;
      }
      if (msg.command === 'pcapStopped') {
        pcapBtn.textContent  = 'Start Packet Capture';
        pcapBtn.disabled     = false;
        return;
      }

      csvBtn.disabled = false;
      const info = msg;
      updateTopCols(info);
      updateByteRates(info);
      updateCharts(info);
      updateNeighborBars(info.neighborBars, info.channel);
      updateSSIDs(info.neighborSSIDs);
      updateInfo(info);
      updateNeighborSignalChart(info);
    });
    
    function initAll(){
      sigChart   = initChart('signal-chart',    [-95,-30],
                    d3.scaleThreshold().domain([-80,-70,-67,-30])
                                      .range(['red','orange','yellow','lightgreen','green']));
      linkChart  = initChart('link-chart',      [0,100],
                    d3.scaleLinear().domain([0,100]).range(['red','green']));
      nbSigChart = initChart('neighbor-signal-block',[-95, 0], null);
      nbBars2g   = initNeighborBars('#neighbors-chart-2g');
      nbBars5g   = initNeighborBars('#neighbors-chart-5g');
  
    }
    initAll();
})();