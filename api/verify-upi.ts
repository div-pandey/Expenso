import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string | string[]>;
  method?: string;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: any) => VercelResponse;
  send: (body: any) => VercelResponse;
}

export interface VerifyUpiResponse {
  isValid: boolean;
  amount: number | null;
  utrNumber: string | null;
  payeeVpa: string | null;
  timestamp: string | null;
  confidence: number;
  reason: string;
}

// In-memory replay cache to block duplicate UTR reuse across settlements
// In serverless, memory persists across warm invocations of the same container instance
const settledUtrs = new Set<string>();

/**
 * Vercel Serverless Function: POST /api/verify-upi
 *
 * Secure proxy that executes Gemini Multimodal Vision server-side.
 * The GEMINI_API_KEY is read exclusively from process.env and never exposed to the client.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // 1. CORS and Method Handling
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      isValid: false,
      amount: null,
      utrNumber: null,
      payeeVpa: null,
      timestamp: null,
      confidence: 0,
      reason: 'Method not allowed. Use POST.',
    });
    return;
  }

  // 2. Server-side API key check
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    res.status(500).json({
      isValid: false,
      amount: null,
      utrNumber: null,
      payeeVpa: null,
      timestamp: null,
      confidence: 0,
      reason: 'Server configuration error: GEMINI_API_KEY is not configured on the backend.',
    });
    return;
  }

  // 3. Parse and validate request body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({
        isValid: false,
        amount: null,
        utrNumber: null,
        payeeVpa: null,
        timestamp: null,
        confidence: 0,
        reason: 'Invalid JSON request payload.',
      });
      return;
    }
  }

  const {
    imageDataUrl,
    imageData,
    expectedAmountPaise,
    recipientName = '',
    recipientUpi = '',
    expectedUtr = '',
  } = body || {};

  const rawImage = imageDataUrl || imageData;
  if (!rawImage || typeof rawImage !== 'string') {
    res.status(400).json({
      isValid: false,
      amount: null,
      utrNumber: null,
      payeeVpa: null,
      timestamp: null,
      confidence: 0,
      reason: 'Missing screenshot image payload.',
    });
    return;
  }

  const amountPaise = Number(expectedAmountPaise);
  if (!amountPaise || amountPaise <= 0 || isNaN(amountPaise)) {
    res.status(400).json({
      isValid: false,
      amount: null,
      utrNumber: null,
      payeeVpa: null,
      timestamp: null,
      confidence: 0,
      reason: 'Invalid expected settlement amount in paise.',
    });
    return;
  }

  const expectedRupees = Math.round(amountPaise) / 100;

  // Extract base64 and mime type
  const mimeType = rawImage.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
  const base64Data = rawImage.includes(',') ? rawImage.split(',')[1] : rawImage;

  // 4. Construct strict AI prompt
  const prompt = `You are an automated fraud detection AI specialized in verifying Indian UPI payment confirmation screenshots (Google Pay, PhonePe, Paytm, BHIM, Navi, Cred, etc.).

Analyze this payment screenshot image carefully against the required repayment details:
- Required payment amount: ₹${expectedRupees}
- Expected payee name: "${recipientName}"
- Expected payee UPI ID: "${recipientUpi}"
${expectedUtr ? `- Expected 12-digit UPI UTR / Reference ID: "${expectedUtr}"` : ''}

Strict Verification Rules:
1. SCREENSHOT AUTHENTICITY:
   - Is this a genuine, completed payment confirmation receipt from a UPI or banking application?
   - Reject if it is a photo of an ID badge, selfie, meme, document, or non-payment screen.
2. PAYMENT STATUS:
   - Must be successful/completed (e.g. "Paid successfully", "Payment of ₹... successful").
   - Reject if "Failed", "Processing", or "Pending".
3. AMOUNT VERIFICATION:
   - Extract the numeric amount transferred in INR (e.g. 150.00).
   - Check if it matches ₹${expectedRupees}.
4. 12-DIGIT UPI REFERENCE / UTR:
   - Extract the 12-digit UPI UTR / Transaction Reference ID (strictly 12 digits, e.g. 431289012345).
5. RECIPIENT MATCH:
   - Extract the payee UPI ID or payee name if present.

Return ONLY a valid JSON object following this EXACT schema, with no markdown code fences or backticks:
{
  "isValid": boolean,
  "amount": number or null,
  "utrNumber": string or null,
  "payeeVpa": string or null,
  "timestamp": string or null,
  "confidence": number,
  "reason": string
}`;

  const models = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash',
  ];

  let rawText = '';
  let modelError: string | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
      }

      const json = await response.json();
      rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (rawText) break;
    } catch (err) {
      modelError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!rawText) {
    res.status(502).json({
      isValid: false,
      amount: null,
      utrNumber: null,
      payeeVpa: null,
      timestamp: null,
      confidence: 0,
      reason: `Multimodal AI verification unavailable: ${modelError || 'Failed to analyze screenshot.'}`,
    });
    return;
  }

  // 5. Strip any markdown fences before parsing
  const cleanedJson = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: {
    isValid?: boolean;
    amount?: number | null;
    utrNumber?: string | null;
    payeeVpa?: string | null;
    timestamp?: string | null;
    confidence?: number;
    reason?: string;
  };

  try {
    parsed = JSON.parse(cleanedJson);
  } catch {
    res.status(500).json({
      isValid: false,
      amount: null,
      utrNumber: null,
      payeeVpa: null,
      timestamp: null,
      confidence: 0,
      reason: 'Failed to parse structured response from AI verification engine.',
    });
    return;
  }

  // 6. Strict Server-Side Validation
  let isValid = Boolean(parsed.isValid);
  let reason = parsed.reason || (isValid ? 'Payment verified successfully.' : 'Verification failed.');
  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : (isValid ? 0.95 : 0.2);
  const amount = typeof parsed.amount === 'number' ? parsed.amount : null;

  // Validate amount match against expected paise
  if (amount !== null) {
    const isAmountMatch = Math.abs(amount - expectedRupees) < 0.01;
    if (!isAmountMatch) {
      isValid = false;
      reason = `Amount in screenshot (₹${amount}) does not match required repayment amount of ₹${expectedRupees}.`;
    }
  } else if (isValid) {
    isValid = false;
    reason = `Payment amount could not be read clearly from screenshot. Expected ₹${expectedRupees}.`;
  }

  // Validate UTR number
  let cleanUtr: string | null = null;
  if (parsed.utrNumber && typeof parsed.utrNumber === 'string') {
    const digitsOnly = parsed.utrNumber.replace(/\D/g, '');
    if (digitsOnly.length === 12) {
      cleanUtr = digitsOnly;
    }
  }

  // If user provided an expected UTR, check matching
  if (expectedUtr && cleanUtr) {
    const expectedDigits = expectedUtr.replace(/\D/g, '');
    if (expectedDigits && cleanUtr !== expectedDigits) {
      isValid = false;
      reason = `Entered UTR reference (${expectedDigits}) does not match the reference found on the screenshot (${cleanUtr}).`;
    }
  }

  // 7. Duplicate UTR Replay Protection
  if (cleanUtr) {
    if (settledUtrs.has(cleanUtr)) {
      isValid = false;
      reason = `Duplicate payment detected: UPI UTR ${cleanUtr} has already been recorded in a previous settlement. Duplicate submissions are strictly rejected.`;
    } else if (isValid) {
      // Record this UTR to prevent future replays
      settledUtrs.add(cleanUtr);
    }
  }

  const result: VerifyUpiResponse = {
    isValid,
    amount,
    utrNumber: cleanUtr,
    payeeVpa: parsed.payeeVpa || null,
    timestamp: parsed.timestamp || new Date().toISOString(),
    confidence,
    reason,
  };

  res.status(200).json(result);
}
