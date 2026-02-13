import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

interface LoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  isLoading: boolean;
  loginError: string;
  handleSubmit: (e: React.FormEvent) => void;
  handleForgetPasswordClick: () => void;
  onRegisterClick: () => void;
  cookieConsentGiven: boolean | null;
}

const inputVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
};

const LoginForm: React.FC<LoginFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  isLoading,
  loginError,
  handleSubmit,
  handleForgetPasswordClick,
  onRegisterClick,
  cookieConsentGiven,
}) => {
  return (
    <form onSubmit={handleSubmit}>
      <motion.div
        variants={inputVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-4"
      >
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
            disabled={cookieConsentGiven === null}
          />
        </div>
      </motion.div>

      <motion.div
        variants={inputVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">
            Password
          </label>
          <button
            type="button"
            className="text-sm font-medium text-blue-400 hover:text-blue-300"
            onClick={handleForgetPasswordClick}
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-500" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            className="block w-full pl-10 pr-10 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={cookieConsentGiven === null}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-300 focus:outline-none"
              disabled={cookieConsentGiven === null}
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
        transition={{ duration: 0.3, delay: 0.3 }}
        className="flex items-center mb-6"
      >
        <input
          id="remember-me"
          name="remember-me"
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-700 rounded bg-gray-800"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={cookieConsentGiven === null}
        />
        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
          Remember me
        </label>
      </motion.div>

      <motion.div
        variants={inputVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <button
          type="submit"
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={cookieConsentGiven === null || isLoading}
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
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.span>
        </button>
      </motion.div>

      {loginError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center text-sm text-red-400"
        >
          {loginError}
        </motion.div>
      )}

      <motion.div
        variants={inputVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.5 }}
        className="mt-6"
      >
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-400">Or</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Have access code?{" "}
            <button
              type="button"
              onClick={onRegisterClick}
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Register
            </button>
          </p>
        </div>
      </motion.div>
    </form>
  );
};

export default LoginForm; 