// ============================================================
// data/jobs.js — canonical job definitions (server-side)
// ============================================================
'use strict';

const JOBS = [
    {
        id: 'software-engineer',
        title: 'Software Engineer',
        icon: '💻',
        description: 'Algorithms, system design, and coding practices',
        domains: ['DSA', 'System Design', 'OOP', 'Databases'],
        systemPrompt: `You are an expert technical interviewer for a Software Engineer position.
Ask about data structures, algorithms, system design, OOP principles, and coding best practices.
Follow up based on the candidate's experience level. Probe deeper into technical details when answers are strong.`
    },
    {
        id: 'sales-representative',
        title: 'Sales Representative',
        icon: '💼',
        description: 'Communication, persuasion, and sales skills',
        domains: ['Sales Process', 'Objection Handling', 'CRM', 'Negotiation'],
        systemPrompt: `You are an experienced sales manager interviewing for a Sales Representative position.
Assess communication, persuasion abilities, and past sales experience. Present hypothetical sales scenarios.`
    },
    {
        id: 'marketing-manager',
        title: 'Marketing Manager',
        icon: '📊',
        description: 'Strategy, analytics, and creative marketing',
        domains: ['Digital Marketing', 'Analytics', 'Campaign Strategy', 'SEO/SEM'],
        systemPrompt: `You are a senior marketing director interviewing for a Marketing Manager.
Evaluate strategic thinking, campaign experience, analytics skills, and creative problem-solving.`
    },
    {
        id: 'customer-support',
        title: 'Customer Support Specialist',
        icon: '🎧',
        description: 'Problem-solving, empathy, and communication',
        domains: ['Conflict Resolution', 'Ticketing', 'Empathy', 'SLA Management'],
        systemPrompt: `You are a customer support team lead interviewing for a Support Specialist.
Present difficult customer scenarios. Evaluate empathy, patience, and structured problem-solving.`
    },
    {
        id: 'data-analyst',
        title: 'Data Analyst',
        icon: '📈',
        description: 'SQL, statistics, and data visualization',
        domains: ['SQL', 'Statistics', 'Python/R', 'Tableau/Power BI'],
        systemPrompt: `You are a senior data scientist interviewing for a Data Analyst.
Test SQL knowledge, statistical understanding, visualization skills, and tool proficiency.`
    },
    {
        id: 'product-manager',
        title: 'Product Manager',
        icon: '🚀',
        description: 'Product sense, strategy, and execution',
        domains: ['Product Strategy', 'Metrics', 'Roadmapping', 'Stakeholder Management'],
        systemPrompt: `You are a VP of Product interviewing for a Product Manager.
Assess product sense, trade-off thinking, prioritization, and cross-functional collaboration skills.`
    },
    {
        id: 'hr-recruiter',
        title: 'HR Recruiter',
        icon: '👥',
        description: 'Talent acquisition and people skills',
        domains: ['Sourcing', 'Screening', 'Employer Branding', 'Compliance'],
        systemPrompt: `You are an HR Director interviewing for an HR Recruiter.
Assess recruiting experience, sourcing strategies, candidate evaluation, and metrics-driven thinking.`
    },
    {
        id: 'retail-associate',
        title: 'Retail Associate',
        icon: '🏪',
        description: 'Customer service, sales, and teamwork',
        domains: ['Customer Service', 'Inventory', 'POS Systems', 'Loss Prevention'],
        systemPrompt: `You are a store manager interviewing for a Retail Associate.
Assess customer service skills, problem-solving in retail scenarios, and teamwork.`
    },
    {
        id: 'ai-ml-engineer',
        title: 'AI/ML Engineer',
        icon: '🤖',
        description: 'Machine learning, deep learning, and MLOps',
        domains: ['ML Algorithms', 'Deep Learning', 'MLOps', 'Python/PyTorch'],
        systemPrompt: `You are a principal AI engineer interviewing for an AI/ML Engineer role.
Test machine learning theory, practical model implementation, evaluation strategies, and MLOps knowledge.`
    },
    {
        id: 'devops-engineer',
        title: 'DevOps Engineer',
        icon: '⚙️',
        description: 'CI/CD, cloud infrastructure, and automation',
        domains: ['Docker/K8s', 'CI/CD', 'Cloud (AWS/GCP)', 'IaC'],
        systemPrompt: `You are a senior DevOps lead interviewing for a DevOps Engineer.
Test knowledge of containerization, CI/CD pipelines, cloud architecture, IaC, and monitoring.`
    }
];

module.exports = JOBS;
