const JSON_HEADERS = {
  "content-type": "application/json;charset=UTF-8",
  "cache-control": "no-store"
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });

function cors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );
  return response;
}

function b64u(data) {
  return btoa(
    String.fromCharCode(...new Uint8Array(data))
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function ub64(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");

  while (str.length % 4) {
    str += "=";
  }

  return Uint8Array.from(
    atob(str),
    c => c.charCodeAt(0)
  );
}

async function hashPassword(password, saltValue) {
  const salt = saltValue
    ? ub64(saltValue)
    : crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 210000,
      hash: "SHA-256"
    },
    key,
    256
  );

  return {
    salt: b64u(salt),
    hash: b64u(bits)
  };
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const body = b64u(
    new TextEncoder().encode(
      JSON.stringify(payload)
    )
  );

  const signature = b64u(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(body)
    )
  );

  return `${body}.${signature}`;
}

async function verifyToken(token, secret) {
  try {
    if (!token || !secret) return null;

    const parts = token.split(".");

    if (parts.length !== 2) return null;

    const [body, signature] = parts;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      ub64(signature),
      new TextEncoder().encode(body)
    );

    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(
        ub64(body)
      )
    );

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function auth(request, env) {
  const authorization =
    request.headers.get("Authorization") || "";

  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  const payload = await verifyToken(
    token,
    env.APP_SECRET
  );

  if (!payload) return null;

  return await env.DB
    .prepare(
      `SELECT
        id,
        email,
        name,
        mobile,
        business_name,
        country,
        role
       FROM users
       WHERE id = ?`
    )
    .bind(payload.sub)
    .first();
}

function makeId() {
  return crypto.randomUUID();
}

