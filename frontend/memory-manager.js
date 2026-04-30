// ============================================================
// memory-manager.js — Session state management (frontend only)
// No API calls. All AI calls go through api-client.js → backend.
// ============================================================

class MemoryManager {
    constructor() {
        this.conversationHistory = [];
        this.sessionData = this._emptySession();
    }

    _emptySession() {
        return {
            jobId: null, jobTitle: null, mode: null,
            difficulty: 'intermediate', personality: 'neutral',
            userInfo: null, resumeText: null,
            startTime: null, endTime: null,
            questionCount: 0, answers: [], totalScore: 0
        };
    }

    initSession(jobId, mode, userInfo, difficulty = 'intermediate', personality = 'neutral') {
        const job = getJobById(jobId);
        this.sessionData = {
            jobId, jobTitle: job?.title || jobId, mode,
            difficulty, personality, userInfo,
            resumeText: sessionStorage.getItem('resumeText') || null,
            startTime: new Date().toISOString(), endTime: null,
            questionCount: 0, answers: [], totalScore: 0
        };
        this.conversationHistory = [];
    }

    addMessage(role, content) {
        this.conversationHistory.push({ role, content });
        if (this.conversationHistory.length > 40) {
            this.conversationHistory = this.conversationHistory.slice(-40);
        }
    }

    getHistory() {
        return this.conversationHistory.slice();
    }

    recordAnswer(question, answer, scoreData) {
        this.sessionData.questionCount++;
        this.sessionData.answers.push({
            index:        this.sessionData.questionCount,
            question,     answer,
            score:        scoreData?.overall       || 0,
            breakdown:    scoreData?.breakdown     || {},
            feedback:     scoreData?.feedback      || '',
            improvements: scoreData?.improvements  || [],
            timestamp:    new Date().toISOString()
        });
        const scores = this.sessionData.answers.map(a => a.score);
        this.sessionData.totalScore = Math.round(scores.reduce((a,b)=>a+b,0) / scores.length);
    }

    endSession() {
        this.sessionData.endTime = new Date().toISOString();
        this._persistAnalytics();
        return this.sessionData;
    }

    _persistAnalytics() {
        try {
            const key  = CONFIG.ANALYTICS_KEY;
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            data.push({ ...this.sessionData });
            if (data.length > 50) data.splice(0, data.length - 50);
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) { console.warn('Analytics persist failed:', e); }
    }
}

const memoryManager = new MemoryManager();
