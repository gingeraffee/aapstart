"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeBlockProps {
  url: string;
  label?: string;
}

export function QRCodeBlock({ url, label }: QRCodeBlockProps) {
  return (
    <div className="my-4 inline-flex flex-col items-center gap-2 rounded-[12px] border border-[#d0dff0] bg-white p-4 shadow-[0_2px_8px_rgba(12,24,47,0.06)]">
      <QRCodeSVG value={url} size={120} level="M" />
      {label && (
        <p className="max-w-[140px] text-center text-[0.68rem] leading-[1.4] text-[#4d6788]">{label}</p>
      )}
    </div>
  );
}