async function audit(
  env,
  user,
  action,
  entity,
  entityId,
  details = {}
) {
  await env.DB
    .prepare(
      `INSERT INTO audit_log
       (
         id,
         user_id,
         action,
         entity,
         entity_id,
         details,
         created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      makeId(),
      user?.id || null,
      action,
      entity,
      entityId,
      JSON.stringify(details)
    )
    .run();
}

async function handle(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204
    });
  }

  /* Health check */
  if (
    url.pathname === "/api/health" &&
    request.method === "GET"
  ) {
    return json({
      ok: true,
      service: "SENQUARA ONE Cloudflare D1 API",
      time: new Date().toISOString()
    });
  }

  /* Register */
  if (
    url.pathname === "/api/auth/register" &&
    request.method === "POST"
  ) {
    const body = await request.json();

    if (
      !body.email ||
      !body.password ||
      !body.name ||
      !body.businessName
    ) {
      return json(
        {
          error:
            "Required registration fields are missing"
        },
        400
      );
    }

    const email = body.email
      .trim()
      .toLowerCase();

    const exists = await env.DB
      .prepare(
        "SELECT id FROM users WHERE email = ?"
      )
      .bind(email)
      .first();

    if (exists) {
      return json(
        {
          error:
            "Email already registered"
        },
        409
      );
    }

    const password = await hashPassword(
      body.password
    );

    const userId = makeId();

    await env.DB
      .prepare(
        `INSERT INTO users
        (
          id,
          email,
          name,
          mobile,
          business_name,
          country,
          password_hash,
          password_salt,
          role,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        userId,
        email,
        body.name,
        body.mobile || "",
        body.businessName,
        body.country || "",
        password.hash,
        password.salt,
        "owner"
      )
      .run();

    await env.DB
      .prepare(
        `INSERT INTO user_roles
        (
          id,
          user_id,
          role_id
        )
        VALUES (?, ?, ?)`
      )
      .bind(
        makeId(),
        userId,
        "owner"
      )
      .run();

    const token = await sign(
      {
        sub: userId,
        exp:
          Date.now() +
          1000 * 60 * 60 * 24 * 7
      },
      env.APP_SECRET
    );

    return json({
      token,
      user: {
        id: userId,
        name: body.name,
        email,
        mobile: body.mobile || "",
        business: {
          name: body.businessName,
          country: body.country || ""
        },
        role: "owner"
      }
    });
  }

  /* Login */
  if (
    url.pathname === "/api/auth/login" &&
    request.method === "POST"
  ) {
    const body = await request.json();

    const email = (body.email || "")
      .trim()
      .toLowerCase();

    const user = await env.DB
      .prepare(
        "SELECT * FROM users WHERE email = ?"
      )
      .bind(email)
      .first();

    if (!user) {
      return json(
        {
          error:
            "Invalid email or password"
        },
        401
      );
    }

    const password = await hashPassword(
      body.password || "",
      user.password_salt
    );

    if (
      password.hash !== user.password_hash
    ) {
      return json(
        {
          error:
            "Invalid email or password"
        },
        401
      );
    }

    const token = await sign(
      {
        sub: user.id,
        exp:
          Date.now() +
          1000 * 60 * 60 * 24 * 7
      },
      env.APP_SECRET
    );

    return json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        business: {
          name: user.business_name,
          country: user.country
        },
        role: user.role
      }
    });
  }

  /* Authenticated API */
  const user = await auth(
    request,
    env
  );

  if (
    url.pathname === "/api/me" &&
    request.method === "GET"
  ) {
    return user
      ? json({ user })
      : json(
          { error: "Unauthorized" },
          401
        );
  }

  if (!user) {
    return json(
      { error: "Unauthorized" },
      401
    );
  }

  /* Sync push */
  if (
    url.pathname === "/api/sync/push" &&
    request.method === "POST"
  ) {
    const body = await request.json();

    await env.DB
      .prepare(
        `INSERT INTO business_records
        (
          id,
          user_id,
          record_type,
          data,
          version,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, record_type)
        DO UPDATE SET
          data = excluded.data,
          version = excluded.version,
          updated_at = excluded.updated_at`
      )
      .bind(
        makeId(),
        user.id,
        "workspace",
        JSON.stringify(
          body.workspace || {}
        ),
        Date.now()
      )
      .run();

    await audit(
      env,
      user,
      "SYNC_PUSH",
      "workspace",
      user.id,
      {
        changes:
          (body.changes || []).length
      }
    );

    return json({
      ok: true
    });
  }

  /* Sync pull */
  if (
    url.pathname === "/api/sync/pull" &&
    request.method === "GET"
  ) {
    const record = await env.DB
      .prepare(
        `SELECT
          data,
          version,
          updated_at
         FROM business_records
         WHERE user_id = ?
         AND record_type = 'workspace'`
      )
      .bind(user.id)
      .first();

    return json({
      workspace: record
        ? JSON.parse(record.data)
        : null,
      version:
        record?.version || 0,
      updated_at:
        record?.updated_at || null
    });
  }

  /* Master data */
  if (
    url.pathname.startsWith("/api/master/") &&
    request.method === "GET"
  ) {
    const table =
      url.pathname
        .split("/")
        .pop();

    const rows = await env.DB
      .prepare(
        `SELECT
          id,
          name,
          data,
          status,
          version,
          updated_at
         FROM master_records
         WHERE category = ?
         ORDER BY name`
      )
      .bind(table)
      .all();

    return json({
      rows: rows.results || []
    });
  }

  /* Publish */
  if (
    url.pathname ===
      "/api/approvals/publish" &&
    request.method === "POST"
  ) {
    if (
      !["owner", "admin"].includes(
        user.role
      )
    ) {
      return json(
        {
          error:
            "Owner/Admin approval required"
        },
        403
      );
    }

    const body = await request.json();

    const version =
      body.version || "1.0.0";

    await env.DB
      .prepare(
        `INSERT INTO app_releases
        (
          id,
          version,
          master_snapshot,
          approved_by,
          status,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        makeId(),
        version,
        JSON.stringify(
          body.master || {}
        ),
        user.id,
        "published"
      )
      .run();

    await audit(
      env,
      user,
      "PUBLISH",
      "release",
      version
    );

    return json({
      ok: true,
      version
    });
  }

  /* UPI payment */
  if (
    url.pathname ===
      "/api/payments/upi/create" &&
    request.method === "POST"
  ) {
    const body = await request.json();

    const paymentId = makeId();

    await env.DB
      .prepare(
        `INSERT INTO payment_transactions
        (
          id,
          user_id,
          provider,
          method,
          amount,
          currency,
          status,
          reference,
          metadata,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        paymentId,
        user.id,
        "provider-pending",
        "UPI",
        Number(body.amount) || 0,
        body.currency || "INR",
        "created",
        body.reference ||
          paymentId,
        JSON.stringify(body)
      )
      .run();

    return json({
      ok: true,
      paymentId,
      status: "created",
      message:
        "Connect an authorized PSP/payment provider adapter for production UPI confirmation."
    });
  }

  /* Serve website */
  if (!url.pathname.startsWith("/api/")) {
    return env.ASSETS.fetch(request);
  }

  return json(
    {
      error: "Not found"
    },
    404
  );
}

export default {
  async fetch(request, env) {
    try {
      return cors(
        await handle(
          request,
          env
        )
      );
    } catch (error) {
      return cors(
        json(
          {
            error: "Server error",
            detail:
              String(
                error?.message ||
                  error
              )
          },
          500
        )
      );
    }
  }
};
