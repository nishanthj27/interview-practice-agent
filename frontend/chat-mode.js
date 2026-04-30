// ============================================================
// chat-mode.js — Chat interview (calls backend, not Gemini directly)
// ============================================================

let currentJob      = null;
let timerInterval   = null;
let timeLeft        = CONFIG.INTERVIEW_DURATION;
let interviewActive = false;
let isProcessing    = false;
let lastQuestion    = '';

document.addEventListener('DOMContentLoaded', () => {
    loadInterviewData();
    setupInputHandlers();
});

function loadInterviewData() {
    try {
        const jobData  = JSON.parse(sessionStorage.getItem('selectedJob')       || 'null');
        const userInfo = JSON.parse(sessionStorage.getItem('userInfo')           || 'null');
        const settings = JSON.parse(sessionStorage.getItem('interviewSettings') || '{}');
        if (!jobData || !userInfo) { alert('Session expired.'); window.location.href='index.html'; return; }

        currentJob = jobData;
        document.getElementById('jobTitle').textContent = jobData.title;

        memoryManager.initSession(
            jobData.id, 'chat', userInfo,
            settings.difficulty || 'intermediate',
            settings.personality || 'neutral'
        );
        startTimer();
        startInterview();
    } catch (e) { console.error(e); alert('Error loading session.'); }
}

// ── Timer ─────────────────────────────────────────────────────
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        const el = document.getElementById('timer');
        if (el) {
            el.textContent = formatTime(timeLeft);
            el.className   = 'timer' + (timeLeft <= CONFIG.TIMER_DANGER_THRESHOLD ? ' danger' : timeLeft <= CONFIG.TIMER_WARNING_THRESHOLD ? ' warning' : '');
        }
        if (timeLeft <= 0) endInterview();
    }, 1000);
}

// ── Interview flow ────────────────────────────────────────────
async function startInterview() {
    interviewActive = true;
    showTyping(true);
    try {
        const { message } = await ApiClient.chat({
            jobId:      currentJob.id,
            settings:   memoryManager.sessionData,
            userInfo:   memoryManager.sessionData.userInfo,
            history:    [],
            resumeText: memoryManager.sessionData.resumeText
        });
        lastQuestion = message;
        memoryManager.addMessage('assistant', message);
        addMessage('bot', message);
    } catch (e) {
        const fallback = 'I could not connect to the interview backend. Please check the deployed backend URL and try again.';
        addMessage('bot', fallback);
        console.error(e);
    } finally {
        showTyping(false);
    }
}

async function sendMessage() {
    if (isProcessing || !interviewActive) return;
    const input = document.getElementById('userInput');
    const text  = input.value.trim();
    if (!text) return;

    input.value = '';
    resizeTextarea(input);
    addMessage('user', text);
    memoryManager.addMessage('user', text);

    const questionForScoring = lastQuestion;
    isProcessing = true;
    setSendBtnState(false);
    showTyping(true);

    try {
        const [chatRes, scoreRes] = await Promise.allSettled([
            ApiClient.chat({
                jobId:      currentJob.id,
                settings:   { difficulty: memoryManager.sessionData.difficulty, personality: memoryManager.sessionData.personality },
                userInfo:   memoryManager.sessionData.userInfo,
                history:    memoryManager.getHistory(),
                resumeText: memoryManager.sessionData.resumeText
            }),
            ApiClient.score({
                question:   questionForScoring,
                answer:     text,
                jobTitle:   currentJob.title,
                difficulty: memoryManager.sessionData.difficulty
            })
        ]);

        // Handle score
        if (scoreRes.status === 'fulfilled') {
            const scoreData = scoreRes.value.score;
            if (scoreData) {
                memoryManager.recordAnswer(questionForScoring, text, scoreData);
                showScoreBadge(scoreData.overall || 0);
            }
        }

        // Handle next message
        if (chatRes.status === 'fulfilled') {
            const nextMsg = chatRes.value.message;
            lastQuestion  = nextMsg;
            memoryManager.addMessage('assistant', nextMsg);
            addMessage('bot', nextMsg);
        } else {
            addMessage('bot', 'I had a connection issue. Could you repeat that?');
        }

    } catch (e) {
        addMessage('bot', 'Sorry, something went wrong. Please try again.');
        console.error(e);
    } finally {
        showTyping(false);
        isProcessing = false;
        setSendBtnState(true);
        document.getElementById('userInput')?.focus();
    }
}

// ── End interview ─────────────────────────────────────────────
function endInterview() {
    if (!interviewActive && !timerInterval) return;
    interviewActive = false;
    clearInterval(timerInterval);
    timerInterval = null;
    setSendBtnState(false);
    showFeedbackModal(memoryManager.endSession());
}

