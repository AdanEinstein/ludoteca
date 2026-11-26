// Minimal types for the only part of `qrcode` we use (a declared module instead of another @types package, ADR 0004).
declare module 'qrcode' {
  const QRCode: {
    toString(text: string, options?: { type?: 'svg' | 'terminal'; margin?: number; small?: boolean }): Promise<string>;
  };
  export default QRCode;
}
