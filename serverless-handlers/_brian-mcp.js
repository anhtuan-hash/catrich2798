import {
  serverClient,
  saveQuestions,
  saveExam,
  searchQuestions,
  getExam,
} from './_question-bank.js';

const MODERN_VERSION = '2026-07-28';
const LEGACY_VERSION = '2025-11-25';
const SERVER_INFO = { name: 'brian-question-bank', version: '1.0.0' };
const MCP_URL = 'https://esl-brian.vercel.app/mcp';
const RESOURCE_METADATA_URL = 'https://esl-brian.vercel.app/.well-known/oauth-protected-resource';
const AUTH_SERVER = 'https://xpkbgqdlfonsinriggmj.supabase.co/auth/v1';
const OAUTH_SCOPES = ['openid', 'email', 'profile'];

const WRITE_SECURITY = [{ type: 'oauth2', scopes: OAUTH_SCOPES }];
const READ_SECURITY = [{ type: 'oauth2', scopes: OAUTH_SCOPES }];

const TOOL_DEFS = [
  {
    name: 'save_brian_questions',
    title: 'Save questions to Brian Question Bank',
    description: 'Use this when the user wants newly created English questions or a shared reading/cloze bundle saved into their Brian Question Bank. Preserve bundle context and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          minItems: 1,
          maxItems: 200,
          items: {
            type: 'object',
            properties: {
              stem: { type: 'string' },
              options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 12 },
              correctAnswer: { type: 'string' },
              explanation: { type: 'string' },
              questionType: { type: 'string' },
              skill: { type: 'string' },
              cefr: { type: 'string' },
              topic: { type: 'string' },
              cognitiveLevel: { type: 'string' },
              difficulty: { type: 'integer', minimum: 1, maximum: 5 },
              grade: { type: 'integer', minimum: 1, maximum: 12 },
              grammarPoint: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              bundlePosition: { type: 'integer', minimum: 1 },
              status: { type: 'string' },
            },
            required: ['stem', 'options', 'correctAnswer'],
            additionalProperties: true,
          },
        },
        bundle: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            bundleType: { type: 'string' },
            contextText: { type: 'string' },
            instructions: { type: 'string' },
            topic: { type: 'string' },
            skill: { type: 'string' },
            grade: { type: 'integer' },
            schoolYear: { type: 'string' },
            status: { type: 'string' },
          },
          additionalProperties: true,
        },
        meta: { type: 'object', additionalProperties: true },
        requestId: { type: 'string' },
      },
      required: ['questions'],
      additionalProperties: true,
    },
    securitySchemes: WRITE_SECURITY,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
  },
  {
    name: 'save_brian_exam',
    title: 'Save a complete exam to Brian',
    description: 'Use this when the user wants a completed English exam, its questions, answer key, explanations, metadata and shared bundles saved as one Brian exam.',
    inputSchema: {
      type: 'object',
      properties: {
        exam: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            grade: { type: 'integer', minimum: 1, maximum: 12 },
            schoolYear: { type: 'string' },
            durationMinutes: { type: 'integer', minimum: 1, maximum: 600 },
            instructions: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            status: { type: 'string' },
            visibility: { type: 'string' },
            questions: { type: 'array', minItems: 1, maxItems: 200, items: { type: 'object', additionalProperties: true } },
            bundles: { type: 'array', items: { type: 'object', additionalProperties: true } },
            blueprint: { type: 'object', additionalProperties: true },
            settings: { type: 'object', additionalProperties: true },
          },
          required: ['title', 'questions'],
          additionalProperties: true,
        },
        meta: { type: 'object', additionalProperties: true },
        requestId: { type: 'string' },
      },
      required: ['exam'],
      additionalProperties: true,
    },
    securitySchemes: WRITE_SECURITY,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: false,
    },
  },
  {
    name: 'search_brian_questions',
    title: 'Search Brian Question Bank',
    description: 'Use this before creating similar content or when the user wants to find existing Brian questions. Search is scoped to the connected Brian account.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        grade: { type: 'integer', minimum: 1, maximum: 12 },
        cefr: { type: 'string' },
        skill: { type: 'string' },
        questionType: { type: 'string' },
        cognitiveLevel: { type: 'string' },
        status: { type: 'string' },
        topic: { type: 'string' },
        grammarPoint: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        filters: { type: 'object', additionalProperties: true },
      },
      additionalProperties: true,
    },
    securitySchemes: READ_SECURITY,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: 'get_brian_exam',
    title: 'Get a Brian exam',
    description: 'Use this when the user wants to reopen or inspect a specific exam already stored in their Brian Question Bank.',
    inputSchema: {
      type: 'object',
      properties: {
        testId: { type: 'string' },
      },
      required: ['testId'],
      additionalProperties: false,
    },
    securitySchemes: READ_SECURITY,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
];

function bearer(req) {
  const header = String(req.headers?.authorization || '');
  return header.replace(/^Bearer\s+/i, '').trim();
}

function isModern(req, body) {
  const header = String(req.headers?.['mcp-protocol-version'] || '').trim();
  const meta = body?.params?._meta || {};
  const bodyVersion = String(meta['io.modelcontextprotocol/protocolVersion'] || '').trim();
  return header === MODERN_VERSION || bodyVersion === MODERN_VERSION;
}

function serverMeta() {
  return { 'io.modelcontextprotocol/serverInfo': SERVER_INFO };
}

function okResult(req, body, id, result, { cacheable = false } = {}) {
  const modern = isModern(req, body);
  const payload = {
    ...(modern ? { resultType: 'complete' } : {}),
    ...result,
    ...(cacheable && modern ? { ttlMs: 300000, cacheScope: 'private' } : {}),
    ...(modern ? { _meta: { ...(result?._meta || {}), ...serverMeta() } } : {}),
  };
  return { jsonrpc: '2.0', id, result: payload };
}

