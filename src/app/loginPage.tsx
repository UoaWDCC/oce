import React, { useState } from "react";
import { Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import { UserData } from "../app/(with-navbar)/dao/types";

interface LoginPageProps {
  onLogin: (
    studentId: number,
    pin: string,
    callback: (success: boolean, error?: string) => void,
  ) => void;
  onSwitchToRegister: () => void;
  testUsers: UserData[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onSwitchToRegister,
  testUsers,
}) => {
  const [authStudentId, setAuthStudentId] = useState<string>("");
  const [authPin, setAuthPin] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = (): void => {
    setAuthError("");

    // Validate student ID is a number
    const studentIdNumber = parseInt(authStudentId);
    if (
      isNaN(studentIdNumber) ||
      studentIdNumber.toString() !== authStudentId
    ) {
      setAuthError("Student ID must be a valid 8-digit number");
      return;
    }

    if (authStudentId.length !== 8) {
      setAuthError("Student ID must be exactly 8 digits");
      return;
    }

    setIsLoading(true);

    onLogin(studentIdNumber, authPin, (success, error) => {
      if (success) {
        setAuthStudentId("");
        setAuthPin("");
      } else {
        setAuthError(error || "Login failed");
      }
      setIsLoading(false);
    });
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Sign In</h1>
          <p className="text-gray-600 mt-2">
            Enter your credentials to access your account
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
                value={authStudentId}
                onChange={(e) => {
                  // Only allow numbers and limit to 8 digits
                  const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                  setAuthStudentId(value);
                }}
                placeholder="12345678"
                maxLength={8}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type={showPin ? "text" : "password"}
                value={authPin}
                onChange={(e) => setAuthPin(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter your PIN"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPin ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={!authStudentId.trim() || !authPin.trim() || isLoading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Signing In...
              </div>
            ) : (
              "Sign In"
            )}
          </button>

          <div className="text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-indigo-600 hover:text-indigo-700 text-sm"
            >
              Don't have an account? Register here
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Test accounts:</p>
          <div className="space-y-1">
            {testUsers.slice(0, 3).map((user) => (
              <div key={user.studentId} className="text-xs text-gray-600">
                <p>
                  ID: {user.studentId} / PIN: {user.pin}
                </p>
                <p className="text-gray-500">{user.email}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
