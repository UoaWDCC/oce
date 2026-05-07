"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  Unlock,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Hash,
  CheckCircle,
  X,
} from "lucide-react";
import { API_URL } from "@/utils/config";

/* ──────────────────────────────
   Minimal pdf.js types (no `any`)
────────────────────────────── */

type PdfJsViewport = {
  width: number;
  height: number;
};

type PdfJsRenderTask = {
  cancel: () => void;
};

type PdfJsPage = {
  getViewport: (opts: { scale: number }) => PdfJsViewport;
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfJsViewport;
  }) => PdfJsRenderTask;
};

type PdfJsDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
};

type PdfJsLib = {
  getDocument: (src: string) => {
    promise: Promise<PdfJsDocument>;
  };
  GlobalWorkerOptions: {
    workerSrc: string;
  };
};

/* ────────────────────────────── */

const EULA_PDF_URL = "/docs/eula.pdf";

/* ──────────────────────────────
   pdf.js loader (CDN)
────────────────────────────── */

async function loadPdfJs(): Promise<PdfJsLib> {
  if ((window as unknown as { __pdfjs_dist__?: PdfJsLib }).__pdfjs_dist__) {
    return (window as unknown as { __pdfjs_dist__: PdfJsLib }).__pdfjs_dist__;
  }

  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

  await new Promise<void>((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load pdf.js"));
    document.head.appendChild(script);
  });

  const pdfjsLib = (window as unknown as { pdfjsLib: PdfJsLib }).pdfjsLib;

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  (
    window as unknown as {
      __pdfjs_dist__: PdfJsLib;
    }
  ).__pdfjs_dist__ = pdfjsLib;

  return pdfjsLib;
}

/* ──────────────────────────────
   Preload + cache EULA pages
────────────────────────────── */

let _eulaPages: Promise<PdfJsPage[]> | null = null;

function preloadEulaPdf(): Promise<PdfJsPage[]> {
  if (_eulaPages) return _eulaPages;

  _eulaPages = (async () => {
    const pdfjsLib = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument(EULA_PDF_URL).promise;

    const pages: PdfJsPage[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      pages.push(await pdf.getPage(i));
    }

    return pages;
  })();

  return _eulaPages;
}

/* ──────────────────────────────
   Single PDF page renderer
────────────────────────────── */

function PdfPage({ page }: { page: PdfJsPage }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderTask: PdfJsRenderTask | null = null;

    const viewport = page.getViewport({ scale: 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext("2d");
    if (!context) return;

    renderTask = page.render({
      canvasContext: context,
      viewport,
    });

    return () => {
      renderTask?.cancel();
    };
  }, [page]);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        className="bg-white shadow-md rounded"
        style={{ maxWidth: "100%" }}
      />
    </div>
  );
}

/* ──────────────────────────────
   Scroll-gated PDF viewer
────────────────────────────── */

