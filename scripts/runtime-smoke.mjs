import fs from "node:fs";

const configSource = fs.readFileSync("auth-config.js", "utf8");
const url = configSource.match(/url:\s*"([^"]+)"/)?.[1] || "";
const publishableKey = configSource.match(/publishableKey:\s*"([^"]+)"/)?.[1] || "";

const fail = [];
const info = [];

if (!/^https:\/\//.test(url)) fail.push("invalid Supabase URL");
if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) fail.push("invalid publishable key format");

const request = async (path, init = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(url + path, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: publishableKey,
        ...init.headers
      }
    });
  } finally {
    clearTimeout(timer);
  }
};

if (!fail.length) {
  try {
    const authResponse = await request("/auth/v1/settings");
    if (!authResponse.ok) {
      fail.push(`Auth settings returned HTTP ${authResponse.status}`);
    } else {
      const settings = await authResponse.json();
      const external = settings?.external || {};
      if (external.discord !== true) {
        fail.push("Discord OAuth provider is not enabled in Supabase");
      } else {
        info.push("Discord OAuth provider is enabled.");
      }
    }
  } catch (error) {
    fail.push(`Auth smoke test failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const table of ["profiles", "media_applications"]) {
    try {
      const response = await request(`/rest/v1/${table}?select=*&limit=1`);
      if (response.status === 401) {
        info.push(`${table} Data API correctly blocks anonymous access (HTTP 401).`);
        continue;
      }

      if (!response.ok) {
        fail.push(`${table} Data API returned unexpected HTTP ${response.status}`);
      } else {
        const data = await response.json();
        if (!Array.isArray(data)) {
          fail.push(`${table} Data API did not return an array`);
        } else {
          fail.push(`${table} is publicly readable; expected anonymous access to be blocked`);
        }
      }
    } catch (error) {
      fail.push(`${table} smoke test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (fail.length) {
  console.error("NaZerak runtime smoke FAILED");
  for (const item of fail) console.error(" - " + item);
  process.exit(1);
}

console.log("NaZerak runtime smoke PASSED");
for (const item of info) console.log(" - " + item);
