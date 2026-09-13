const REPO_RAW_BASE =
  "https://raw.githubusercontent.com/lukirby-vpn/LukirbyVPN/main";

const BACKEND_URL =
  "https://lukirby-backend.onrender.com";

function toBase64UTF8(text) {
  const bytes =
    new TextEncoder().encode(text);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function fetchJSON(url) {
  const response =
    await fetch(url, {
      headers: {
        "User-Agent":
          "Lukirby-VPN-Subscription"
      },
      cache: "no-store"
    });

  if (!response.ok) {
    throw new Error(
      `Fetch error ${response.status}: ${url}`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error(
      `Invalid JSON: ${url}`
    );
  }
}

async function getHWIDStatus(
  token,
  hwid
) {
  const url =
    `${BACKEND_URL}/api/subscriptions/` +
    `${encodeURIComponent(token)}` +
    `/hwid-status/` +
    `${encodeURIComponent(hwid)}`;

  const response =
    await fetch(url, {
      headers: {
        "User-Agent":
          "Lukirby-VPN-Subscription"
      },
      cache: "no-store"
    });

  if (!response.ok) {
    throw new Error(
      `Backend error ${response.status}`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error(
      "Invalid backend JSON"
    );
  }
}

async function registerHWID(
  token,
  hwid,
  name
) {
  const response =
    await fetch(
      `${BACKEND_URL}/api/hwid`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "User-Agent":
            "Lukirby-VPN-Subscription"
        },
        body: JSON.stringify({
          token:
            token,
          hwid:
            hwid,
          name:
            name ||
            "Unknown device"
        }),
        cache: "no-store"
      }
    );

  if (!response.ok) {
    throw new Error(
      `Backend error ${response.status}`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error(
      "Invalid backend JSON"
    );
  }
}

async function getServerFile(
  filename
) {
  return await fetchJSON(
    `${REPO_RAW_BASE}/servers/${filename}`
  );
}

function responseHeaders(
  announce
) {
  const headers = {
    "Content-Type":
      "application/json",

    "profile-title":
      "Ook VPN",

    "profile-update-interval":
      "1",

    "support-url":
      "https://t.me/LukirbyVPN",

    "subscription-always-hwid-enable":
      "1",

    "subscription-userinfo":
      "upload=0; download=0; total=0; expire=3383251200",

    "Cache-Control":
      "no-store"
  };

  if (announce) {
    headers["announce"] =
      "base64:" +
      toBase64UTF8(announce);
  }

  return headers;
}

export default {
  async fetch(request) {
    if (
      request.method !==
      "GET"
    ) {
      return new Response(
        "Method Not Allowed",
        {
          status: 405
        }
      );
    }

    try {
      const url =
        new URL(
          request.url
        );

      const token =
        url.searchParams.get(
          "token"
        );

      if (!token) {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "Missing token"
          }),
          {
            status: 400,
            headers: {
              "Content-Type":
                "application/json",
              "Cache-Control":
                "no-store"
            }
          }
        );
      }

      const hwid =
        request.headers.get(
          "x-hwid"
        );

      if (!hwid) {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "Missing HWID"
          }),
          {
            status: 400,
            headers: {
              "Content-Type":
                "application/json",
              "Cache-Control":
                "no-store"
            }
          }
        );
      }

      const deviceModel =
        request.headers.get(
          "x-device-model"
        ) ||
        "Unknown device";

      const device =
        await registerHWID(
          token,
          hwid,
          deviceModel
        );

      if (!device.ok) {
        throw new Error(
          "HWID registration failed"
        );
      }

      if (
        device.status ===
        "removed"
      ) {
        const server =
          await getServerFile(
            "serverDeleted.json"
          );

        return new Response(
          JSON.stringify([
            server
          ]),
          {
            status: 200,
            headers:
              responseHeaders()
          }
        );
      }

      if (
        device.active_devices >
        device.device_limit
      ) {
        const server =
          await getServerFile(
            "serverLimitReached.json"
          );

        return new Response(
          JSON.stringify([
            server
          ]),
          {
            status: 200,
            headers:
              responseHeaders()
          }
        );
      }

      const order =
        await fetchJSON(
          `${REPO_RAW_BASE}/order.json`
        );

      if (
        !Array.isArray(
          order
        )
      ) {
        throw new Error(
          "order.json must contain an array"
        );
      }

      const servers =
        await Promise.all(
          order.map(
            async (
              name
            ) => {
              if (
                typeof name !==
                  "string" ||
                !/^[a-zA-Z0-9._-]+$/.test(
                  name
                )
              ) {
                throw new Error(
                  `Invalid server name: ${name}`
                );
              }

              return await fetchJSON(
                `${REPO_RAW_BASE}/servers/${name}.json`
              );
            }
          )
        );

      const announce =
        "Не работают сервера? Нажмите 🔄 и проверьте еще раз\n\n" +
        "v1.2";

      return new Response(
        JSON.stringify(
          servers
        ),
        {
          status: 200,
          headers:
            responseHeaders(
              announce
            )
        }
      );
    } catch (
      error
    ) {
      return new Response(
        "Subscription error: " +
          error.message,
        {
          status: 500,
          headers: {
            "Content-Type":
              "text/plain",
            "Cache-Control":
              "no-store"
          }
        }
      );
    }
  }
};
