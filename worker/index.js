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
      // -------------------------------
      // HEALTH
      // -------------------------------
      if (
        url.pathname === "/api/health" &&
        request.method === "GET"
      ) {
        return json({
          ok: true,
          app: "SENQUARA ONE",
          version: "STEP 1"
        });
      }

      // -------------------------------
      // SERVER IP
      // -------------------------------
      if (
        url.pathname === "/api/ip" &&
        request.method === "GET"
      ) {
        return json({
          ok: true,
          ip: request.headers.get("CF-Connecting-IP") || "",
          country: request.cf?.country || "",
          colo: request.cf?.colo || "",
          ray: request.headers.get("CF-Ray") || ""
        });
      }

      // -------------------------------
      // REGISTER
      // -------------------------------
      if (
        url.pathname === "/api/auth/register" &&
        request.method === "POST"
      ) {
        return await register(request, env);
      }

      // -------------------------------
      // LOGIN
      // -------------------------------
      if (
        url.pathname === "/api/auth/login" &&
        request.method === "POST"
      ) {
        return await login(request, env);
      }

      // -------------------------------
      // LOGOUT
      // -------------------------------
      if (
        url.pathname === "/api/auth/logout" &&
        request.method === "POST"
      ) {
        return json({
          ok: true,
          message: "Logged out successfully."
        });
      }

      return json({
        ok: false,
        error: "Route not found."
      }, 404);

    } catch (error) {
      return json({
        ok: false,
        error: error?.message || "Server error."
      }, 500);
    }
  }
};


// ==================================================
// REGISTER
// ==================================================

async function register(request, env) {

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      ok: false,
      error: "Invalid JSON request."
    }, 400);
  }

  const name = String(body.name || "").trim();
  const businessName = String(body.businessName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const mobile = String(body.mobile || "").trim();
  const country = String(body.country || "").trim();
  const password = String(body.password || "");

  const termsAccepted = body.termsAccepted === true;
  const termsVersion = String(
    body.termsVersion || "1.0"
  ).trim();

  // Required fields
  if (!name) {
    return json({
      ok: false,
      error: "Full name is required."
    }, 400);
  }

  if (!email) {
    return json({
      ok: false,
      error: "Email is required."
    }, 400);
  }

  if (!mobile) {
    return json({
      ok: false,
      error: "Mobile number is required."
    }, 400);
  }

  if (!password) {
    return json({
      ok: false,
      error: "Password is required."
    }, 400);
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({
      ok: false,
      error: "Please enter a valid email address."
    }, 400);
  }

  // Password
  if (password.length < 8) {
    return json({
      ok: false,
      error: "Password must contain at least 8 characters."
    }, 400);
  }

  // Terms
  if (!termsAccepted) {
    return json({
      ok: false,
      error: "Please accept the Terms and Conditions."
    }, 400);
  }

  // ----------------------------------------------
  // Check existing users
  // ----------------------------------------------

  const countResult = await env.DB
    .prepare(
      "SELECT COUNT(*) AS total FROM users"
    )
    .first();

  const totalUsers = Number(
    countResult?.total || 0
  );

  // ----------------------------------------------
  // Duplicate email
  // ----------------------------------------------

  const existing = await env.DB
    .prepare(
      "SELECT id FROM users WHERE email = ? LIMIT 1"
    )
    .bind(email)
    .first();

  if (existing) {
    return json({
      ok: false,
      error: "This email is already registered."
    }, 409);
  }

  // ----------------------------------------------
  // Password
  // ----------------------------------------------

  const passwordData =
    await hashPassword(password);

  // ----------------------------------------------
  // Account information
  // ----------------------------------------------

  const id = crypto.randomUUID();

  /*
    First account:
      role   = owner
      status = active

    Later accounts:
      role   = viewer
      status = pending
  */

  const firstUser = totalUsers === 0;

  const role = firstUser
    ? "owner"
    : "viewer";

  const status = firstUser
    ? "active"
    : "pending";

  /*
    STEP 1:
    First account is allowed to become
    the initial Master/Owner.

    Later accounts wait for approval.

    Email verification will be added
    in the next tested step.
  */

  const emailVerified = firstUser ? 1 : 0;

  const now =
    new Date().toISOString();

  // ----------------------------------------------
  // Insert user
  // ----------------------------------------------

  await env.DB
    .prepare(`
      INSERT INTO users (
        id,
        email,
        name,
        mobile,
        business_name,
        country,
        password_hash,
        password_salt,
        role,
        created_at,
        status,
        email_verified,
        terms_version,
        terms_accepted_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `)
    .bind(
      id,
      email,
      name,
      mobile,
      businessName,
      country,
      passwordData.hash,
      passwordData.salt,
      role,
      now,
      status,
      emailVerified,
      termsVersion,
      now,
      now
    )
    .run();

  // ----------------------------------------------
  // FIRST USER
  // ----------------------------------------------

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
        status: "active",
        emailVerified: true
      },

      message:
        "Initial Master/Admin account created successfully."
    });
  }

  // ----------------------------------------------
  // LATER USER
  // ----------------------------------------------

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
      role: "viewer",
      status: "pending",
      emailVerified: false
    },

    message:
      "Registration received. Your account is pending Master/Admin approval."
  });
}


