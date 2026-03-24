"use client";
import React, { useState } from "react";
import {
  Unlock,
  User,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function RegisterPage() {
  const [registerStudentId, setRegisterStudentId] = useState<string>("");
  const [registerEmail, setRegisterEmail] = useState<string>("");
  const [registerPin, setRegisterPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const supabase = createClient();

  const handleRegister = async (): Promise<void> => {
    setAuthError("");

    // Validate student ID is a number
    const studentIdNumber = parseInt(registerStudentId);
    if (
      isNaN(studentIdNumber) ||
      studentIdNumber.toString() !== registerStudentId
    ) {
      setAuthError("Student ID must be a valid 8-digit number");
      return;
    }

    if (registerStudentId.length !== 8) {
      setAuthError("Student ID must be exactly 8 digits");
      return;
    }

    if (registerPin !== confirmPin) {
      setAuthError("PINs do not match");
      return;
    }

    if (registerPin.length !== 4) {
      setAuthError("PIN must be exactly 4 digits");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail)) {
      setAuthError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Check if student ID or email already exists in Student table
      const { data: existingStudent } = await supabase
        .from("Student")
        .select("Email, ID")
        .or(`Email.eq.${registerEmail},ID.eq.${studentIdNumber}`)
        .single();

      if (existingStudent) {
        if (existingStudent.Email === registerEmail) {
          setAuthError("Email address already registered");
        } else if (existingStudent.ID === studentIdNumber) {
          setAuthError("Student ID already registered");
        }
        setIsLoading(false);
        return;
      }

      // Sign up with Supabase Auth using email and a padded PIN as password
      // Pad PIN to meet Supabase's 6-character minimum requirement
      const paddedPassword = registerPin.padEnd(6, "0");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerEmail,
        password: paddedPassword, // Use padded PIN to meet 6-char requirement
        options: {
          data: {
            student_id: studentIdNumber,
          },
        },
      });

      if (authError) {
        setAuthError(authError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // Create student record in database
        const { error: studentError } = await supabase.from("Student").insert({
          Email: registerEmail,
          Password: registerPin, // Store PIN in Password field
          ID: studentIdNumber,
          Wallet: null, // Will be populated when wallets are created
          Private_key: null, // Will be populated when wallets are created
        });

        if (studentError) {
          setAuthError(
            `Failed to create student profile: ${studentError.message}`,
          );
          setIsLoading(false);
          return;
        }

        // Success!
        setSuccess(true);
        setRegisterStudentId("");
        setRegisterEmail("");
        setRegisterPin("");
        setConfirmPin("");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.";
      setAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Registration Successful!
            </h2>
            <p className="text-gray-600">
              Your account has been created successfully. You can now sign in
              with your credentials.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Unlock className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Register</h1>
            <p className="text-gray-600 mt-2">
              Create a new account to get started
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-700 text-sm">{authError}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student ID (8 digits)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={registerStudentId}
                  onChange={(e) => {
                    // Only allow numbers and limit to 8 digits
                    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                    setRegisterStudentId(value);
                  }}
                  placeholder="12345678"
                  maxLength={8}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="your.email@university.edu"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN (exactly 4 digits)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPin ? "text" : "password"}
                  value={registerPin}
                  onChange={(e) => {
                    // Only allow numbers and limit to exactly 4 digits
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setRegisterPin(value);
                  }}
                  placeholder="1234"
                  maxLength={4}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPin ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={(e) => {
                    // Only allow numbers and limit to exactly 4 digits
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setConfirmPin(value);
                  }}
                  placeholder="1234"
                  maxLength={4}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={
                !registerStudentId.trim() ||
                !registerEmail.trim() ||
                !registerPin.trim() ||
                !confirmPin.trim() ||
                isLoading
              }
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Registering...
                </div>
              ) : (
                "Register"
              )}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-green-600 hover:text-green-700 text-sm"
              >
                Already have an account? Sign in here
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Example format:</p>
            <div className="text-xs text-gray-600">
              <p>Student ID: 12345678</p>
              <p>Email: john.doe@university.edu</p>
              <p>PIN: 1234 (exactly 4 digits)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
