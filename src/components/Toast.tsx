"use client";
import { useEffect } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto close after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-[60] animate-in slide-in-from-top-2 duration-300">
      <div
        className={`
        flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-md border-2
        ${
          type === "success"
            ? "bg-green-50/95 border-green-300"
            : "bg-red-50/95 border-red-300"
        }
      `}
      >
        <div
          className={`p-2 rounded-lg ${
            type === "success" ? "bg-green-100" : "bg-red-100"
          }`}
        >
          {type === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
        </div>

        <p
          className={`font-semibold max-w-xs ${
            type === "success" ? "text-green-900" : "text-red-900"
          }`}
        >
          {message}
        </p>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            type === "success" ? "hover:bg-green-100" : "hover:bg-red-100"
          }`}
        >
          <X
            className={`w-4 h-4 ${
              type === "success" ? "text-green-600" : "text-red-600"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
