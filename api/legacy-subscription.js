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
  "Poland1",
  "Russia1"
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const results = [];

    for (const name of LEGACY_SERVERS) {
      const url = `${REPO_RAW_BASE}/servers/${encodeURIComponent(name)}.json`;

      try {
        const response = await fetch(url, {
          cache: "no-store",
          headers: {
            "Accept": "application/json",
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
            `${name}.json: GitHub returned empty response`
          );
        }

        let json;

        try {
          json = JSON.parse(text);
        } catch (parseError) {
          throw new Error(
            `${name}.json: invalid JSON — ${parseError.message}`
          );
        }

        results.push(json);

      } catch (error) {
        console.error(
          `[Legacy] Failed to load ${name}.json:`,
          error
        );

        return res.status(500).json({
          error: "Legacy subscription error",
          server: name,
          message: error.message,
          url: `${REPO_RAW_BASE}/servers/${name}.json`
        });
      }
    }

    /*
     * Happ subscription metadata
     * Supported according to Happ documentation.
     */
    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    res.setHeader(
      "profile-title",
      "OokVPN Legacy"
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
      "⚠️ OokVPN Legacy — старая версия подписки. Gemini не работает."
    );

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );

    res.setHeader(
      "Pragma",
      "no-cache"
    );

    return res.status(200).json(results);

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
