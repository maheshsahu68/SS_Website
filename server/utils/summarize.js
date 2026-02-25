const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function summarizeText(text) {
  if (!text || !text.trim()) return "";

  const prompt = `You are a concise summarizer. Produce a short (3-5 sentence) summary and then 3 bullet points describing the main topics. Output only plain text.`;

  const userContent = `${prompt}\n\nTranscript:\n${text.slice(0, 20000)}`; // limit size

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You summarize transcripts concisely." },
      { role: "user", content: userContent },
    ],
    max_tokens: 400,
  });

  const content = resp?.choices?.[0]?.message?.content ?? resp?.choices?.[0]?.text ?? "";
  return content.trim();
}

module.exports = summarizeText;