function PdfViewer({ onScrolledToBottom }: { onScrolledToBottom: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PdfJsPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hasCalledBack = useRef(false);

  useEffect(() => {
    let cancelled = false;
    hasCalledBack.current = false;

    preloadEulaPdf()
      .then((loaded) => {
        if (!cancelled) setPages(loaded);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load PDF");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const checkScroll = useCallback(() => {
    if (hasCalledBack.current) return;

    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) {
      hasCalledBack.current = true;
      onScrolledToBottom();
    }
  }, [onScrolledToBottom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  useEffect(() => {
    if (pages.length === 0) return;
    const id = requestAnimationFrame(checkScroll);
    return () => cancelAnimationFrame(id);
  }, [pages, checkScroll]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-600 text-sm p-6">
        <AlertCircle className="w-4 h-4 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-gray-100 p-4 space-y-4"
    >
      {pages.length === 0 && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-[#5e00b2] border-t-transparent rounded-full" />
        </div>
      )}

      {pages.map((page, idx) => (
        <PdfPage key={idx} page={page} />
      ))}
    </div>
  );
}

/* ──────────────────────────────
   Main Register page
────────────────────────────── */

export default function RegisterPage() {
  // ── form state ──────────────────────────────────────────────────────────
  const [email, setEmail] = useState<string>("");
  const [course, setCourse] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // ── EULA modal state ────────────────────────────────────────────────────
  const [showEULA, setShowEULA] = useState<boolean>(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] =
    useState<boolean>(false);

  const supabase = createClient();

  // ── kick off PDF + pdf.js preload the moment the page mounts ───────────
  useEffect(() => {
    preloadEulaPdf(); // fire-and-forget; result is cached for PdfViewer
  }, []);

  // ── validation ──────────────────────────────────────────────────────────
  const handleRegisterClick = () => {
    setAuthError("");

    if (!email || !course || !password || !confirmPassword) {
      setAuthError("Please fill in all fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError("Please enter a valid email address");
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long");
      return;
    }
    if (password.length > 32) {
      setAuthError("Password cannot exceed 32 characters");
      return;
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      setAuthError("Password must contain at least one letter and one number");
      return;
    }

    // All valid – open EULA modal
    setHasScrolledToBottom(false);
    setShowEULA(true);
  };

  // ── registration logic (runs after EULA is accepted) ───────────────────
  const handleAcceptEULA = async () => {
    setShowEULA(false);
    setIsLoading(true);

    try {
      const response: { allowed: boolean } = await fetch(
        `${API_URL}/check-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, course }),
        },
      ).then((res) => res.json());

      if (!response.allowed) {
        setAuthError("Email is not allowed to register.");
        return;
      }

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authErr) {
        setAuthError(authErr.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        const regResponse: { success: boolean; message: string } = await fetch(
          `${API_URL}/register`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uuid: authData.user.id, course }),
          },
        ).then((res) => res.json());

        if (!regResponse.success) {
          setAuthError(`Failed to create profile: ${regResponse.message}`);
          setIsLoading(false);
          return;
        }

        setSuccess(true);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error: unknown) {
      setAuthError(
        error instanceof Error ? error.message : "Registration failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineEULA = () => {
    setShowEULA(false);
    setHasScrolledToBottom(false);
  };

  // ── success screen ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="h-[75vh] flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
          <div className="mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Registration Successful!
            </h2>
            <p className="text-gray-600 text-sm">
              Your account has been created. You can now sign in.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block bg-[#5e00b2] text-white px-6 py-2.5 rounded-lg hover:bg-[#c028d3] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 text-sm font-medium"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── main render ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="h-[85vh] flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-5">
          <div className="text-center mb-6">
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Unlock className="w-6 h-6 text-[#5e00b2]" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Register</h1>
            <p className="text-gray-600 text-sm mt-1">
              Create a new account to get started
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
              <span className="text-red-700 text-sm">{authError}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e00b2]/50 focus:border-[#5e00b2] outline-none text-sm transition-colors"
                />
              </div>
            </div>

            {/* Course Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Code
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="ABCD26-s1"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e00b2]/50 focus:border-[#5e00b2] outline-none text-sm transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e00b2]/50 focus:border-[#5e00b2] outline-none text-sm transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-[#5e00b2] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e00b2]/50 focus:border-[#5e00b2] outline-none text-sm transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleRegisterClick}
              disabled={
                !email || !password || password !== confirmPassword || isLoading
              }
              className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-300 text-sm ${
                !email || !password || password !== confirmPassword || isLoading
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-[#5e00b2] text-white hover:bg-[#c028d3] hover:-translate-y-0.5 hover:shadow-lg"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Registering...
                </div>
              ) : (
                "Register"
              )}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-[#5e00b2] hover:text-[#c028d3] text-sm transition-colors"
              >
                Already have an account? Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── EULA Modal ──────────────────────────────────────────────────── */}
      {showEULA && (
        <div className="fixed inset-1 bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col"
            style={{ height: "75vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800">
                End User License Agreement
              </h2>
              <button
                onClick={handleDeclineEULA}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* PDF viewer – pages rendered into a scrollable div so we have
                full access to scroll position.  The "I Accept" button stays
                disabled until the user scrolls to the very bottom. */}
            <PdfViewer
              onScrolledToBottom={() => setHasScrolledToBottom(true)}
            />

            {/* Nudge – only visible while they haven't reached the bottom */}
            {!hasScrolledToBottom && (
              <div className="px-6 pt-2 flex-shrink-0">
                <p className="text-xs text-gray-500 text-center animate-pulse">
                  ↓ Scroll to the bottom to continue ↓
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 flex gap-3 flex-shrink-0">
              <button
                onClick={handleDeclineEULA}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptEULA}
                disabled={!hasScrolledToBottom}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-300 text-sm ${
                  hasScrolledToBottom
                    ? "bg-[#5e00b2] text-white hover:bg-[#c028d3] hover:shadow-lg"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                I Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
