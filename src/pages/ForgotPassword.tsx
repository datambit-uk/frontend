import React, { useEffect, useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Check, AlertCircle } from "lucide-react";
import { apiCall } from "../api/api";

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const PasswordReset: React.FC = () => {
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Password validation
  const [passwordStrength, setPasswordStrength] = useState({
    isValid: false,
    message: ""
  });

  const preventCopy = (e:React.ClipboardEvent<HTMLDivElement>)=>{
    e.preventDefault();
  };

  // Check password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ isValid: false, message: "" });
      return;
    }

    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

    let message = "";
    if (!isValid) {
      if (!hasMinLength) {
        message = "Password must be at least 8 characters long";
      } else {
        message = "Password must include uppercase, lowercase, number, and special character";
      }
    }

    setPasswordStrength({ isValid, message });
  }, [password]);

  // Check if passwords match
  // const passwordsMatch = password === confirmPassword && confirmPassword !== "";

  // Handle request OTP submission
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    try {
        setIsLoading(true);
        const response = await apiCall({
            endpoint: "/api/v2/auth/request/reset-password",
            method: "POST",
            body: { username: email },
        });
        console.log(response);
        setSuccess("OTP has been sent to your email address");
        setStep(2);
    } catch (err: any) {
        if(err.message.includes("user doesnt exist")){
            setError("Cannot find the user with given Email Id");
        }
        else{ 
            setError("Failed to send OTP. Please try again.");
        }
    } finally {
        setIsLoading(false);
    }
  };

  // Handle reset password submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Validate inputs
    if (!otp) {
      setError("Please enter the OTP sent to your email");
      return;
    }
    
    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password");
      return;
    }
    
    if (!passwordStrength.isValid) {
      setError(passwordStrength.message);
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
        setIsLoading(true);

        await apiCall({
            endpoint: "/api/v2/auth/update/reset-password",
            method: "POST",
            body: { username: email , password : password , access_code: otp},
        });
      
        setSuccess("Password has been reset successfully! You can now login with your new password.");

        setTimeout(() => {
            navigate("/login")
        }, 3000);

    } catch (err: any) {
      setError("Failed to reset password. Please verify your OTP and try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative">
      {isLoading && (
        <div className="absolute flex items-center justify-center z-30">
          <div className="bg-gray-800 p-3 rounded-full shadow-lg">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-md transition-opacity duration-200 ${isLoading ? "opacity-60" : "opacity-100"}`}
      >
        {/* Card Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-900/90 backdrop-blur-lg rounded-lg shadow-2xl p-8 border border-gray-800"
        >
          <img src={import.meta.env.BASE_URL + 'datambit_logo.png'} alt="Datambit logo" className="mx-auto h-20 mb-4" />
          
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-8"
          >
            <motion.h1
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-2 text-2xl font-bold text-white"
            >
              Reset Your Password
            </motion.h1>
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-2 text-gray-400"
            >
              {step === 1 ? "Enter your email to receive an OTP" : "Enter the OTP sent to your email and set a new password"}
            </motion.p>
          </motion.div>

          {/* Error and Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md flex items-start"
            >
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
          
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-md flex items-start"
            >
              <Check className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-400">{success}</p>
            </motion.div>
          )}

          {/* Step 1: Request OTP Form */}
          {step === 1 && (
            <motion.form
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleRequestOTP}
            >
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <span className="flex items-center">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </motion.button>
            </motion.form>
          )}

          {/* Step 2: Verify OTP and Reset Password Form */}
          {step === 2 && (
            <motion.form
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleResetPassword}
            >
              <div className="mb-4">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-1">
                  One-Time Password
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  className="block w-full px-3 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                  placeholder="Enter the OTP from your email"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="new-password"
                    name="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    className={`block w-full pl-10 pr-10 py-2 border ${
                      password ? (passwordStrength.isValid ? "border-green-600" : "border-red-600") : "border-gray-700"
                    } bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500`}
                    placeholder="••••••••"
                    onPaste={preventCopy}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-300 focus:outline-none"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                {password && (
                  <p className={`mt-1 text-sm ${passwordStrength.isValid ? "text-green-400" : "text-red-400"}`}>
                    {passwordStrength.isValid ? "Password strength: Good" : passwordStrength.message}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className={`block w-full pl-10 pr-10 py-2 border ${
                      confirmPassword 
                        ? (password === confirmPassword ? "border-green-600" : "border-red-600") 
                        : "border-gray-700"
                    } bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500`}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onPaste={preventCopy}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-gray-400 hover:text-gray-300 focus:outline-none"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">
                    Passwords do not match
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || !passwordStrength.isValid || password !== confirmPassword}
                >
                  <span className="flex items-center">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="text-gray-400 hover:text-gray-300 text-sm font-medium flex items-center justify-center"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Back to email input
                </motion.button>
              </div>
            </motion.form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Remember your password?{" "}
              <motion.a
                whileHover={{ scale: 1.05 }}
                href="/login"
                className="font-medium text-blue-400 hover:text-blue-300"
              >
                Sign in
              </motion.a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PasswordReset;