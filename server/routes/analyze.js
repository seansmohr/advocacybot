import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '../systemPrompt.js';

const router = Router();
const anthropic = new Anthropic();

router.post('/analyze', async (req, res) => {
  try {
    const { coverageType, medicareType, medigapPlan, carrier, amount, description } = req.body;

    let userMessage = `NEW CASE INTAKE:\n`;
    userMessage += `Coverage Type: ${coverageType}\n`;
    if (medicareType) userMessage += `Medicare Plan Type: ${medicareType}\n`;
    if (medigapPlan) userMessage += `Medigap Plan Letter: ${medigapPlan}\n`;
    if (carrier) userMessage += `Insurance Carrier: ${carrier}\n`;
    userMessage += `Amount in Dispute: $${amount}\n`;
    userMessage += `State: California\n\n`;
    userMessage += `Client Description:\n${description}\n\n`;
    userMessage += `This is the initial intake. Respond with Phase 1: acknowledge the situation, provide preliminary assessment, and request the specific documents you need to analyze this case. Format each document request using the docrequest code block format specified in your instructions.`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ error: 'An error occurred while processing your request.' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });

    stream.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });
  } catch (error) {
    console.error('Analyze error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process intake.' });
    }
  }
});

export default router;
