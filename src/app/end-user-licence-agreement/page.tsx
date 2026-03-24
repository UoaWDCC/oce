"use client";
import React, { useState, useRef, useEffect } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Path to EULA PDF
const EULA_PDF_URL = "/docs/eula.pdf";

// Cache pdf.js on window to avoid reloading on navigation
interface PdfJsLib {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (url: string) => {
    promise: Promise<PdfDocumentProxy>;
  };
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
    __pdfjs_dist__?: PdfJsLib;
  }
}

async function loadPdfJs(): Promise<PdfJsLib> {
  if (window.__pdfjs_dist__) {
    return window.__pdfjs_dist__;
  }

  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

  await new Promise<void>((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load pdf.js"));
    document.head.appendChild(script);
  });

  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("pdf.js failed to initialize");
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  window.__pdfjs_dist__ = pdfjsLib;
  return pdfjsLib;
}

// Type for a single PDF page object from pdf.js
interface PdfPageProxy {
  getViewport: (options: { scale: number }) => {
    width: number;
    height: number;
  };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: ReturnType<PdfPageProxy["getViewport"]>;
  }) => { cancel: () => void };
}

// Props for PdfPage component
interface PdfPageProps {
  page: PdfPageProxy;
  index: number;
  totalPages: number;
}

function PdfPage({ page, index, totalPages }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const context = canvas.getContext("2d");
    if (!context) return;

    const renderTask = page.render({
      canvasContext: context,
      viewport,
    });

    return () => {
      renderTask.cancel();
    };
  }, [page]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        className="bg-white shadow-md rounded"
        style={{ maxWidth: "100%" }}
      />
      <span className="mt-2 text-xs text-gray-400">
        {index + 1} / {totalPages}
      </span>
    </div>
  );
}

// Type for the full PDF document proxy
interface PdfDocumentProxy {
  numPages: number;
  getPage: (pageNum: number) => Promise<PdfPageProxy>;
}

export default function EulaPage() {
  const [pages, setPages] = useState<PdfPageProxy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        if (cancelled) return;

        const pdf: PdfDocumentProxy =
          await pdfjsLib.getDocument(EULA_PDF_URL).promise;
        if (cancelled) return;

        const loadedPages: PdfPageProxy[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          loadedPages.push(await pdf.getPage(i));
        }

        if (!cancelled) {
          setPages(loadedPages);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to load PDF";
          setError(message);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            Failed to load EULA
          </h2>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#5e00b2] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#c028d3] transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/login"
            className="flex items-center text-[#5e00b2] hover:text-[#c028d3] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Login
          </Link>

          <h1 className="text-base font-bold text-gray-800">
            End User License Agreement
          </h1>

          {pages.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {pages.length} {pages.length === 1 ? "page" : "pages"}
            </span>
          )}
        </div>
      </header>

      {/* PDF pages */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin w-8 h-8 border-2 border-[#5e00b2] border-t-transparent rounded-full" />
          </div>
        )}

        {pages.map((page, idx) => (
          <PdfPage
            key={idx}
            page={page}
            index={idx}
            totalPages={pages.length}
          />
        ))}
      </main>
    </div>
  );
}
