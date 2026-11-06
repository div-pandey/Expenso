import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  verifyPaymentProofWithGemini,
} from '../geminiPaymentVerifier';

describe('Gemini AI Payment Proof Verification Engine', () => {
  let mockStorage: Record<string, string> = {};
  const originalEnvKey = import.meta.env?.VITE_GEMINI_API_KEY;

  beforeEach(() => {
    mockStorage = {};
    if (import.meta.env) {
      import.meta.env.VITE_GEMINI_API_KEY = '';
    }
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
    };
    vi.stubGlobal('localStorage', localStorageMock);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (import.meta.env && originalEnvKey !== undefined) {
      import.meta.env.VITE_GEMINI_API_KEY = originalEnvKey;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('API Key Management', () => {
    it('saves and retrieves Gemini API key from localStorage', () => {
      expect(getGeminiApiKey()).toBe('');
      setGeminiApiKey('test-gemini-key-12345');
      expect(getGeminiApiKey()).toBe('test-gemini-key-12345');
      setGeminiApiKey('');
      expect(getGeminiApiKey()).toBe('');
    });
  });

  describe('Gemini Vision AI Analysis', () => {
    it('verifies genuine completed receipt with matching amount and extracts UTR', async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    isValid: true,
                    confidence: 0.98,
                    detectedApp: 'Google Pay',
                    paymentStatus: 'successful',
                    detectedAmount: 2000,
                    amountMatches: true,
                    detectedUtr: '431289012345',
                    detectedRecipient: 'yo yo',
                    rejectionReason: null,
                    summary: 'Verified ₹2000 payment to yo yo via Google Pay (UTR: 431289012345)',
                  }),
                },
              ],
            },
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockGeminiResponse,
        })
      );

      const result = await verifyPaymentProofWithGemini({
        apiKey: 'test-api-key',
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        expectedAmountPaise: 200000, // ₹2,000
        recipientName: 'yo yo',
        recipientUpi: 'yoyo@okaxis',
      });

      expect(result.isValid).toBe(true);
      expect(result.detectedAmount).toBe(2000);
      expect(result.detectedUtr).toBe('431289012345');
      expect(result.detectedApp).toBe('Google Pay');
      expect(result.engineUsed).toBe('gemini-ai');
      expect(result.paymentStatus).toBe('successful');
    });

    it('rejects fake or non-receipt screenshot when Gemini classifies it as not_a_receipt', async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    isValid: false,
                    confidence: 0.05,
                    detectedApp: 'Unknown',
                    paymentStatus: 'not_a_receipt',
                    detectedAmount: null,
                    amountMatches: false,
                    detectedUtr: null,
                    rejectionReason: 'The image appears to be an anime meme and not a payment receipt.',
                    summary: 'Non-receipt image rejected',
                  }),
                },
              ],
            },
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockGeminiResponse,
        })
      );

      const result = await verifyPaymentProofWithGemini({
        apiKey: 'test-api-key',
        imageDataUrl: 'data:image/png;base64,sample_meme_image',
        expectedAmountPaise: 200000,
        recipientName: 'yo yo',
      });

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toContain('anime meme');
      expect(result.engineUsed).toBe('gemini-ai');
    });

    it('rejects transaction when amount in screenshot does not match required repayment', async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    isValid: false,
                    confidence: 0.9,
                    detectedApp: 'PhonePe',
                    paymentStatus: 'successful',
                    detectedAmount: 500, // User paid ₹500 instead of ₹2,000
                    amountMatches: false,
                    detectedUtr: '123456789012',
                    rejectionReason: 'The amount in the screenshot (₹500) does not match the required repayment of ₹2000.',
                    summary: 'Amount mismatch',
                  }),
                },
              ],
            },
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockGeminiResponse,
        })
      );

      const result = await verifyPaymentProofWithGemini({
        apiKey: 'test-api-key',
        imageDataUrl: 'data:image/png;base64,sample_receipt',
        expectedAmountPaise: 200000, // ₹2,000 required
        recipientName: 'yo yo',
      });

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toContain('₹500');
      expect(result.rejectionReason).toContain('₹2000');
    });

    it('rejects transaction when payment status is failed or pending', async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    isValid: false,
                    confidence: 0.95,
                    detectedApp: 'Paytm',
                    paymentStatus: 'failed',
                    detectedAmount: 2000,
                    amountMatches: true,
                    rejectionReason: 'The screenshot shows a Failed or Declined transaction.',
                    summary: 'Payment failed',
                  }),
                },
              ],
            },
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockGeminiResponse,
        })
      );

      const result = await verifyPaymentProofWithGemini({
        apiKey: 'test-api-key',
        imageDataUrl: 'data:image/png;base64,failed_payment',
        expectedAmountPaise: 200000,
        recipientName: 'yo yo',
      });

      expect(result.isValid).toBe(false);
      expect(result.paymentStatus).toBe('failed');
      expect(result.rejectionReason).toContain('Failed or Declined');
    });

    it('falls back to smart vision heuristic when Gemini API fails or throws network error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error connecting to Gemini API'))
      );

      const result = await verifyPaymentProofWithGemini({
        apiKey: 'test-api-key',
        imageDataUrl: 'data:image/png;base64,sample_receipt',
        expectedAmountPaise: 200000,
        recipientName: 'yo yo',
      });

      expect(result.engineUsed).toBe('smart-vision-heuristic');
    });

    it('falls back to smart vision heuristic when no API key is provided', async () => {
      const result = await verifyPaymentProofWithGemini({
        imageDataUrl: 'data:image/png;base64,sample_receipt',
        expectedAmountPaise: 200000,
        recipientName: 'yo yo',
      });

      expect(result.engineUsed).toBe('smart-vision-heuristic');
    });
  });
});
