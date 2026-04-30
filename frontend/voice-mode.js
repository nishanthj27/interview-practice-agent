// ============================================================
// voice-mode.js — Voice interview (calls backend via ApiClient)
// ============================================================

let currentJob      = null;
let timerInterval   = null;
let timeLeft        = CONFIG.INTERVIEW_DURATION;
let interviewActive = false;
let isProcessing    = false;
let lastQuestion    = '';
let isSpeaking      = false;

let recognition  = null;
let cameraStream = null;
let cameraEnabled= false;
let silenceTimer = null;
let isListening  = false;

document.addEventListener('DOMContentLoaded', () => {
    loadInterviewData();
    initSpeechRecognition();
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
            jobData.id, 'voice', userInfo,
            settings.difficulty  || 'intermediate',
            settings.personality || 'neutral'
        );
    } catch (e) { console.error(e); }
}

// ── Speech recognition ────────────────────────────────────────
function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { console.warn('Speech recognition not supported'); return; }

    recognition = new SR();
    recognition.continuous      = false;
    recognition.interimResults  = true;
    recognition.lang            = 'en-US';

    recognition.onresult = e => {
        clearTimeout(silenceTimer);
        const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
        if (e.results[e.results.length - 1].isFinal) {
            handleUserSpeech(transcript);
        } else {
            showTranscript(transcript, false);
            silenceTimer = setTimeout(() => { if (isListening) recognition.stop(); }, CONFIG.VAD_SILENCE_DURATION);
        }
    };
    recognition.onend   = () => { isListening = false; if (!isSpeaking && !isProcessing && interviewActive) setAvatarState('listening'); };
    recognition.onerror = e  => { isListening = false; if (e.error !== 'no-speech') setAvatarState('error'); };
}

function startListening() {
    if (!recognition || isSpeaking || isProcessing || !interviewActive) return;
    try { recognition.start(); isListening = true; setAvatarState('listening'); } catch {}
}

function stopListening() {
    if (recognition && isListening) { recognition.stop(); isListening = false; }
}

// ── Text-to-speech ────────────────────────────────────────────
function speak(text, onEnd) {
    const synth = window.speechSynthesis;
    if (!synth) { onEnd?.(); return; }
    synth.cancel();
    const clean = text.replace(/\*\*/g,'').replace(/\*/g,'').replace(/#{1,6}\s/g,'');
    const utt   = new SpeechSynthesisUtterance(clean);
    utt.rate = CONFIG.VOICE_RATE; utt.pitch = CONFIG.VOICE_PITCH; utt.volume = CONFIG.VOICE_VOLUME; utt.lang = 'en-US';
    const voices = synth.getVoices();
    const pref   = voices.find(v => v.lang==='en-US' && (v.name.includes('Google')||v.name.includes('Samantha'))) || voices.find(v => v.lang==='en-US') || voices[0];
    if (pref) utt.voice = pref;
    utt.onstart = () => { isSpeaking = true; setAvatarState('speaking'); };
    utt.onend   = () => { isSpeaking = false; setAvatarState('listening'); onEnd?.(); startListening(); };
    utt.onerror = () => { isSpeaking = false; onEnd?.(); };
    synth.speak(utt);
}

// ── Interview flow ────────────────────────────────────────────
async function startInterview() {
    interviewActive = true;
    document.getElementById('startWrapper').style.display = 'none';
    setAvatarState('thinking');
    startTimer();

    try {
        const { message } = await ApiClient.chat({
            jobId:      currentJob.id,
            settings:   { difficulty: memoryManager.sessionData.difficulty, personality: memoryManager.sessionData.personality },
            userInfo:   memoryManager.sessionData.userInfo,
            history:    [],
            resumeText: memoryManager.sessionData.resumeText
        });
        lastQuestion = message;
        memoryManager.addMessage('assistant', message);
        addConversationMessage('bot', message);
        speak(message);
    } catch {
        const fallback = `Welcome to your ${currentJob.title} interview! Please introduce yourself.`;
        lastQuestion = fallback;
        addConversationMessage('bot', fallback);
        speak(fallback);
        memoryManager.addMessage('assistant', fallback);
    }
}

async function handleUserSpeech(transcript) {
    if (!transcript.trim() || isProcessing) return;
    stopListening();
    isProcessing = true;
    setAvatarState('thinking');
    showTranscript(transcript, true);
    addConversationMessage('user', transcript);
    memoryManager.addMessage('user', transcript);

    const qForScore = lastQuestion;

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
                question:   qForScore,
                answer:     transcript,
                jobTitle:   currentJob.title,
                difficulty: memoryManager.sessionData.difficulty
            })
        ]);

        if (scoreRes.status === 'fulfilled') {
            const sd = scoreRes.value.score;
            if (sd) { memoryManager.recordAnswer(qForScore, transcript, sd); showVoiceScoreBadge(sd.overall || 0); }
        }

        const nextMsg = chatRes.status === 'fulfilled' ? chatRes.value.message : 'Could you repeat that?';
        lastQuestion  = nextMsg;
        memoryManager.addMessage('assistant', nextMsg);
        addConversationMessage('bot', nextMsg);
        speak(nextMsg);
    } catch (e) {
        console.error(e);
        const errMsg = 'I had a brief connection issue. Could you repeat that?';
        addConversationMessage('bot', errMsg);
        speak(errMsg);
    } finally {
        isProcessing = false;
    }
}

