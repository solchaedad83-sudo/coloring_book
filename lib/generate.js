const themePrompts = {
  cozyInterior:
    "a cozy adult coloring book interior scene with a reading nook, plants, patterned rug, tea set, shelves, cushions, framed art, and a few decorative objects",
  botanicalPortrait:
    "an elegant adult coloring book portrait surrounded by botanical leaves, flowers, vines, hair ornaments, fabric folds, and delicate jewelry",
  vintageMarket:
    "a vintage European market stall scene with fruit baskets, flowers, jars, awnings, handwritten signs, cobblestones, and layered shop details",
  cityCafe:
    "a charming city cafe street scene with terrace tables, windows, bicycles, signs, plants, paving stones, and architectural details",
  fantasyLibrary:
    "a fantasy library scene with bookshelves, candles, magical bottles, ornate furniture, maps, keys, plants, and hidden objects",
  ornamentalAnimal:
    "a majestic animal portrait filled with ornamental patterns, botanical borders, feathers, gems, paisley details, and symmetrical decorative linework",
};

function buildPrompt({ theme, difficulty, style, wideMargin, includeTitle }) {
  const subject =
    theme === "random"
      ? Object.values(themePrompts)[Math.floor(Math.random() * Object.values(themePrompts).length)]
      : themePrompts[theme] || themePrompts.cozyInterior;

  const density = {
    easy: "simple relaxing adult coloring page, large open closed areas, only 8 to 12 main objects, minimal background detail, no dense texture, no tiny repeated filler",
    medium: "moderate adult coloring detail, clear closed areas, about 20 to 35 objects and ornaments, some background detail but not crowded",
    hard: "intricate adult coloring book detail, many closed areas and layered background objects, but keep the composition readable and avoid chaotic clutter",
  }[difficulty || "medium"];

  const composition = {
    center: "clear central composition with one strong focal subject and generous breathing room",
    scene:
      difficulty === "easy"
        ? "simple scene with a focal subject and a few supporting objects"
        : "full-page scene with foreground, middle ground, and background details",
    pattern:
      difficulty === "easy"
        ? "simple ornamental pattern with large repeated shapes"
        : "ornamental repeating composition with a premium coloring book feel",
  }[style || "scene"];

  return [
    difficulty === "easy"
      ? "Create a clean, relaxing printable adult coloring book page."
      : "Create a premium printable adult coloring book page.",
    subject,
    composition,
    density,
    wideMargin ? "Keep a clean printable margin around the artwork." : "Use the page generously while keeping print-safe edges.",
    includeTitle ? "No large title text inside the artwork; avoid readable words except tiny decorative signage." : "No text, letters, logos, signatures, or watermarks.",
    "Style: clean black and white line art only, white background, no color, no grayscale, no shading, no filled black areas, no heavy scribbles.",
    difficulty === "easy"
      ? "Quality target: polished commercial coloring book linework, coherent objects, simple elegant closed shapes, easy to color on iPad without overwhelming detail."
      : "Quality target: polished commercial coloring book linework like a detailed printable page, coherent objects, elegant closed shapes, consistent thin outlines, suitable for A4 printing and iPad coloring.",
  ].join(" ");
}

async function generateImage(body) {
  const apiKey = body.apiKey;
  if (!apiKey) {
    const error = new Error("설정창에 OpenAI API Key를 입력해야 AI 도안을 만들 수 있습니다.");
    error.status = 503;
    throw error;
  }

  const prompt = buildPrompt(body);
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: body.imageModel || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
      prompt,
      size: "1024x1536",
      quality: body.difficulty === "hard" ? "high" : "medium",
      output_format: "png",
      n: 1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || "이미지 생성에 실패했습니다.");
    error.status = response.status;
    throw error;
  }

  const imageBase64 = data.data?.[0]?.b64_json;
  if (!imageBase64) {
    const error = new Error("이미지 데이터가 응답에 포함되지 않았습니다.");
    error.status = 502;
    throw error;
  }

  return {
    imageBase64,
    mimeType: "image/png",
    prompt,
  };
}

module.exports = {
  buildPrompt,
  generateImage,
};
