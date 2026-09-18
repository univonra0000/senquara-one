// SENQUARA ONE
// STEP 1 — Registration + Pending + Master foundation
// One Platform. Everything Connected.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors()
      });
    }

    try {
      // Health check
      if (url.pathname === "/api/health" && request.method === "GET") {
        return json({
          ok: true,
          app: "SENQUARA ONE",
          version: "STEP 1"
        });
      }

      // Server-observed IP
      if (url.pathname === "/api/ip" && request.method === "GET") {
        return json({
          ip: request.headers.get("CF-Connecting-IP") || "",
          country: request.cf?.country || "",
          colo: request.cf?.colo || "",
          ray: request.headers.get("CF-Ray") || ""
        });
      }

      // Registration
      if (url.pathname === "/api/auth/register" && request.method === "POST") {
        return await register(request, env);
      }

      // Login
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        return await login(request, env);
      }

      // Logout
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        return json({ ok: true, message: "Logged out" });
      }

      return json({
        ok: false,
        error: "Route not found"
      }, 404);

    } catch (err) {
      return json({
        ok: false,
        error: err?.message || "Server error"
      }, 500);
    }
  }
};


// ===============================
// REGISTRATION
// ===============================

async function register(request, env) {

  const body = await request.json();

  const name = String(body.name || "").trim();
  const businessName = String(body.businessName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const mobile = String(body.mobile || "").trim();
  const country = String(body.country || "").trim();
  const password = String(body.password || "");
  const termsAccepted = body.termsAccepted === true;
  const termsVersion = String(body.termsVersion || "1.0");

  if (!name || !email || !mobile || !password) {
    return json({
      ok: false,
      error: "Name, email, mobile and password are required."
    }, 400);
  }

  if (!termsAccepted) {
    return json({
      ok: false,
      error: "Please accept the registration Terms and Conditions."
    }, 400);
  }

  if (password.length < 8) {
    return json({
      ok: false,
      error: "Password must contain at least 8 characters."
    }, 400);
  }

  // Check whether this is the first account
  const countResult = await env.DB
    .prepare("SELECT COUNT(*) AS total FROM users")
    .first();

  const totalUsers = Number(countResult?.total || 0);

  // Check duplicate email
  const existing = await env.DB
    .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first();

  if (existing) {
    return json({
      ok: false,
      error: "This email is already registered."
    }, 409);
  }

  const passwordHash = await hashPassword(password);

  const id = crypto.randomUUID();

  // First registered account becomes Owner/Master.
  // All later accounts remain pending.
  const firstUser = totalUsers === 0;

  const role = firstUser ? "owner" : "viewer";
  const status = firstUser ? "active" : "pending";

  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO users (
      id,
      name,
      business_name,
      email,
      mobile,
      country,
      password_hash,
      role,
      status,
      email_verified,
      terms_version,
      terms_accepted_at,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      name,
      businessName,
      email,
      mobile,
      country,
      passwordHash,
      role,
      status,
      firstUser ? 1 : 0,
      termsVersion,
      now,
      now,
      now
    )
    .run();

  // First account
  if (firstUser) {
    return json({
      ok: true,
      firstAccount: true,
      user: {
        id,
        name,
        businessName,
        email,
        mobile,
        country,
        role: "owner",
        status: "active"
      },
      message: "Initial Master/Admin account created."
    });
  }

  // Later accounts
  return json({
    ok: true,
    firstAccount: false,
    pending: true,
    user: {
      id,
      name,
      businessName,
      email,
      mobile,
      country,
      role,
      status
    },
    message:
      "Registration received. Your account is pending Master/Admin approval."
  });
}


// ===============================
// LOGIN
// ===============================

async function login(request, env) {

  const body = await request.json();

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return json({
      ok: false,
      error: "Email and password are required."
    }, 400);
  }

  const user = await env.DB
    .prepare(`
      SELECT
        id,
        name,
        business_name,
        email,
        mobile,
        country,
        password_hash,
        role,
        status,
        email_verified,
        terms_version
      FROM users
      WHERE email = ?
      LIMIT 1
    `)
    .bind(email)
    .first();

  if (!user) {
    return json({
      ok: false,
      error: "Invalid email or password."
    }, 401);
  }

  const valid = await verifyPassword(
    password,
    user.password_hash
  );

  if (!valid) {
    return json({
      ok: false,
      error: "Invalid email or password."
    }, 401);
  }

  // Pending account
  if (user.status === "pending") {
    return json({
      ok: false,
      pending: true,
      error: "Your account is pending Master/Admin approval."
    }, 403);
  }

  // Blocked account
  if (user.status === "blocked") {
    return json({
      ok: false,
      blocked: true,
      error: "Your account has been blocked by the Master/Admin."
    }, 403);
  }

  return json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      businessName: user.business_name,
      email: user.email,
      mobile: user.mobile,
      country: user.country,
      role: user.role,
      status: user.status,
      emailVerified: !!user.email_verified,
      termsVersion: user.terms_version
    }
  });
}


// ===============================
// PASSWORD HASH
// ===============================

async function hashPassword(password) {

  const salt = crypto.getRandomValues(
    new Uint8Array(16)
  );

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
      iterations: 100000,
      hash: "SHA-256"
    },
    key,
    256
  );

  return `${toBase64(salt)}.${toBase64(new Uint8Array(bits))}`;
}


async function verifyPassword(password, stored) {

  try {

    const parts = stored.split(".");

    if (parts.length !== 2) {
      return false;
    }

    const salt = fromBase64(parts[0]);
    const expected = fromBase64(parts[1]);

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
        iterations: 100000,
        hash: "SHA-256"
      },
      key,
      256
    );

    const actual = new Uint8Array(bits);

    if (actual.length !== expected.length) {
      return false;
    }

    let result = 0;

    for (let i = 0; i < actual.length; i++) {
      result |= actual[i] ^ expected[i];
    }

    return result === 0;

  } catch {
    return false;
  }
}


// ===============================
// HELPERS
// ===============================

function toBase64(bytes) {
  let binary = "";

  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }

  return btoa(binary);
}


function fromBase64(value) {
  const binary = atob(value);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}


function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}


function json(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...cors(),
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}
