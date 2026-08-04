import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

interface RegisterFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  accessCode: string;
  setAccessCode: (code: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  isLoading: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onBackToLogin: () => void;
}

const inputVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
};

const RegisterForm: React.FC<RegisterFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  accessCode,
  setAccessCode,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isLoading,
  error,
  onSubmit,
  onBackToLogin,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <motion.div
        variants={inputVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-1">
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-500" />
          </div>
          <input
            id="register-email"
            type="email"
            required
            className="block w-full pl-10 pr-3 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </motion.div>

      <motion.div
        variants={inputVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <label htmlFor="access-code" className="block text-sm font-medium text-gray-300 mb-1">
          Access Code
        </label>
        <input
          id="access-code"
          type="text"
          maxLength={6}
          required
          className="block w-full px-3 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
          placeholder="Enter 6-character code (letters & numbers)"
          value={accessCode}
          onChange={(e) => {
            const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            if (value.length <= 6) {
              setAccessCode(value);
            }
          }}
          pattern="[A-Za-z0-9]{6}"
          title="Please enter exactly 6 alphanumeric characters"
        />
      </motion.div>

      <motion.div
        variants={inputVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <label htmlFor="register-password" className="block text-sm font-medium text-gray-300 mb-1">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-500" />
          </div>
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            required
            className="block w-full pl-10 pr-10 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-300 focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={inputVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
          Confirm Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-500" />
          </div>
          <input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            required
            className="block w-full pl-10 pr-10 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-gray-400 hover:text-gray-300 focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={inputVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <button
          type="submit"
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <motion.span
            className="flex items-center"
            initial={false}
            animate={{ x: isLoading ? -10 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Registering...
              </>
            ) : (
              <>
                Register
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.span>
        </button>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-red-400"
        >
          {error}
        </motion.div>
      )}

      <motion.div
        variants={inputVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.6 }}
        className="text-center"
      >
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-sm text-gray-400 hover:text-gray-300 flex items-center justify-center mx-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Login
        </button>
      </motion.div>
    </form>
  );
};

export default RegisterForm; 