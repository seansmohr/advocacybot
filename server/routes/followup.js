import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '../systemPrompt.js';

const router = Router();
const anthropic = new Anthropic();

router.post('/followup', async (req, res) => {
  try {
    const { messages, newMessage, images, generateAnalysis } = req.body;

    // Build new user message content
    const content = [];

    if (images && images.length > 0) {
      for (const img of images) {
        if (img.mediaType === 'application/pdf') {
          content.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: img.base64 }
          });
        } else {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: img.mediaType, data: img.base64 }
          });
        }
      }
    }

    let text = newMessage || '';
    if (generateAnalysis) {
      text += '\n\nThe client has provided all available documents. Please generate the FULL CASE ANALYSIS with all 8 sections (Phase 2).';
    }
    if (text) {
      content.push({ type: 'text', text });
    }

    const fullMessages = [
      ...messages,
      {
        role: 'user',
        content: content.length === 1 && content[0].type === 'text' ? content[0].text : content
      }
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: fullMessages
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
    console.error('Followup error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process followup.' });
    }
  }
});

export default router;
