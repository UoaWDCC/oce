"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  ChevronRight,
  Check,
  FileText,
  Clock,
  Send,
  Loader2,
  BookOpen,
  Award,
  Landmark,
  Coins,
  TvMinimal,
  Eye,
  Play,
  Star,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { API_URL } from "@/utils/config";
import Toast from "../Toast";
import { useLearningPanelLayout } from "@/context/FloatingPanelLayoutProvider";

// ============================================================================
// YouTube IFrame API types
// ============================================================================

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          events?: {
            onReady?: (event: { target: unknown }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
          playerVars?: Record<string, number | string>;
        },
      ) => { destroy: () => void };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// ============================================================================
// Interfaces
// ============================================================================

interface Checkpoint {
  CheckpointID: string;
  ModuleID: string;
  Title: string;
  Description: string;
  Type: "video" | "written";
  OrderIndex: number;
  Points: number;
  Link: string;
  Prompt?: string;
  MinWords?: number;
  MaxWords?: number;
  progress?: StudentProgress | null;
}

interface Module {
  ModuleID: string;
  Title: string;
  Description: string;
  Category: string;
  CourseID: string | null;
  OrderIndex: number;
  checkpoints: Checkpoint[];
}

interface StudentProgress {
  ProgressID: string;
  StudentUID: string;
  CheckpointID: string;
  Status: "not_started" | "in_progress" | "submitted" | "graded";
  CurrentCount?: number;
  StartedAt?: string;
  CompletedAt?: string;
  SubmissionText?: string;
  SubmittedAt?: string;
  Grade?: number;
  Feedback?: string;
  GradedBy?: string;
  GradedAt?: string;
}

interface ModuleSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  category: "dao" | "defi" | "basics";
}

interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "error";
}

// ============================================================================
// Helpers
// ============================================================================

