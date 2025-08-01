import { NextRequest, NextResponse } from 'next/server';

const responseCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);
  
  if (!userLimit || now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    const { message, enableCaching = true } = await request.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }
    
    const cacheKey = message.toLowerCase().trim();
    if (enableCaching) {
      const cached = responseCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json({ content: cached.content });
      }
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a concise voice assistant. Give brief, direct responses. User: "${message}"`
            }]
          }],
          generationConfig: {
            maxOutputTokens: 60,
            temperature: 0.4,
            topK: 25,
            topP: 0.85,
            candidateCount: 1
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
      
      const trimmedContent = content.trim();
      
      if (enableCaching) {
        responseCache.set(cacheKey, { 
          content: trimmedContent, 
          timestamp: Date.now() 
        });
      }
      
      return NextResponse.json({ content: trimmedContent });
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - Gemini API took too long to respond');
      }
      throw fetchError;
    }

  } catch (error: any) {
    const errorResponse = {
      error: error.message || 'Failed to get AI response',
      timestamp: new Date().toISOString(),
      retryable: !error.message?.includes('API key') && !error.message?.includes('quota')
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
