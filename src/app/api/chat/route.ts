import { NextRequest, NextResponse } from 'next/server';

const responseCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { message, enableCaching = true, language = 'en' } = await request.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }
    
    const cacheKey = `${language}-${message.toLowerCase().trim()}`;
    if (enableCaching) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json({ content: cached.content });
      }
    }
    
    const systemPrompt = language === 'hi' 
      ? "You are a helpful AI assistant. Respond in Hindi when user speaks Hindi, English when they speak English. Keep responses very brief (1-2 sentences max)."
      : "You are a helpful AI assistant. Keep responses very brief and conversational (1-2 sentences max).";
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `${systemPrompt}\n\nUser: "${message}"`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.7,
          topK: 10,
          topP: 0.8
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    // ✅ Fixed: Replaced 'any' with proper type assertion
    const content = (data.candidates?.[0]?.content?.parts?.[0]?.text as string) || "I couldn't generate a response.";
    
    if (enableCaching) {
      responseCache.set(cacheKey, { 
        content: content.trim(), 
        timestamp: Date.now() 
      });
    }
    
    return NextResponse.json({ content: content.trim() });
    
  } catch (error: unknown) { // ✅ Fixed: 'any' → 'unknown'
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get AI response';
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 });
  }
}