// ── Timer ─────────────────────────────────────────────────────
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        const el = document.getElementById('timer');
        if (el) {
            el.textContent = formatTime(timeLeft);
            el.className   = 'timer' + (timeLeft<=CONFIG.TIMER_DANGER_THRESHOLD?' danger':timeLeft<=CONFIG.TIMER_WARNING_THRESHOLD?' warning':'');
        }
        if (timeLeft <= 0) endInterview();
    }, 1000);
}

function endInterview() {
    if (!interviewActive && !timerInterval) return;
    interviewActive = false;
    clearInterval(timerInterval);
    stopListening();
    window.speechSynthesis?.cancel();
    showFeedbackModal(memoryManager.endSession());
}

async function showFeedbackModal(sessionData) {
    document.getElementById('feedbackModal').classList.add('active');
    try {
        const { feedback } = await ApiClient.feedback(sessionData);
        renderFeedback(feedback, sessionData);
    } catch {
        document.getElementById('feedbackBody').innerHTML =
            `<p>Interview complete. Score: ${sessionData.totalScore}/100</p>`;
    }
}

function renderFeedback(f, session) {
    const gc = { A:'#10b981', B:'#3b82f6', C:'#f59e0b', D:'#f97316', F:'#ef4444' };
    const c  = gc[f.grade] || '#6b7280';
    document.getElementById('feedbackBody').innerHTML = `
        <div class="feedback-hero">
            <div class="grade-circle" style="border-color:${c};color:${c}">${f.grade}</div>
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
            ${Object.entries(f.categoryScores||{}).map(([k,v])=>`
            <div class="cat-score-row">
                <span class="cat-label">${k.replace(/([A-Z])/g,' $1').trim()}</span>
                <div class="score-bar-wrap"><div class="score-bar-fill" style="width:${v}%;background:${v>=70?'#10b981':v>=50?'#f59e0b':'#ef4444'}"></div></div>
                <span class="cat-val">${v}</span>
            </div>`).join('')}
        </div>
        <div class="fb-card full-width"><h4>📋 Action Plan</h4><ul>${(f.actionPlan||[]).map(a=>`<li>📌 ${a}</li>`).join('')}</ul></div>`;
}

// ── Camera ────────────────────────────────────────────────────
async function enableCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
        const vid = document.getElementById('cameraPreview');
        vid.srcObject = cameraStream; vid.classList.add('active');
        document.getElementById('cameraOverlay').classList.add('hidden');
        document.getElementById('toggleCameraBtn').style.display = 'flex';
        cameraEnabled = true;
    } catch {}
}
function toggleCamera() {
    if (!cameraStream) return;
    const vid = document.getElementById('cameraPreview');
    cameraEnabled = !cameraEnabled;
    cameraStream.getTracks().forEach(t => t.enabled = cameraEnabled);
    vid.classList.toggle('active', cameraEnabled);
    document.getElementById('cameraOverlay').classList.toggle('hidden', cameraEnabled);
}

// ── UI helpers ────────────────────────────────────────────────
function setAvatarState(state) {
    const avatar = document.getElementById('avatar');
    const status = document.getElementById('avatarStatus');
    if (!avatar || !status) return;
    avatar.className = 'avatar';
    const map = { listening:{cls:'listening',label:'🎤 Listening…'}, speaking:{cls:'speaking',label:'🔊 Speaking…'}, thinking:{cls:'thinking',label:'⏳ Thinking…'}, error:{cls:'',label:'⚠️ Error'}, ready:{cls:'',label:'Ready'} };
    const s = map[state] || map.ready;
    if (s.cls) avatar.classList.add(s.cls);
    status.textContent = s.label;
}

function addConversationMessage(role, text) {
    const c = document.getElementById('conversationMessages');
    c.querySelector('.welcome-message-voice')?.remove();
    const d = document.createElement('div');
    d.className = `chat-message ${role==='bot'?'bot-message':'user-message'}`;
    d.innerHTML = `
        <div class="chat-message-avatar">${role==='bot'?'🎙️':'👤'}</div>
        <div class="chat-message-content">
            <div>${escapeHTML(text)}</div>
            <div class="chat-message-time">${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
        </div>`;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
}

function showTranscript(text, isFinal) {
    let el = document.getElementById('transcriptPreview');
    if (!el) {
        el = document.createElement('div');
        el.id = 'transcriptPreview';
        el.style.cssText = 'background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:8px;padding:0.4rem 1rem;margin:0.25rem 1rem;font-style:italic;color:var(--text-secondary);font-size:0.85rem;';
        document.getElementById('conversationMessages').appendChild(el);
    }
    el.textContent = (isFinal ? '' : '🎤 ') + text;
    if (isFinal) setTimeout(() => el.remove(), 800);
}

function showVoiceScoreBadge(score) {
    const c = document.getElementById('conversationMessages');
    const b = document.createElement('div');
    b.className = `score-badge ${score>=70?'good':score>=45?'avg':'poor'}`;
    b.textContent = `Answer scored: ${score}/100`;
    c.appendChild(b);
    c.scrollTop = c.scrollHeight;
    setTimeout(() => b.style.opacity='0.4', 3000);
}

function escapeHTML(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function goBack()          { if (confirm('End interview?')) { clearInterval(timerInterval); window.speechSynthesis?.cancel(); window.location.href='index.html'; } }
function goHome()          { window.speechSynthesis?.cancel(); window.location.href='index.html'; }
function retakeInterview() { window.speechSynthesis?.cancel(); window.location.reload(); }
