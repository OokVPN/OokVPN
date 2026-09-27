const REPO_RAW_BASE =
  "https://raw.githubusercontent.com/OokVPN/OokVPN/main";

const LEGACY_SERVERS = [
  "Auto1",
  "Auto2",
  "Bypass1",
  "Bypass2",
  "Bypass3",
  "Bypass4",
  "Finland1",
  "Germany1",
  "Netherlands1",
  "Netherlands2",
  "Poland1",
  "Russia1"
];

function encodeHappBase64(text) {
  return `base64:${Buffer.from(text, "utf8").toString("base64")}`;
}

function normalizeUnicode(value) {
  if (typeof value === "string") {
    return value.normalize("NFC");
  }

  if (Array.isArray(value)) {
    return value.map(normalizeUnicode);
  }

  if (value && typeof value === "object") {
    const result = {};

    for (const [key, val] of Object.entries(value)) {
      result[normalizeUnicode(key)] = normalizeUnicode(val);
    }

    return result;
  }

  return value;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const results = [];

    for (const name of LEGACY_SERVERS) {
      const url =
        `${REPO_RAW_BASE}/servers/${encodeURIComponent(name)}.json`;

      try {
        const response = await fetch(url, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Accept-Charset": "utf-8",
            "User-Agent": "OokVPN-Legacy/1.0"
          }
        });

        const text = await response.text();

        if (!response.ok) {
          throw new Error(
            `${name}.json: GitHub HTTP ${response.status} ${response.statusText}`
          );
        }

        if (!text.trim()) {
          throw new Error(
            `${name}.json: empty response`
          );
        }

        let json;

        try {
          json = JSON.parse(text);
        } catch (error) {
          throw new Error(
            `${name}.json: invalid JSON — ${error.message}`
          );
        }

        results.push(normalizeUnicode(json));

      } catch (error) {
        console.error(
          `[Legacy] Failed to load ${name}.json:`,
          error
        );

        return res.status(500).json({
          error: "Legacy subscription error",
          server: name,
          message:
            error instanceof Error
              ? error.message
              : String(error)
        });
      }
    }

    const output = JSON.stringify(results);
    
    const profileTitle =
      "OokVPN Legacy 🫡";

    const announce =
      "⚠️ OokVPN Legacy — старая версия подписки. Gemini не работает.";

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    res.setHeader(
      "profile-title",
      encodeHappBase64(profileTitle)
    );

    res.setHeader(
      "profile-update-interval",
      "1"
    );

    res.setHeader(
      "subscription-userinfo",
      "upload=0; download=0; total=0"
    );

    res.setHeader(
      "announce",
      encodeHappBase64(announce)
    );

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );

    res.setHeader(
      "Pragma",
      "no-cache"
    );

    return res.status(200).send(output);

  } catch (error) {
    console.error(
      "Legacy subscription fatal error:",
      error
    );

    return res.status(500).json({
      error: "Legacy subscription fatal error",
      message:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
}
