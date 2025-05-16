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

// media/module-ping/main.js

// suppress ResizeObserver loop errors
window.addEventListener('error', event => {
    if (
      event.message &&
      event.message.includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      event.preventDefault();
      return false;
    }
  });

document.addEventListener('DOMContentLoaded', () => {
    const vscode = acquireVsCodeApi();
    const targetsInput = document.getElementById('pingtargets');
    const countInput   = document.getElementById('pingcount');
    const sizeInput    = document.getElementById('pingsize');
    const pingBtn      = document.getElementById('pingBtn');
    const clearBtn     = document.getElementById('clearBtn');
    const exportBtn    = document.getElementById('exportBtn');
    const resultsDiv   = document.getElementById('results');
    let resultsByTarget = {};
  
    if (!targetsInput || !countInput || !sizeInput || !pingBtn || !clearBtn || !exportBtn || !resultsDiv) {
      console.error('Missing DOM elements in Ping UI');
      return;
    }
  
    pingBtn.addEventListener('click', () => {
      const targets = targetsInput.value.split(/,|\n/)
        .map(t => t.trim()).filter(t => t);
      resultsByTarget = {};
      renderClear();
      vscode.postMessage({
        command: 'ping',
        data: {
          targets,
          count: parseInt(countInput.value, 10) || 4,
          size:  parseInt(sizeInput.value, 10)  || 56
        }
      });
    });
  
    clearBtn.addEventListener('click', () => {
      resultsByTarget = {};
      renderClear();
      vscode.postMessage({ command: 'clear' });
    });
  
    exportBtn.addEventListener('click', () => {
      let csv = '';
      Object.values(resultsByTarget).forEach(group => {
        group.replies.forEach(r => {
          csv += [
            r.seq || '',
            r.bytes, r.ttl, r.time,
            r.target, r.localIP, r.macAddress, r.timestamp
          ].join(',') + '\n';
        });
        const s = group.summary;
        if (s) {
          csv += `Summary for ${group.target}:,Sent=${s.transmitted},Rec=${s.received},Loss=${s.loss},Time=${s.totalTime},RTT=${s.rtt
            ? `${s.rtt.min}/${s.rtt.avg}/${s.rtt.max}/${s.rtt.mdev}`
            : 'N/A'}\n`;
        }
      });
      vscode.postMessage({ command: 'exportCSV', data: { csv } });
    });
  
    window.addEventListener('message', ({ data }) => {
      switch (data.command) {
        case 'pingResult':
          handlePingResult(data);
          break;
        case 'clearResults':
          renderClear();
          break;
        case 'toggleStop':
          break;
      }
    });
  
    function handlePingResult({ data }) {
      const { target, type } = data;
      if (!resultsByTarget[target]) {
        resultsByTarget[target] = { target, replies: [], summary: null };
      }
      if (type === 'reply') {
        resultsByTarget[target].replies.push(data.row);
      } else if (type === 'summary') {
        resultsByTarget[target].summary = data.summary;
      }
      renderAll();
    }
  
    function renderClear() {
      resultsDiv.innerHTML = '';
    }
  
    function renderAll() {
      resultsDiv.innerHTML = '';
      for (const key in resultsByTarget) {
        const group = resultsByTarget[key];
        const title = document.createElement('h3');
        title.textContent = `Ping: ${group.target}`;
        resultsDiv.appendChild(title);
  
        const table = document.createElement('vscode-table');
        table.zebra = true;
        table['bordered-rows'] = true;
  
        const header = document.createElement('vscode-table-header');
        header.slot = 'header';
        ['Seq','Bytes','TTL','Time','Target','Source','Source Mac','Timestamp']
          .forEach(col => {
            const th = document.createElement('vscode-table-header-cell');
            th.textContent = col;
            header.appendChild(th);
          });
        table.appendChild(header);
  
        const body = document.createElement('vscode-table-body');
        body.slot = 'body';
        group.replies.forEach(row => {
          const tr = document.createElement('vscode-table-row');
          [row.seq||'',row.bytes,row.ttl,row.time,row.target,row.localIP,row.macAddress,row.timestamp]
            .forEach(val => {
              const td = document.createElement('vscode-table-cell');
              td.textContent = val;
              tr.appendChild(td);
            });
          body.appendChild(tr);
        });
  
        if (group.summary) {
          const tr = document.createElement('vscode-table-row');
          const td = document.createElement('vscode-table-cell');
          td.colspan = 8;
          td.style.fontWeight = 'bold';
          const s = group.summary;
          td.textContent = `Sent ${s.transmitted}, Rec ${s.received}, Loss ${s.loss}, Time ${s.totalTime}, RTT ${s.rtt
            ? `${s.rtt.min}/${s.rtt.avg}/${s.rtt.max}/${s.rtt.mdev}`
            : 'N/A'}`;
          tr.appendChild(td);
          body.appendChild(tr);
        }
  
        table.appendChild(body);
        resultsDiv.appendChild(table);
      }
    }
  });
  