// ============================================================
// api-client.js — Frontend → Backend API wrapper
// All HTTP calls go through this file. Zero API keys here.
// ============================================================

const ApiClient = (() => {
    async function request(method, path, body) {
        const url = `${CONFIG.API_BASE_URL}${path}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(url, options);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || `Request failed: ${res.status}`);
        }
        return data;
    }

    return {
        // Fetch available job roles
        getJobs() {
            return request('GET', '/api/jobs');
        },

        // Get next interviewer message
        // history: [{role, content}, ...]
        chat({ jobId, settings, userInfo, history, resumeText }) {
            return request('POST', '/api/chat', { jobId, settings, userInfo, history, resumeText });
        },

        // Score a single answer
        score({ question, answer, jobTitle, difficulty }) {
            return request('POST', '/api/score', { question, answer, jobTitle, difficulty });
        },

        // Generate final session feedback
        feedback(sessionData) {
            return request('POST', '/api/feedback', { sessionData });
        },

        // Parse resume text
        parseResume(resumeText) {
            return request('POST', '/api/resume', { resumeText });
        },

        // Health check
        health() {
            return request('GET', '/api/health');
        }
    };
})();
