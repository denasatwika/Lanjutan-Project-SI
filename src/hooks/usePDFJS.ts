"use client";

import { useEffect, useState } from "react";
// Kita import tipe saja agar tidak memberatkan bundle
import type { PDFDocumentProxy } from "pdfjs-dist";

export const usePDFJS = (
  onLoad: (pdfjs: any) => Promise<void> | void,
  deps: (string | number | boolean | undefined | null)[] = []
) => {
  const [pdfjs, setPdfjs] = useState<any>(null);

  // 1. Load library sekali saat mount
  // webpack.mjs secara otomatis mengatur Worker agar tidak perlu CDN
  useEffect(() => {
    import("pdfjs-dist/webpack.mjs").then((module) => {
      setPdfjs(module);
    });
  }, []);

  // 2. Jalankan callback saat PDFJS siap
  useEffect(() => {
    if (!pdfjs) return;
    (async () => await onLoad(pdfjs))();
  }, [pdfjs, ...deps]);
};
