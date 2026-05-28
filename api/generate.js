const { generateImage } = require("../lib/generate");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const result = await generateImage(req.body || {});
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || "서버 오류가 발생했습니다." });
  }
};
