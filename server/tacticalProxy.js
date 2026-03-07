const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
    const candidatePaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '..', '.env')
    ];

    let loadedFrom = null;
    for (const envPath of candidatePaths) {
        if (!fs.existsSync(envPath)) continue;
        const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq <= 0) continue;
            const key = trimmed.slice(0, eq).trim();
            const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
            if (!(key in process.env)) process.env[key] = value;
        }
        loadedFrom = envPath;
        break;
    }

    console.log(`[Tactical Proxy] .env loaded from=${loadedFrom || 'not found'}`);
}

loadEnvFile();

const PORT = Number(String(process.env.LLM_PROXY_PORT || 8787).trim());
const OPENAI_ENDPOINT = String(process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions').trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
let OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();

function loadLocalKeyFile() {
    const keyPaths = [
        path.resolve(process.cwd(), 'server', '.openai_key'),
        path.resolve(__dirname, '.openai_key')
    ];
    for (const kp of keyPaths) {
        if (!fs.existsSync(kp)) continue;
        const key = String(fs.readFileSync(kp, 'utf8')).trim();
        if (key) {
            OPENAI_API_KEY = key;
            console.log(`[Tactical Proxy] key loaded from local file=${kp}`);
            return;
        }
    }
}

if (!OPENAI_API_KEY) loadLocalKeyFile();

console.log(`[Tactical Proxy] OPENAI key present=${OPENAI_API_KEY ? 'yes' : 'no'} model=${OPENAI_MODEL} port=${PORT}`);

function writeJson(res, code, body) {
    res.writeHead(code, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(body));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let buf = '';
        req.on('data', (chunk) => { buf += chunk; });
        req.on('end', () => resolve(buf));
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        writeJson(res, 200, { ok: true });
        return;
    }

    if (req.method === 'GET' && req.url === '/health') {
        writeJson(res, 200, {
            ok: true,
            keyPresent: !!OPENAI_API_KEY,
            model: OPENAI_MODEL,
            endpoint: OPENAI_ENDPOINT,
            port: PORT
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/tactical-plan') {
        if (!OPENAI_API_KEY) {
            writeJson(res, 500, { error: 'OPENAI_API_KEY missing in .env' });
            return;
        }

        try {
            const raw = await readBody(req);
            const body = raw ? JSON.parse(raw) : {};
            const model = body.model || OPENAI_MODEL;
            const prompt = String(body.prompt || '');
            if (!prompt) {
                writeJson(res, 400, { error: 'prompt required' });
                return;
            }

            const upstream = await fetch(OPENAI_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.25,
                    max_tokens: 240,
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a cricket tactics planner. Return strict JSON only. Do not invent players, shots, deliveries, score, or phase.'
                        },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (!upstream.ok) {
                const txt = await upstream.text();
                console.error(`[Tactical Proxy] Upstream error status=${upstream.status} body=${txt.slice(0, 400)}`);
                writeJson(res, upstream.status, { error: txt.slice(0, 400) });
                return;
            }

            const data = await upstream.json();
            const content = data?.choices?.[0]?.message?.content || '';
            writeJson(res, 200, { content });
        } catch (err) {
            writeJson(res, 500, { error: String(err?.message || err) });
        }
        return;
    }

    writeJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    console.log(`Tactical proxy listening on http://localhost:${PORT}`);
});