// ==================================================
// LOGIN
// ==================================================

async function login(request, env) {

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      ok: false,
      error: "Invalid JSON request."
    }, 400);
  }

  const email = String(
    body.email || ""
  ).trim().toLowerCase();

  const password = String(
    body.password || ""
  );

  if (!email || !password) {
    return json({
      ok: false,
      error: "Email and password are required."
    }, 400);
  }

  // ----------------------------------------------
  // Find user
  // ----------------------------------------------

  const user = await env.DB
    .prepare(`
      SELECT
        id,
        email,
        name,
        mobile,
        business_name,
        country,
        password_hash,
        password_salt,
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

  // ----------------------------------------------
  // Password verification
  // ----------------------------------------------

  const valid =
    await verifyPassword(
      password,
      user.password_hash,
      user.password_salt
    );

  if (!valid) {
    return json({
      ok: false,
      error: "Invalid email or password."
    }, 401);
  }

  // ----------------------------------------------
  // Pending
  // ----------------------------------------------

  if (user.status === "pending") {
    return json({
      ok: false,
      pending: true,
      error:
        "Your account is pending Master/Admin approval."
    }, 403);
  }

  // ----------------------------------------------
  // Blocked
  // ----------------------------------------------

  if (user.status === "blocked") {
    return json({
      ok: false,
      blocked: true,
      error:
        "Your account has been blocked by the Master/Admin."
    }, 403);
  }

  // ----------------------------------------------
  // Active
  // ----------------------------------------------

  return json({
    ok: true,

    user: {
      id: user.id,
      name: user.name,
      businessName: user.business_name || "",
      email: user.email,
      mobile: user.mobile || "",
      country: user.country || "",
      role: user.role,
      status: user.status,
      emailVerified:
        Number(user.email_verified || 0) === 1,
      termsVersion:
        user.terms_version || ""
    },

    message: "Login successful."
  });
}


// ==================================================
// PASSWORD HASH
// ==================================================

async function hashPassword(password) {

  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

  const bits =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      key,
      256
    );

  return {
    salt: toBase64(salt),
    hash: toBase64(
      new Uint8Array(bits)
    )
  };
}


// ==================================================
// PASSWORD VERIFY
// ==================================================

async function verifyPassword(
  password,
  storedHash,
  storedSalt
) {

  try {

    if (!storedHash || !storedSalt) {
      return false;
    }

    const salt =
      fromBase64(storedSalt);

    const expected =
      fromBase64(storedHash);

    const key =
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
      );

    const bits =
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt,
          iterations: 100000,
          hash: "SHA-256"
        },
        key,
        256
      );

    const actual =
      new Uint8Array(bits);

    if (
      actual.length !==
      expected.length
    ) {
      return false;
    }

    let result = 0;

    for (
      let i = 0;
      i < actual.length;
      i++
    ) {
      result |=
        actual[i] ^ expected[i];
    }

    return result === 0;

  } catch {
    return false;
  }
}


// ==================================================
// BASE64
// ==================================================

function toBase64(bytes) {

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}


function fromBase64(value) {

  const binary =
    atob(value);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}


// ==================================================
// CORS
// ==================================================

function cors() {

  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization"
  };
}


// ==================================================
// JSON RESPONSE
// ==================================================

function json(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        ...cors(),
        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}
