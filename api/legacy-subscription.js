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
return res.status(405).send("Method Not Allowed");
}

try {
const results = await Promise.all(
LEGACY_SERVERS.map(async (name) => {
const response = await fetch(
${REPO_RAW_BASE}/servers/${name}.json,
{
cache: "no-store"
}
);

if (!response.ok) {  
      throw new Error(  
        `${name}.json: GitHub returned ${response.status}`  
      );  
    }  

    return await response.json();  
  })  
);  

res.setHeader("Content-Type", "application/json; charset=utf-8");  
res.setHeader("profile-title", "OokVPN Legacy 🫡");  
res.setHeader("profile-update-interval", "1");  
res.setHeader(  
  "subscription-userinfo",  
  "upload=0; download=0; total=0"  
);  
res.setHeader("Cache-Control", "no-store"); 
  res.setHeader("announce", "⚠️ OokVPN Legacy — старая версия подписки. Gemini не работает.");

return res.status(200).json(results);

} catch (error) {
console.error("Legacy subscription error:", error);

return res.status(500).json({  
  error: "Legacy subscription error",  
  message: error.message  
});

}

