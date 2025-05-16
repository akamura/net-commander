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

// media/module-checklist/main.js

const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
  const hostSel     = document.getElementById('hostSelect');
  const preTbody    = document.getElementById('preBody');
  const platformSel = document.getElementById('platformSelect');
  const scenarioSel = document.getElementById('scenarioSelect');
  const scenarioLbl = document.getElementById('scenarioLbl');
  const mainTbody   = document.getElementById('mainBody');
  const step2Block  = document.getElementById('step2');
  const prepareBtn  = document.getElementById('prepareRcaBtn');

  // build Pre-Check table for selected Host OS
  function buildPrecheckTable() {
    preTbody.innerHTML = '';
    const hostOS = hostSel.value;
    const items  = window.preCheckData[hostOS] || [];
    items.forEach(({ label, cmd }) => {
      const row = document.createElement('vscode-table-row');
      row.innerHTML = `
        <vscode-table-cell>${label}</vscode-table-cell>
        <vscode-table-cell>${cmd}</vscode-table-cell>
      `;
      preTbody.appendChild(row);
    });
  }

  // populate Scenario dropdown for selected platform
  function buildScenarioDropdown(platform) {
    const scenarios = window.platformScenarios[platform] || [];
    scenarioSel.innerHTML      = '';
    scenarioSel.disabled       = scenarios.length === 0;
    scenarioLbl.style.display  = scenarios.length ? '' : 'none';
    scenarios.forEach(({ id, label }) => {
      const opt = document.createElement('vscode-option');
      opt.value       = id;
      opt.textContent = label;
      if (id === 'general') opt.selected = true;
      scenarioSel.appendChild(opt);
    });
  }

// render checklist, with <h3> section titles and SME support
function renderChecklist() {
  const plat = platformSel.value;
  if (!plat) {
    step2Block.classList.add('step2-hidden');
    return;
  }

  const scn = scenarioSel.value || 'general';
  const baseSections = window.checklistData[plat] || [];
  const specSections = (window.specialisedTasks[plat] || {})[scn] || [];

  // I choose what to show
  let sections;
  if (scn === 'specialised') {
    // only the SME toolbox blocks
    sections = specSections;
  } else {
    // all the base blocks, plus any scenario-extras
    sections = baseSections.slice();
    if (specSections.length) {
      sections = sections.concat(specSections);
    }
  }

  // render
  mainTbody.innerHTML = '';
  sections.forEach(({ title, items }) => {
    // section header
    if (title) {
      const h3 = document.createElement('h3');
      h3.textContent = title;
      mainTbody.appendChild(h3);
    }
    items.forEach(({ id, label, cmd }) => {
      const row = document.createElement('vscode-table-row');
      row.innerHTML = `
        <vscode-table-cell>${label}</vscode-table-cell>
        <vscode-table-cell>${cmd}</vscode-table-cell>
      `;
      mainTbody.appendChild(row);
    });
  });

  step2Block.classList.toggle('step2-hidden', sections.length === 0);
}


hostSel.addEventListener('change', buildPrecheckTable);
platformSel.addEventListener('change', () => {
  buildScenarioDropdown(platformSel.value);
  renderChecklist();
});

scenarioSel.addEventListener('change', renderChecklist);

prepareBtn.addEventListener('click', () => {
  vscode.postMessage({ command:'prepareRca',
                       platform: platformSel.value || 'unselected' });
});

// "Generate PDF" wiring
const pdfBtn = document.getElementById('generatePdfBtn');
pdfBtn?.addEventListener('click', () => vscode.postMessage({
  command : 'generatePdf',
  platform: platformSel.value || 'unselected'
}));

buildPrecheckTable();
});