async function showFeedbackModal(sessionData) {
    document.getElementById('feedbackModal').classList.add('active');
    try {
        const { feedback } = await ApiClient.feedback(sessionData);
        renderFeedback(feedback, sessionData);
    } catch (e) {
        document.getElementById('feedbackBody').innerHTML =
            `<p style="color:var(--text-secondary)">Interview complete. Score: ${sessionData.totalScore}/100</p>`;
    }
}

function renderFeedback(f, session) {
    const gradeColor = { A:'#10b981', B:'#3b82f6', C:'#f59e0b', D:'#f97316', F:'#ef4444' };
    const color = gradeColor[f.grade] || '#6b7280';
    const catScores = f.categoryScores || {};

    document.getElementById('feedbackBody').innerHTML = `
        <div class="feedback-hero">
            <div class="grade-circle" style="border-color:${color};color:${color}">${f.grade}</div>
            <div class="feedback-hero-info">
                <div class="overall-score">${f.overallScore}<span>/100</span></div>
                <div class="hiring-badge">Hiring Likelihood: <strong>${f.hiringLikelihood}</strong></div>
                <p class="fb-summary">${f.summary}</p>
            </div>
        </div>
        <div class="feedback-grid">
            <div class="fb-card"><h4>💪 Strengths</h4><ul>${(f.topStrengths||[]).map(s=>`<li>✅ ${s}</li>`).join('')}</ul></div>
            <div class="fb-card"><h4>🎯 Improvements</h4><ul>${(f.topWeaknesses||[]).map(w=>`<li>⚠️ ${w}</li>`).join('')}</ul></div>
        </div>
        <div class="fb-card full-width"><h4>📊 Category Scores</h4>
            ${Object.entries(catScores).map(([k,v])=>`
            <div class="cat-score-row">
                <span class="cat-label">${k.replace(/([A-Z])/g,' $1').trim()}</span>
                <div class="score-bar-wrap"><div class="score-bar-fill" style="width:${v}%;background:${v>=70?'#10b981':v>=50?'#f59e0b':'#ef4444'}"></div></div>
                <span class="cat-val">${v}</span>
            </div>`).join('')}
        </div>
        <div class="fb-card full-width"><h4>📋 Action Plan</h4><ul>${(f.actionPlan||[]).map(a=>`<li>📌 ${a}</li>`).join('')}</ul></div>
        ${session.answers?.length ? `
        <div class="fb-card full-width"><h4>🔍 Per-Answer Breakdown</h4>
            ${session.answers.map((a,i)=>`
            <div class="per-answer-item ${a.score>=70?'good':a.score>=45?'avg':'poor'}">
                <div class="pa-header"><span>Q${i+1}: ${a.question.slice(0,80)}…</span><span class="pa-score">${a.score}/100</span></div>
                <p class="pa-feedback">${a.feedback}</p>
            </div>`).join('')}
        </div>` : ''}`;
}

// ── UI ────────────────────────────────────────────────────────
function addMessage(role, text) {
    const w = document.getElementById('messagesWrapper');
    w.querySelector('.welcome-message')?.remove();
    const d = document.createElement('div');
    d.className = `message ${role}-message`;
    d.innerHTML = `
        <div class="message-avatar">${role==='bot'?'🎙️':'👤'}</div>
        <div class="message-bubble">
            <div class="message-text">${escapeHTML(text)}</div>
            <div class="message-time">${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
        </div>`;
    w.appendChild(d);
    w.scrollTop = w.scrollHeight;
}

function showScoreBadge(score) {
    const w = document.getElementById('messagesWrapper');
    const b = document.createElement('div');
    b.className = `score-badge ${score>=70?'good':score>=45?'avg':'poor'}`;
    b.textContent = `Answer scored: ${score}/100`;
    w.appendChild(b);
    w.scrollTop = w.scrollHeight;
    setTimeout(() => b.style.opacity = '0.4', 3000);
}

function showTyping(show) {
    const el = document.getElementById('typingIndicator');
    if (el) el.style.display = show ? 'flex' : 'none';
}

function setSendBtnState(enabled) {
    const btn = document.getElementById('sendBtn');
    if (btn) btn.disabled = !enabled;
}

function escapeHTML(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function setupInputHandlers() {
    const el = document.getElementById('userInput');
    if (!el) return;
    el.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    el.addEventListener('input', () => resizeTextarea(el));
}

function resizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function goBack()          { if (confirm('End interview?')) { clearInterval(timerInterval); window.location.href='index.html'; } }
function goHome()          { window.location.href = 'index.html'; }
function retakeInterview() { window.location.reload(); }
