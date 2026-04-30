// ============================================================
// app.js — Landing page logic
// Jobs loaded from backend. No API key anywhere here.
// ============================================================

let selectedJob = null;
let userInfo    = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadJobsFromBackend();
    setupUserInfoForm();
    setupResumeUpload();
    checkBackendHealth();
});

// ── Load jobs from backend ────────────────────────────────────
async function loadJobsFromBackend() {
    const grid = document.getElementById('jobGrid');
    grid.innerHTML = '<div class="loading-jobs">Loading roles…</div>';
    try {
        const { jobs } = await ApiClient.getJobs();
        CONFIG.JOBS = jobs; // populate runtime config
        renderJobGrid(jobs);
    } catch (err) {
        grid.innerHTML = `<div class="error-msg">⚠️ Could not reach backend.<br><small>${err.message}</small><br><small>Make sure the server is running at ${CONFIG.API_BASE_URL}</small></div>`;
    }
}

function renderJobGrid(jobs) {
    const grid = document.getElementById('jobGrid');
    grid.innerHTML = '';
    jobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.onclick   = () => selectJob(job);
        card.innerHTML = `
            <span class="job-icon">${job.icon}</span>
            <h3>${job.title}</h3>
            <p>${job.description}</p>
            <div class="job-domains">${(job.domains || []).map(d => `<span class="domain-tag">${d}</span>`).join('')}</div>`;
        grid.appendChild(card);
    });
}

// ── Backend health ping ───────────────────────────────────────
async function checkBackendHealth() {
    try {
        await ApiClient.health();
        console.log('✅ Backend is reachable');
    } catch {
        console.warn('⚠️ Backend health check failed — is the server running?');
    }
}

// ── Job selection ─────────────────────────────────────────────
function selectJob(job) {
    selectedJob = job;
    document.getElementById('infoJobTitle').textContent = job.title;
    openModal('userInfoModal');
}

// ── User info form ────────────────────────────────────────────
function setupUserInfoForm() {
    const form = document.getElementById('userInfoForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(form);
        userInfo = {
            fullName:     fd.get('fullName').trim(),
            organization: fd.get('organization').trim(),
            degree:       fd.get('degree').trim(),
            currentRole:  fd.get('currentRole').trim(),
            timestamp:    new Date().toISOString()
        };
        if (!validateUserInfo(userInfo)) return;
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
        closeModal('userInfoModal');
        setTimeout(() => openModal('settingsModal'), 300);
    });
}

function validateUserInfo(info) {
    for (const [k, v] of Object.entries(info)) {
        if (k === 'timestamp') continue;
        if (!v || v.length < 2) {
            alert(`Please fill in: ${k.replace(/([A-Z])/g,' $1').trim()}`);
            return false;
        }
    }
    return true;
}

// ── Resume upload ─────────────────────────────────────────────
function setupResumeUpload() {
    const input = document.getElementById('resumeFile');
    if (!input) return;
    input.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        const label = document.getElementById('resumeLabel');
        label.textContent = `📎 ${file.name} — uploading…`;
        try {
            const text = await file.text();
            // Send to backend for parsing
            const { summary } = await ApiClient.parseResume(text);
            sessionStorage.setItem('resumeText', summary);
            label.textContent = `✅ ${file.name} — loaded`;
            label.style.color = '#10b981';
        } catch (err) {
            // Fallback: store raw text
            const raw = await file.text().catch(() => '');
            sessionStorage.setItem('resumeText', raw.slice(0, 1000));
            label.textContent = `✅ ${file.name} — loaded (raw)`;
            label.style.color = '#10b981';
        }
    });
}

// ── Settings confirm ──────────────────────────────────────────
function confirmSettings() {
    const difficulty  = document.querySelector('input[name="difficulty"]:checked')?.value  || 'intermediate';
    const personality = document.querySelector('input[name="personality"]:checked')?.value || 'neutral';
    sessionStorage.setItem('interviewSettings', JSON.stringify({ difficulty, personality }));
    closeModal('settingsModal');
    setTimeout(() => openModeModal(), 300);
}

function openModeModal() {
    if (!selectedJob) return;
    document.getElementById('selectedJobTitle').textContent = selectedJob.title;
    openModal('modeModal');
}

function selectMode(mode) {
    if (!selectedJob || !userInfo) return;
    sessionStorage.setItem('selectedJob', JSON.stringify(selectedJob));
    sessionStorage.setItem('userInfo',    JSON.stringify(userInfo));
    window.location.href = mode === 'chat' ? 'chat.html' : 'voice.html';
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

// Legacy aliases
function closeUserInfoModal()      { closeModal('userInfoModal'); }
function closeSettingsModal()      { closeModal('settingsModal'); }
function closeModeSelectorModal()  { closeModal('modeModal'); }

document.addEventListener('click', e => {
    ['userInfoModal','settingsModal','modeModal'].forEach(id => {
        const m = document.getElementById(id);
        if (m && e.target === m) closeModal(id);
    });
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') ['userInfoModal','settingsModal','modeModal'].forEach(id => closeModal(id));
});
