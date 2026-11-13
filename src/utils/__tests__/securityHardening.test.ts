import { describe, it, expect } from 'vitest';
import { isValidUpiId, buildSafeUpiUri } from '../upi';
import { compressScreenshotForVerification } from '../image';

describe('Security Hardening & Input Sanitization', () => {
  describe('UPI VPA Strict Validation', () => {
    it('accepts genuine Indian UPI VPAs', () => {
      expect(isValidUpiId('divyansh@okaxis')).toBe(true);
      expect(isValidUpiId('rahul.verma@okhdfcbank')).toBe(true);
      expect(isValidUpiId('9876543210@paytm')).toBe(true);
      expect(isValidUpiId('student.crew@ybl')).toBe(true);
      expect(isValidUpiId('campus-commute@upi')).toBe(true);
    });

    it('rejects tampered or malicious UPI IDs', () => {
      expect(isValidUpiId('')).toBe(false);
      expect(isValidUpiId('a@b')).toBe(false); // too short
      expect(isValidUpiId('attacker@123')).toBe(false); // numeric handle
      expect(isValidUpiId('user@domain.com@evil')).toBe(false); // multiple @
      expect(isValidUpiId('user;drop table@sbi')).toBe(false); // special char injection
      expect(isValidUpiId('user<script>@oksbi')).toBe(false); // XSS injection
    });

    it('clamps settlement amounts to positive 2-decimal numbers in UPI deep links', () => {
      const uri = buildSafeUpiUri({
        pa: 'divyansh@okaxis',
        amPaise: 15000, // ₹150.00
      });
      expect(uri).toContain('am=150.00');

      // Zero or negative should not be set
      const zeroUri = buildSafeUpiUri({
        pa: 'divyansh@okaxis',
        amPaise: 0,
      });
      expect(zeroUri).not.toContain('am=');
    });
  });

  describe('CSV Injection Mitigation Unit Spec', () => {
    const sanitizeCsvCell = (value: unknown): string => {
      if (value === null || value === undefined) return '""';
      let str = String(value);
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    it('neutralizes spreadsheet formula injection prefixes (=, +, -, @, \\t, \\r)', () => {
      expect(sanitizeCsvCell('=1+2; cmd|/C calc')).toBe(`"'=1+2; cmd|/C calc"`);
      expect(sanitizeCsvCell('+cmd|/C calc')).toBe(`"'+cmd|/C calc"`);
      expect(sanitizeCsvCell('-cmd|/C calc')).toBe(`"'-cmd|/C calc"`);
      expect(sanitizeCsvCell('@SUM(1+1)')).toBe(`"'@SUM(1+1)"`);
      expect(sanitizeCsvCell('\tDDE("cmd")')).toBe(`"'\tDDE(""cmd"")"`);
    });

    it('escapes standard text and quotes per RFC-4180', () => {
      expect(sanitizeCsvCell('Metro Ride to Campus')).toBe(`"Metro Ride to Campus"`);
      expect(sanitizeCsvCell('Shared "Auto" fare')).toBe(`"Shared ""Auto"" fare"`);
    });
  });

  describe('Screenshot Compression Utility', () => {
    it('safely handles non-browser environment or data strings', async () => {
      const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = await compressScreenshotForVerification(testDataUrl, 1280, 0.8);
      expect(typeof result).toBe('string');
      expect(result).toBe(testDataUrl);
    });
  });
});