/** Extract YouTube video ID from various URL formats */
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?/]+)/,
    /youtu\.be\/([^?/]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ============================================================================
// Component
// ============================================================================

export default function ModuleSidebar({
  isOpen,
  onClose,
  category,
}: ModuleSidebarProps) {
  const { panelRef, launcherRef } = useLearningPanelLayout(isOpen);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedCheckpoint, setSelectedCheckpoint] =
    useState<Checkpoint | null>(null);
  const [submission, setSubmission] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "success",
  });

  // Video tracking state
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoElapsed, setVideoElapsed] = useState(0);
  const playerRef = useRef<{ destroy: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabase = createClient();

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast({ show: false, message: "", type: "success" });
  };

  // --------------------------------------------------------------------------
  // Data fetching
  // --------------------------------------------------------------------------

  const fetchModules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setError("Please log in to view learning modules");
        return;
      }

      const url = `${API_URL}/learning/modules?category=${category}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to fetch modules (${response.status})`;
        try {
          const errorData = JSON.parse(errorText) as { error?: string };
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as { modules: Module[] };
      setAllModules(data.modules || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load learning modules",
      );
    } finally {
      setIsLoading(false);
    }
  }, [category, supabase]);

  useEffect(() => {
    if (isOpen) {
      fetchModules();
    }
  }, [isOpen, fetchModules]);

  // Keep selectedModule in sync when allModules refreshes (e.g. after submit)
  useEffect(() => {
    if (selectedModule) {
      const updated = allModules.find(
        (m) => m.ModuleID === selectedModule.ModuleID,
      );
      if (updated) {
        setSelectedModule(updated);
      }
    }
  }, [allModules]); // eslint-disable-line react-hooks/exhaustive-deps

  // --------------------------------------------------------------------------
  // Split modules: required (course) vs optional (unmatched templates)
  // --------------------------------------------------------------------------

  const courseModules = allModules.filter((m) => m.CourseID);
  const templateModules = allModules.filter((m) => !m.CourseID);
  const courseModuleTitles = new Set(courseModules.map((m) => m.Title));
  const optionalModules = templateModules.filter(
    (t) => !courseModuleTitles.has(t.Title),
  );
  const displayModules = [...courseModules, ...optionalModules];

  // --------------------------------------------------------------------------
  // YouTube IFrame API — video end detection
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (
      !selectedCheckpoint ||
      selectedCheckpoint.Type !== "video" ||
      !selectedCheckpoint.Link
    )
      return;

    // Reset video state for new checkpoint
    setVideoEnded(false);
    setVideoPlaying(false);
    setVideoElapsed(0);

    const videoId = getYouTubeVideoId(selectedCheckpoint.Link);
    if (!videoId) return; // non-YouTube — handled by elapsed timer fallback

    const createPlayer = () => {
      // Ensure the container div is in the DOM
      const el = document.getElementById("yt-player-container");
      if (!el || !window.YT?.Player) return;

      // Destroy any existing player
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player("yt-player-container", {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, enablejsapi: 1 },
        events: {
          onStateChange: (event: { data: number }) => {
            // 0 = ENDED, 1 = PLAYING, 2 = PAUSED
            if (event.data === 0) {
              setVideoEnded(true);
              setVideoPlaying(false);
            } else if (event.data === 1) {
              setVideoPlaying(true);
            } else if (event.data === 2) {
              setVideoPlaying(false);
            }
          },
        },
      });
    };

    // Load the YT API if not present, otherwise create player
    if (window.YT?.Player) {
      // Small delay to let React render the container div
      const t = setTimeout(createPlayer, 200);
      return () => {
        clearTimeout(t);
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {
            /* ignore */
          }
          playerRef.current = null;
        }
      };
    }

    // Load the script
    const existing = document.querySelector(
      'script[src*="youtube.com/iframe_api"]',
    );
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }

    // This callback fires once the API is ready
    window.onYouTubeIframeAPIReady = () => {
      setTimeout(createPlayer, 200);
    };

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
      }
    };
  }, [selectedCheckpoint]);

  // Elapsed timer — fallback for non-YouTube videos
  useEffect(() => {
    if (videoPlaying && !videoEnded) {
      timerRef.current = setInterval(() => {
        setVideoElapsed((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [videoPlaying, videoEnded]);

  // --------------------------------------------------------------------------
  // Progress helpers
  // --------------------------------------------------------------------------

  const getModuleProgress = (module: Module) => {
    const completed = module.checkpoints.filter((cp) => {
      const s = cp.progress?.Status;
      // Video checkpoints: submitted = complete (no grading needed)
      if (cp.Type === "video") return s === "submitted" || s === "graded";
      // Written checkpoints: require grading
      return s === "graded";
    }).length;
    const total = module.checkpoints.length;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  const getCheckpointStatus = (checkpoint: Checkpoint) => {
    const progress = checkpoint.progress;

    if (!progress || progress.Status === "not_started") {
      return { status: "available", icon: Clock, color: "text-blue-600" };
    }

    if (progress.Status === "graded") {
      return { status: "completed", icon: Check, color: "text-green-600" };
    }

    if (progress.Status === "submitted") {
      // Video submissions are immediately "completed" — no grading needed
      if (checkpoint.Type === "video") {
        return { status: "completed", icon: Check, color: "text-green-600" };
      }
      return { status: "submitted", icon: Clock, color: "text-orange-600" };
    }

    return { status: "available", icon: Clock, color: "text-blue-600" };
  };

  const isVideoCheckpointDone = (cp: Checkpoint) => {
    const s = cp.progress?.Status;
    return s === "submitted" || s === "graded";
  };

  // --------------------------------------------------------------------------
  // Submission handlers
  // --------------------------------------------------------------------------

  const handleWrittenSubmit = async () => {
    if (!selectedCheckpoint || !submission.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        showToast("Please log in to submit", "error");
        return;
      }

      const response = await fetch(`${API_URL}/learning/submit-written`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          checkpointId: selectedCheckpoint.CheckpointID,
          submissionText: submission,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || "Failed to submit");
      }

      await fetchModules();
      setSubmission("");
      setSelectedCheckpoint(null);
      showToast(
        "Submission successful! Your tutor will review it soon.",
        "success",
      );
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to submit. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVideoSubmit = async () => {
    if (!selectedCheckpoint) return;

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        showToast("Please log in to submit", "error");
        return;
      }

      const response = await fetch(`${API_URL}/learning/submit-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          checkpointId: selectedCheckpoint.CheckpointID,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || "Failed to submit");
      }

      await fetchModules();
      setSelectedCheckpoint(null);
      showToast("Video marked as watched!", "success");
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to submit. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Format date
  // --------------------------------------------------------------------------

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (!isOpen) return null;

  // For non-YouTube videos: allow manual confirmation after 30s of watching
  const NON_YT_MIN_WATCH_SECONDS = 30;
  const isNonYouTubeVideo =
    selectedCheckpoint?.Type === "video" &&
    selectedCheckpoint.Link &&
    !getYouTubeVideoId(selectedCheckpoint.Link);
  const nonYtUnlocked =
    isNonYouTubeVideo && videoElapsed >= NON_YT_MIN_WATCH_SECONDS;

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full md:w-[500px] lg:w-[600px] bg-white/95 backdrop-blur-md shadow-2xl z-50 overflow-y-auto border-l-2 border-purple-200"
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg
            className="absolute -top-20 -right-20 w-80 h-80 opacity-[0.07]"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#5e00b2"
              d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C87,14.6,81.4,29.2,73.1,42.8C64.8,56.4,53.8,69,39.8,76.8C25.8,84.6,8.8,87.6,-7.1,84.7C-23,81.8,-37.9,73,-50.6,61.8C-63.3,50.6,-73.8,36.9,-79.8,21.4C-85.8,5.9,-87.3,-11.4,-82.3,-26.8C-77.3,-42.2,-65.8,-55.7,-51.8,-62.9C-37.8,-70.1,-21.3,-71,-5.1,-63.9C11.1,-56.8,30.6,-83.6,44.7,-76.4Z"
              transform="translate(100 100)"
            />
          </svg>
          <svg
            className="absolute bottom-40 -left-20 w-72 h-72 opacity-[0.05]"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#7b2fd6"
              d="M47.3,-78.7C61.5,-71.2,73.5,-58.4,81.2,-43.2C88.9,-28,92.3,-10.4,89.8,6.1C87.3,22.6,79,38,67.8,50.8C56.6,63.6,42.5,73.8,27,79.5C11.5,85.2,-5.4,86.4,-21.1,82.3C-36.8,78.2,-51.3,68.8,-63.4,56.2C-75.5,43.6,-85.2,27.8,-88.3,10.7C-91.4,-6.4,-87.9,-24.8,-79.1,-40.3C-70.3,-55.8,-56.2,-68.4,-40.7,-75.4C-25.2,-82.4,-8.4,-83.8,7.1,-79.9C22.6,-76,33.1,-86.2,47.3,-78.7Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>

        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] text-white p-6 shadow-xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-[12rem] flex-1 items-center gap-3">
              <div className="shrink-0 p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="min-w-0 break-words text-2xl font-bold">
                Learning Modules
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div ref={launcherRef} />
              <button
                type="button"
                aria-label="Close learning modules"
                onClick={onClose}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <p className="text-sm opacity-90 font-medium pl-1 flex items-center gap-2">
            {category === "dao" ? (
              <>
                <Landmark className="w-4 h-4" />
                <span>DAO Governance Track</span>
              </>
            ) : category === "basics" ? (
              <>
                <BookOpen className="w-4 h-4" />
                <span>Blockchain Basics Track</span>
              </>
            ) : (
              <>
                <Coins className="w-4 h-4" />
                <span>DeFi Mastery Track</span>
              </>
            )}
          </p>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-purple-100 rounded-2xl mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#5e00b2]" />
              </div>
              <span className="text-gray-600 font-medium">
                Loading modules...
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-red-800 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <span className="font-semibold">{error}</span>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: Module List — Required + Optional                      */}
          {/* ============================================================ */}
          {!isLoading && !error && !selectedModule && !selectedCheckpoint && (
            <div className="space-y-6">
              {displayModules.length === 0 && (
                <div className="text-center py-16">
                  <div className="p-4 bg-purple-100 rounded-2xl inline-block mb-4">
                    <BookOpen className="w-10 h-10 text-[#5e00b2]" />
                  </div>
                  <p className="text-gray-500 font-medium">
                    No learning modules available yet.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Check back soon or contact your tutor.
                  </p>
                </div>
              )}

              {/* Required Modules */}
              {courseModules.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Required
                    </h3>
                  </div>

                  {courseModules.map((module) => {
                    const progress = getModuleProgress(module);
                    return (
                      <div
                        key={module.ModuleID}
                        onClick={() => setSelectedModule(module)}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border-2 border-purple-200
                                   hover:border-purple-400 hover:shadow-xl transition-all duration-300
                                   cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#5e00b2] transition-colors mb-1">
                              {module.Title}
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {module.Description}
                            </p>
                          </div>
                          <div className="p-2 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors flex-shrink-0">
                            <ChevronRight className="w-5 h-5 text-[#5e00b2] group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4 pt-4 border-t border-purple-100">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-600 font-medium">
                              {progress.completed} of {progress.total} completed
                            </span>
                            <span className="font-bold text-[#5e00b2]">
                              {progress.percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-purple-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Optional Modules */}
              {optionalModules.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                      Optional
                    </h3>
                  </div>

                  {optionalModules.map((module) => {
                    const progress = getModuleProgress(module);
                    return (
                      <div
                        key={module.ModuleID}
                        onClick={() => setSelectedModule(module)}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border-2 border-gray-200
                                   hover:border-gray-400 hover:shadow-xl transition-all duration-300
                                   cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#5e00b2] transition-colors">
                                {module.Title}
                              </h3>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">
                                Optional
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {module.Description}
                            </p>
                          </div>
                          <div className="p-2 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors flex-shrink-0">
                            <ChevronRight className="w-5 h-5 text-[#5e00b2] group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-600 font-medium">
                              {progress.completed} of {progress.total} completed
                            </span>
                            <span className="font-bold text-[#5e00b2]">
                              {progress.percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-purple-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: Checkpoint List                                        */}
          {/* ============================================================ */}
          {selectedModule && !selectedCheckpoint && (
            <div>
              <button
                onClick={() => setSelectedModule(null)}
                className="flex items-center gap-2 text-gray-600 hover:text-[#5e00b2] mb-6
                           transition-all duration-300 font-semibold group"
              >
                <div className="p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <ChevronRight className="w-4 h-4 rotate-180 text-[#5e00b2]" />
                </div>
                <span>Back to Modules</span>
              </button>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-200 mb-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-[#5e00b2]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedModule.Title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedModule.Description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {selectedModule.checkpoints.map((checkpoint, index) => {
                  const status = getCheckpointStatus(checkpoint);
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={checkpoint.CheckpointID}
                      className={`bg-white/80 backdrop-blur-sm rounded-2xl p-4 border-2 transition-all duration-300 ${
                        status.status === "completed"
                          ? "border-green-300 bg-green-50/80"
                          : status.status === "submitted"
                            ? "border-orange-300 bg-orange-50/80"
                            : "border-purple-200 hover:border-purple-400 hover:shadow-lg cursor-pointer"
                      }`}
                      onClick={() => {
                        if (status.status !== "completed") {
                          setSelectedCheckpoint(checkpoint);
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                            status.status === "completed"
                              ? "bg-gradient-to-br from-green-400 to-green-500"
                              : status.status === "submitted"
                                ? "bg-gradient-to-br from-orange-400 to-orange-500"
                                : "bg-gradient-to-br from-purple-300 to-purple-400"
                          }`}
                        >
                          <StatusIcon className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="font-bold text-gray-900">
                              {index + 1}. {checkpoint.Title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs px-2.5 py-1 bg-gradient-to-r from-purple-100 to-purple-200 text-[#5e00b2] rounded-lg font-bold shadow-sm">
                                {checkpoint.Points} pts
                              </span>
                              <div className="p-1.5 bg-gray-100 rounded-lg">
                                {checkpoint.Type === "written" ? (
                                  <FileText className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <TvMinimal className="w-4 h-4 text-gray-500" />
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                            {checkpoint.Description}
                          </p>

                          {/* Submitted status (written only) */}
                          {status.status === "submitted" && (
                            <div className="mt-3 pt-3 border-t border-orange-200">
                              <div className="flex items-center gap-2 text-xs text-orange-700 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Submitted - Awaiting review</span>
                              </div>
                            </div>
                          )}

                          {/* Completed info */}
                          {status.status === "completed" &&
                            checkpoint.progress && (
                              <div className="mt-3 pt-3 border-t border-green-200">
                                <div className="flex items-center gap-2 text-xs text-green-700 font-medium">
                                  {checkpoint.Type === "video" ? (
                                    <>
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>
                                        Watched{" "}
                                        {formatDate(
                                          checkpoint.progress.SubmittedAt ||
                                            checkpoint.progress.CompletedAt,
                                        )}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>
                                        Completed{" "}
                                        {formatDate(
                                          checkpoint.progress.CompletedAt,
                                        )}
                                      </span>
                                      {checkpoint.progress.Grade !==
                                        undefined && (
                                        <span className="font-bold">
                                          · {checkpoint.progress.Grade}/
                                          {checkpoint.Points} points
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: Checkpoint Detail / Submission                         */}
          {/* ============================================================ */}
          {selectedCheckpoint && (
            <div>
              <button
                onClick={() => {
                  setSelectedCheckpoint(null);
                  setVideoEnded(false);
                  setVideoPlaying(false);
                  setVideoElapsed(0);
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-[#5e00b2] mb-6
                           transition-all duration-300 font-semibold group"
              >
                <div className="p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <ChevronRight className="w-4 h-4 rotate-180 text-[#5e00b2]" />
                </div>
                <span>Back to Checkpoints</span>
              </button>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-200 mb-6 shadow-lg">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex-shrink-0">
                      <Award className="w-6 h-6 text-[#5e00b2]" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedCheckpoint.Title}
                    </h3>
                  </div>
                  <span className="px-4 py-2 bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6] text-white rounded-xl text-sm font-bold shadow-lg">
                    {selectedCheckpoint.Points} points
                  </span>
                </div>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {selectedCheckpoint.Description}
                </p>

                {/* VIDEO EMBED */}
                {selectedCheckpoint.Link && (
                  <div className="mt-4">
                    <label className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3">
                      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#5e00b2] to-[#7b2fd6]" />
                      Video
                    </label>
                    <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-2 border-2 border-purple-200 mb-4 shadow-sm">
                      <div className="aspect-video w-full">
                        {getYouTubeVideoId(selectedCheckpoint.Link) ? (
                          /* YouTube — use IFrame API for end detection */
                          <div
                            id="yt-player-container"
                            className="w-full h-full rounded-lg"
                          />
                        ) : (
                          /* Non-YouTube — regular iframe with play tracking */
                          <iframe
                            src={selectedCheckpoint.Link}
                            title={selectedCheckpoint.Title}
                            className="w-full h-full rounded-lg"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            onLoad={() => {
                              // Start tracking time when iframe loads
                              if (selectedCheckpoint.Type === "video") {
                                setVideoPlaying(true);
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* VIDEO-TYPE: Mark as Watched */}
                {selectedCheckpoint.Type === "video" && (
                  <div className="mt-4">
                    {isVideoCheckpointDone(selectedCheckpoint) ? (
                      /* Already completed */
                      <div className="bg-green-50/80 border-2 border-green-300 rounded-2xl p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-xl">
                            <Check className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <span className="font-bold text-green-900">
                              Video Watched
                            </span>
                            <p className="text-xs text-green-700 mt-0.5">
                              Completed{" "}
                              {formatDate(
                                selectedCheckpoint.progress?.SubmittedAt ||
                                  selectedCheckpoint.progress?.CompletedAt,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : videoEnded || nonYtUnlocked ? (
                      /* Video ended — show submit button */
                      <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-300 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-green-100 rounded-xl">
                            <Check className="w-5 h-5 text-green-600" />
                          </div>
                          <span className="font-bold text-gray-900">
                            Video finished!
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Click below to mark this video as watched and earn
                          your points.
                        </p>
                        <button
                          onClick={handleVideoSubmit}
                          disabled={isSubmitting}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6]
                                     text-white rounded-xl font-bold hover:shadow-xl transition-all duration-300
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     hover:-translate-y-0.5 w-full justify-center"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              <span>Mark as Watched</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Waiting for video to finish */
                      <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-2xl p-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-xl animate-pulse">
                            <Play className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">
                              Watch the video to continue
                            </span>
                            <p className="text-xs text-gray-500 mt-0.5">
                              The completion button will unlock when the video
                              ends
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* WRITTEN-TYPE: Prompt + Submission */}
                {selectedCheckpoint.Type === "written" && (
                  <div className="mt-6">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#5e00b2] to-[#7b2fd6]" />
                      Prompt
                    </label>
                    <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-5 border-2 border-purple-200 mb-6 shadow-sm">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedCheckpoint.Prompt}
                      </p>
                      {selectedCheckpoint.MinWords &&
                        selectedCheckpoint.MaxWords && (
                          <p className="text-xs text-[#5e00b2] mt-3 font-semibold flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            <span>
                              Required: {selectedCheckpoint.MinWords}-
                              {selectedCheckpoint.MaxWords} words
                            </span>
                          </p>
                        )}
                    </div>

                    {/* Already submitted or graded */}
                    {selectedCheckpoint.progress?.Status === "graded" ||
                    selectedCheckpoint.progress?.Status === "submitted" ? (
                      <div
                        className={`${
                          selectedCheckpoint.progress.Status === "graded"
                            ? "bg-green-50/80 border-green-300"
                            : "bg-orange-50/80 border-orange-300"
                        } border-2 rounded-2xl p-5 backdrop-blur-sm`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className={`p-2 rounded-xl ${
                              selectedCheckpoint.progress.Status === "graded"
                                ? "bg-green-100"
                                : "bg-orange-100"
                            }`}
                          >
                            {selectedCheckpoint.progress.Status === "graded" ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-600" />
                            )}
                          </div>
                          <span
                            className={`font-bold ${
                              selectedCheckpoint.progress.Status === "graded"
                                ? "text-green-900"
                                : "text-orange-900"
                            }`}
                          >
                            {selectedCheckpoint.progress.Status === "graded"
                              ? "Graded"
                              : "Awaiting Review"}
                          </span>
                        </div>
                        <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200 shadow-sm">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {selectedCheckpoint.progress.SubmissionText}
                          </p>
                        </div>
                        {selectedCheckpoint.progress.Feedback && (
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                            <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-2">
                              <div className="w-1 h-4 rounded-full bg-blue-500" />
                              Tutor Feedback
                            </p>
                            <p className="text-sm text-blue-800 leading-relaxed">
                              {selectedCheckpoint.progress.Feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#5e00b2] to-[#7b2fd6]" />
                          Your Response
                        </label>
                        <textarea
                          value={submission}
                          onChange={(e) => setSubmission(e.target.value)}
                          placeholder="Type your response here..."
                          rows={10}
                          className="w-full px-5 py-4 border-2 border-purple-200 rounded-xl
                                     focus:outline-none focus:ring-2 focus:ring-[#5e00b2] focus:border-transparent
                                     resize-none bg-white/80 backdrop-blur-sm transition-all duration-300
                                     placeholder:text-gray-400"
                        />
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-xs text-gray-500 font-medium bg-purple-50 px-3 py-1.5 rounded-lg">
                            {submission.split(/\s+/).filter((w) => w).length}{" "}
                            words
                          </span>
                          <button
                            onClick={handleWrittenSubmit}
                            disabled={!submission.trim() || isSubmitting}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#5e00b2] to-[#7b2fd6]
                                       text-white rounded-xl font-bold hover:shadow-xl transition-all duration-300
                                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                                       hover:-translate-y-0.5"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Submitting...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Submit</span>
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom gradient bar */}
        <div className="sticky bottom-0 h-1 bg-gradient-to-r from-[#5e00b2] via-[#7b2fd6] to-[#5e00b2]" />
      </div>
    </>
  );
}
