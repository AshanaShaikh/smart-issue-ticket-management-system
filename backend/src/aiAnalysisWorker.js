// aiAnalysisWorker.js
// ─────────────────────────────────────────────────────────────────────────────
// In-process background worker for Gemini AI analysis jobs.
//
// Architecture:
//   - Jobs are persisted to the `ai_analysis_jobs` table so they survive
//     API requests returning quickly (async flow).
//   - An in-memory queue (Set of job IDs) tracks which jobs are currently
//     being processed so the same job is never picked up twice.
//   - Worker polls the DB every POLL_INTERVAL_MS for pending jobs.
//   - Each job gets a GEMINI_TIMEOUT_MS hard timeout via AbortController.
//   - If the server is restarted while a job is 'running', it will be left
//     in the 'running' state in DB. The startup recovery resets any stale
//     'running' jobs back to 'pending' so they can be retried.
//
// LIMITATION: Restarting the server will interrupt in-flight Gemini calls.
//   The job will be recovered to 'pending' on the next startup and retried.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const crypto    = require('crypto');
const pool      = require('./db');
const { GoogleGenAI } = require('@google/genai');

// ── Constants ─────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS  = 3000;   // How often to check for pending jobs
const GEMINI_TIMEOUT_MS = 45000;  // Hard cap per Gemini API call
const MAX_CONCURRENT    = 2;      // Max simultaneous Gemini calls

// ── AI client (lazy init so unit tests can mock) ──────────────────────────────
let _ai = null;
function getAI() {
    if (!_ai) {
        _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return _ai;
}

// ── In-memory set of job IDs currently being processed ───────────────────────
const activeJobs = new Set();

// ── Fingerprint helper ────────────────────────────────────────────────────────
/**
 * Generates a deterministic SHA-256 fingerprint from ticket content fields.
 * The separator '::' prevents collisions across fields.
 */
function computeContentHash(title, description, category) {
    return crypto
        .createHash('sha256')
        .update(`${title}::${description}::${category}`)
        .digest('hex');
}

// ── Gemini analysis helper ────────────────────────────────────────────────────
async function callGemini(title, description, category) {
    const prompt =
        `Classify this college IT ticket's priority.\n` +
        `Title: ${title}\nDescription: ${description}\nCategory: ${category}\n` +
        `Respond with suggested_priority (Low/Medium/High/Critical), confidence_score (0-1), and analysis (1-2 sentences).`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
        const resp = await getAI().interactions.create({
            model: 'gemini-3.5-flash-lite',
            input: prompt,
            response_format: {
                type: 'text',
                mime_type: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        suggested_priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
                        confidence_score:   { type: 'number' },
                        analysis:           { type: 'string' },
                    },
                    required: ['suggested_priority', 'confidence_score', 'analysis'],
                },
            },
        }, { signal: controller.signal });

        return JSON.parse(resp.output_text);
    } finally {
        clearTimeout(timer);
    }
}

