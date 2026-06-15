const STATE_KEY = "state";

const ALLOWED_ORIGINS = [
  "https://michealbingo.com",
  "https://michaelbingo.com",
  "https://www.michealbingo.com",
  "https://www.michaelbingo.com",
  "http://localhost:5050",
  "http://127.0.0.1:5050",
];

const DEFAULT_STATE = {
  items: [
    "Spills drink",
    "Shouts out the bitches",
    "Buys a beer he hates",
    "Goes silent",
    "Insinuates his drink is his dinner",
    "Starts a conversation with a stranger",
    "Does the tonge wagging thing",
    "Askes someone else to buy him a drink",
    "Comments on the music",
    "Says something insane, then tries to dap someone up",
    "Complains about work",
    "* Loses his phone",
    "* Takes his shirt off",
    "* Orders a round of shots nobody asked for",
    "* Insists on paying for people's drinks",
    "* Tells the same story for the second time",
    "Tries to convince everyone to go somewhere else",
    "* Starts dancing before anyone else does",
    "* Gets way too competitive at a bar game",
    "* Falls off a barstool",
    "* Hugs someone he just met",
    "* Starts singing along to a song he doesn't know the words to",
    "* Loses track of how many drinks he's had",
    "* Tries to order food after the kitchen's closed",
  ],
  spillCount: 0,
};

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function getState(env) {
  const stored = await env.BINGO_KV.get(STATE_KEY, "json");
  return stored || DEFAULT_STATE;
}

async function setState(env, state) {
  await env.BINGO_KV.put(STATE_KEY, JSON.stringify(state));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (url.pathname === "/state" && request.method === "GET") {
      return json(await getState(env), 200, origin);
    }

    if (url.pathname === "/items" && request.method === "POST") {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return json({ error: "Too many requests, slow down." }, 429, origin);
      }

      const body = await request.json();
      if (body.password !== env.EDIT_PASSWORD) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
      if (!Array.isArray(body.items) || body.items.length < 24) {
        return json({ error: "Need at least 24 items" }, 400, origin);
      }
      const state = await getState(env);
      state.items = body.items;
      await setState(env, state);
      return json(state, 200, origin);
    }

    if (url.pathname === "/spill" && request.method === "POST") {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return json({ error: "Too many requests, slow down." }, 429, origin);
      }

      const body = await request.json();
      if (body.password !== env.EDIT_PASSWORD) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
      const state = await getState(env);
      state.spillCount = Math.max(0, (state.spillCount || 0) + (body.delta || 0));
      await setState(env, state);
      return json(state, 200, origin);
    }

    return json({ error: "Not found" }, 404, origin);
  },
};
