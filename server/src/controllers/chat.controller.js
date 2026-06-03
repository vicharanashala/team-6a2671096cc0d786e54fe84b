import FAQ from '../models/FAQ.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const askChatbot = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Retrieve all published FAQs
    const faqs = await FAQ.find({ status: 'published' }).select('question answer category');

    // Format FAQs as context
    const faqContext = faqs.map((faq, index) => {
      return `${index + 1}. Q: ${faq.question}\n   A: ${faq.answer}\n   Category: ${faq.category}`;
    }).join('\n\n');

    const systemInstruction = `You are a helpful and friendly AI chatbot for a Crowdsourced FAQ system.
Your goal is to answer the user's questions using ONLY the provided list of approved FAQs.

APPROVED FAQS:
${faqContext}

INSTRUCTIONS:
1. Use ONLY the provided FAQs above to answer the user's question. Do NOT make up answers, assume details, or use external knowledge.
2. If the user's query can be answered using the FAQs, answer it clearly and concisely. Mention the FAQ category if it is helpful.
3. If the user asks something that is NOT covered by the FAQs (or is completely unrelated), politely explain that you do not have that information in the current FAQs. Suggest that they visit the [Discussion Forum](/discussions) (where they can ask the community) or submit their question directly to the administrators using the [Submit Question](/submit-question) page.
4. Be polite, friendly, and professional. Keep answers relatively short and easy to read.`;

    // Initialize the model with system instruction (using gemini-2.5-flash which is supported by the API key)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction,
    });

    // Format history for Gemini API
    // Gemini expects history in format: { role: 'user' | 'model', parts: [{ text: string }] }
    const geminiHistory = (history || [])
      .filter(msg => msg.sender === 'user' || msg.sender === 'bot')
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    // Start a chat session
    const chat = model.startChat({
      history: geminiHistory,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const replyText = response.text();

    res.json({ reply: replyText });
  } catch (error) {
    console.error('Chatbot API Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while processing your request.' });
  }
};