function rpcError(id, code, message, data) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function authChallengeResult(req, body, id) {
  const challenge = `Bearer resource_metadata="${RESOURCE_METADATA_URL}", error="invalid_token", error_description="Connect your Brian account to continue"`;
  return okResult(req, body, id, {
    content: [{ type: 'text', text: 'Authentication required. Connect your Brian account to use this tool.' }],
    isError: true,
    _meta: { 'mcp/www_authenticate': [challenge] },
  });
}

function compactResult(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value.items) && value.items.length > 100) {
    return { ...value, items: value.items.slice(0, 100), truncated: true };
  }
  return value;
}

async function oauthSession(req) {
  const token = bearer(req);
  if (!token) return null;
  const db = serverClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return {
    db,
    ownerId: data.user.id,
    integration: null,
    sourceKind: 'plugin',
    oauthUser: data.user,
  };
}

async function callTool(session, name, args) {
  if (name === 'save_brian_questions') {
    const result = await saveQuestions(session, args || {});
    return {
      text: `Saved ${result.importedCount} new question(s); reused ${result.reusedCount} existing question(s).`,
      data: {
        importedCount: result.importedCount,
        reusedCount: result.reusedCount,
        itemIds: result.itemIds,
        bundleId: result.bundle?.id || null,
        bundleCreated: Boolean(result.bundleCreated),
      },
    };
  }
  if (name === 'save_brian_exam') {
    const result = await saveExam(session, args || {});
    return {
      text: `Saved exam "${result.test?.title || 'Brian exam'}" with ${result.questionIds?.length || 0} question(s).`,
      data: {
        test: result.test,
        questionIds: result.questionIds,
        bundleIds: (result.bundles || []).map((bundle) => bundle.id),
      },
    };
  }
  if (name === 'search_brian_questions') {
    const result = await searchQuestions(session, args || {});
    return {
      text: `Found ${result.count} matching Brian question(s).`,
      data: compactResult(result),
    };
  }
  if (name === 'get_brian_exam') {
    const result = await getExam(session, args || {});
    return {
      text: `Opened Brian exam "${result.test?.title || args?.testId || ''}" with ${result.items?.length || 0} question(s).`,
      data: compactResult(result),
    };
  }
  const error = new Error(`Unknown Brian tool: ${name}`);
  error.status = 404;
  throw error;
}

function setCommonHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

function sendJson(res, status, payload) {
  setCommonHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(payload));
}

export function oauthProtectedResource(_req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(200).json({
    resource: MCP_URL,
    authorization_servers: [AUTH_SERVER],
    scopes_supported: OAUTH_SCOPES,
    bearer_methods_supported: ['header'],
    resource_documentation: 'https://esl-brian.vercel.app/#/assessment-core',
  });
}

export default async function brianMcp(req, res) {
  if (req.method === 'OPTIONS') {
    setCommonHeaders(res);
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, rpcError(null, -32600, 'Brian MCP accepts POST requests only.'));
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const id = body.id ?? null;
  const method = String(body.method || '').trim();

  if (!method) return sendJson(res, 400, rpcError(id, -32600, 'Invalid JSON-RPC request.'));

  try {
    if (method === 'server/discover') {
      return sendJson(res, 200, okResult(req, body, id, {
        supportedVersions: [MODERN_VERSION],
        capabilities: { tools: {} },
        instructions: 'Brian Question Bank stores and retrieves English assessment questions and exams. Search before creating similar items. Preserve shared Reading/Cloze context as a bundle. Save only after the user has asked to store content.',
      }, { cacheable: true }));
    }

    if (method === 'initialize') {
      const requested = String(body.params?.protocolVersion || LEGACY_VERSION);
      const protocolVersion = ['2025-11-25', '2025-06-18', '2025-03-26'].includes(requested)
        ? requested
        : LEGACY_VERSION;
      return sendJson(res, 200, {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
          instructions: 'Brian Question Bank stores and retrieves English assessment questions and exams. Search before creating similar content and preserve shared bundle context.',
        },
      });
    }

    if (method === 'notifications/initialized') {
      setCommonHeaders(res);
      res.statusCode = 202;
      return res.end();
    }

    if (method === 'ping') {
      return sendJson(res, 200, okResult(req, body, id, {}));
    }

    if (method === 'tools/list') {
      return sendJson(res, 200, okResult(req, body, id, { tools: TOOL_DEFS }, { cacheable: true }));
    }

    if (method === 'tools/call') {
      const toolName = String(body.params?.name || '').trim();
      const headerName = String(req.headers?.['mcp-name'] || '').trim();
      if (headerName && toolName && headerName !== toolName) {
        return sendJson(res, 400, rpcError(id, -32020, 'Mcp-Name header does not match params.name.'));
      }
      const tool = TOOL_DEFS.find((entry) => entry.name === toolName);
      if (!tool) return sendJson(res, 404, rpcError(id, -32601, `Unknown Brian tool: ${toolName}`));

      const session = await oauthSession(req);
      if (!session) return sendJson(res, 200, authChallengeResult(req, body, id));

      const { text, data } = await callTool(session, toolName, body.params?.arguments || {});
      return sendJson(res, 200, okResult(req, body, id, {
        content: [{ type: 'text', text }],
        structuredContent: data,
      }));
    }

    return sendJson(res, 404, rpcError(id, -32601, `Method not found: ${method}`));
  } catch (error) {
    console.error('[brian-mcp]', error);
    const status = Number(error?.status) || 500;
    return sendJson(res, status >= 400 && status < 600 ? status : 500, rpcError(
      id,
      status === 400 ? -32602 : -32000,
      error?.message || 'Brian MCP request failed.',
    ));
  }
}