// ── Core job processor ────────────────────────────────────────────────────────
async function processJob(job) {
    const { id: jobId, ticket_id, content_hash } = job;
    console.log(`[Worker] Starting job ${jobId} for ticket ${ticket_id}`);

    // Mark job as running
    await pool.query(
        `UPDATE ai_analysis_jobs SET status='running', started_at=NOW() WHERE id=$1`,
        [jobId]
    );

    try {
        // Fetch ticket content for prompt
        const ticketRes = await pool.query(
            'SELECT title, description, category FROM tickets WHERE id=$1',
            [ticket_id]
        );

        if (ticketRes.rows.length === 0) {
            await pool.query(
                `UPDATE ai_analysis_jobs SET status='failed', error_msg=$1, completed_at=NOW() WHERE id=$2`,
                ['Ticket not found', jobId]
            );
            return;
        }

        const { title, description, category } = ticketRes.rows[0];

        // Validate hash is still current (ticket might have changed while job was queued)
        const currentHash = computeContentHash(title, description, category);
        if (currentHash !== content_hash) {
            // Stale job — mark failed so the caller can create a fresh one
            await pool.query(
                `UPDATE ai_analysis_jobs SET status='failed', error_msg=$1, completed_at=NOW() WHERE id=$2`,
                ['Ticket content changed; please re-analyse', jobId]
            );
            return;
        }

        // Call Gemini
        console.time(`[Worker] gemini job ${jobId}`);
        const aiResult = await callGemini(title, description, category);
        console.timeEnd(`[Worker] gemini job ${jobId}`);

        // Validate result
        const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
        if (!validPriorities.includes(aiResult.suggested_priority)) {
            throw new Error(`Invalid priority from Gemini: ${aiResult.suggested_priority}`);
        }
        if (
            typeof aiResult.confidence_score !== 'number' ||
            aiResult.confidence_score < 0 ||
            aiResult.confidence_score > 1
        ) {
            throw new Error(`Invalid confidence_score from Gemini: ${aiResult.confidence_score}`);
        }

        // Use a transaction to atomically write analysis + update job
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Before inserting, double-check no newer analysis supersedes us.
            // (Race-condition guard: another concurrent job could have just finished.)
            const existing = await client.query(
                `SELECT id FROM ai_analysis WHERE ticket_id=$1 AND content_hash=$2 ORDER BY created_at DESC LIMIT 1`,
                [ticket_id, content_hash]
            );
            if (existing.rows.length > 0) {
                // A newer analysis already exists for this exact content — skip insert,
                // link the job to the existing analysis.
                const existingAnalysisId = existing.rows[0].id;
                await client.query(
                    `UPDATE ai_analysis_jobs SET status='completed', analysis_id=$1, completed_at=NOW() WHERE id=$2`,
                    [existingAnalysisId, jobId]
                );
                await client.query('COMMIT');
                console.log(`[Worker] Job ${jobId} skipped (analysis already exists: ${existingAnalysisId})`);
                return;
            }

            // Insert the AI analysis result
            const insertRes = await client.query(
                `INSERT INTO ai_analysis (ticket_id, suggested_priority, confidence_score, analysis, content_hash, is_cached)
                 VALUES ($1, $2, $3, $4, $5, FALSE)
                 RETURNING id`,
                [ticket_id, aiResult.suggested_priority, aiResult.confidence_score, aiResult.analysis, content_hash]
            );
            const analysisId = insertRes.rows[0].id;

            await client.query(
                `UPDATE ai_analysis_jobs SET status='completed', analysis_id=$1, completed_at=NOW() WHERE id=$2`,
                [analysisId, jobId]
            );
            await client.query('COMMIT');
            console.log(`[Worker] Job ${jobId} completed → analysis ${analysisId}`);
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

    } catch (err) {
        const isTimeout = err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes('abort'));
        const status    = isTimeout ? 'timed_out' : 'failed';
        console.error(`[Worker] Job ${jobId} ${status}: ${err.message}`);
        await pool.query(
            `UPDATE ai_analysis_jobs SET status=$1, error_msg=$2, completed_at=NOW() WHERE id=$3`,
            [status, err.message?.slice(0, 500) || 'Unknown error', jobId]
        );
    }
}

// ── Poll loop ─────────────────────────────────────────────────────────────────
async function pollOnce() {
    if (activeJobs.size >= MAX_CONCURRENT) return;

    const slots = MAX_CONCURRENT - activeJobs.size;
    let pendingJobs;
    try {
        const res = await pool.query(
            `SELECT id, ticket_id, content_hash FROM ai_analysis_jobs
             WHERE status='pending'
             ORDER BY created_at ASC
             LIMIT $1`,
            [slots]
        );
        pendingJobs = res.rows;
    } catch (err) {
        // DB temporarily unavailable — just wait for next poll
        console.error('[Worker] Poll error:', err.message);
        return;
    }

    for (const job of pendingJobs) {
        if (activeJobs.has(job.id)) continue; // already in flight
        activeJobs.add(job.id);

        // Fire-and-forget; remove from active set when done
        processJob(job).finally(() => activeJobs.delete(job.id));
    }
}

// ── Startup recovery ──────────────────────────────────────────────────────────
// Any job that was 'running' when the server last stopped is stale.
// Reset them to 'pending' so they get retried.
async function recoverStaleJobs() {
    try {
        const res = await pool.query(
            `UPDATE ai_analysis_jobs
             SET status='pending', error_msg='Server restarted during processing', started_at=NULL
             WHERE status='running'
             RETURNING id`
        );
        if (res.rows.length > 0) {
            console.log(`[Worker] Recovered ${res.rows.length} stale running job(s) to pending.`);
        }
    } catch (err) {
        console.error('[Worker] Recovery error:', err.message);
    }
}

// ── Public API ────────────────────────────────────────────────────────────────
let pollTimer = null;

async function start() {
    await recoverStaleJobs();
    console.log('[Worker] Started. Polling every', POLL_INTERVAL_MS, 'ms for pending jobs.');
    pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
    // Run immediately on start
    pollOnce();
}

function stop() {
    if (pollTimer) clearInterval(pollTimer);
}

module.exports = { start, stop, computeContentHash };
