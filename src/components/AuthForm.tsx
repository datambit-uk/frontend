import React from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

interface AuthFormProps {
  isRegisterForm: boolean;
  onSwitchForm: (toRegister: boolean) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  isLoading: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  disabled?: boolean;
  registerProps?: {
    registerEmail: string;
    setRegisterEmail: (email: string) => void;
    registerPassword: string;
    setRegisterPassword: (password: string) => void;
    confirmPassword: string;
    setConfirmPassword: (password: string) => void;
    accessCode: string;
    setAccessCode: (code: string) => void;
    showRegisterPassword: boolean;
    setShowRegisterPassword: (show: boolean) => void;
    showConfirmPassword: boolean;
    setShowConfirmPassword: (show: boolean) => void;
    isRegisterLoading: boolean;
    registerError: string;
    onRegisterSubmit: (e: React.FormEvent) => void;
  };
}

const formVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
};

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const buttonVariants = {
  hover: { scale: 1.02, transition: { duration: 0.2 } },
  tap: { scale: 0.98 },
  initial: { scale: 1 }
};

const AuthForm: React.FC<AuthFormProps> = ({
  isRegisterForm,
  onSwitchForm,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  isLoading,
  error,
  onSubmit,
  onForgotPassword,
  disabled,
  registerProps
}) => {
  const direction = isRegisterForm ? 1 : -1;

  const renderLoginForm = () => (
    <motion.form
      initial="enter"
      animate="center"
      exit="exit"
      variants={formVariants}
      custom={direction}
      transition={{
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }}
      onSubmit={onSubmit}
      className="w-full space-y-4"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        <motion.div variants={itemVariants}>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-500" />
            </div>
            <motion.input
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              id="email"
              name="email"
              type="email"
              required
              className="block w-full pl-10 pr-3 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transform-gpu"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled}
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="text-sm font-medium text-blue-400 hover:text-blue-300"
              onClick={onForgotPassword}
            >
              Forgot password?
            </motion.button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-500" />
            </div>
            <motion.input
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className="block w-full pl-10 pr-10 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transform-gpu"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={disabled}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-300 focus:outline-none"
                disabled={disabled}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-700 rounded bg-gray-800"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={disabled}
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
            Remember me
          </label>
        </motion.div>

        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          initial="initial"
          type="submit"
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform-gpu"
          disabled={disabled || isLoading}
        >
          <motion.span
            className="flex items-center"
            animate={isLoading ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
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
        </motion.button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-400">Or</span>
          </div>
        </div>

        <motion.div variants={itemVariants} className="text-center">
          <p className="text-sm text-gray-400">
            Have access code?{" "}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onSwitchForm(true)}
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Register
            </motion.button>
          </p>
        </motion.div>
      </motion.div>
    </motion.form>
  );

  const renderRegisterForm = () => {
    if (!registerProps) return null;

    const {
      registerEmail,
      setRegisterEmail,
      registerPassword,
      setRegisterPassword,
      confirmPassword,
      setConfirmPassword,
      accessCode,
      setAccessCode,
      showRegisterPassword,
      setShowRegisterPassword,
      showConfirmPassword,
      setShowConfirmPassword,
      isRegisterLoading,
      registerError,
      onRegisterSubmit
    } = registerProps;

    return (
      <motion.form
        initial="enter"
        animate="center"
        exit="exit"
        variants={formVariants}
        custom={direction}
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 }
        }}
        onSubmit={onRegisterSubmit}
        className="w-full space-y-4"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <motion.div variants={itemVariants}>
            <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                id="register-email"
                type="email"
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transform-gpu"
                placeholder="you@example.com"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                disabled={disabled}
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
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
                if (value.length <= 6) setAccessCode(value);
              }}
              pattern="[A-Za-z0-9]{6}"
              title="Please enter exactly 6 alphanumeric characters"
              disabled={disabled}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="register-password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                id="register-password"
                type={showRegisterPassword ? "text" : "password"}
                required
                className="block w-full pl-10 pr-10 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transform-gpu"
                placeholder="••••••••"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
                title="Must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"
                disabled={disabled}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="text-gray-400 hover:text-gray-300 focus:outline-none"
                  disabled={disabled}
                >
                  {showRegisterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </motion.button>
              </div>
            </div>
            <div className="text-xs text-gray-400 space-y-1 mt-2">
              <p>Password requirements:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li className={`${registerPassword.length >= 8 ? 'text-green-400' : ''}`}>
                  At least 8 characters long
                </li>
                <li className={`${/[A-Z]/.test(registerPassword) ? 'text-green-400' : ''}`}>
                  One uppercase letter
                </li>
                <li className={`${/[a-z]/.test(registerPassword) ? 'text-green-400' : ''}`}>
                  One lowercase letter
                </li>
                <li className={`${/\d/.test(registerPassword) ? 'text-green-400' : ''}`}>
                  One number
                </li>
                <li className={`${/[@$!%*?&]/.test(registerPassword) ? 'text-green-400' : ''}`}>
                  One special character (@$!%*?&)
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                className="block w-full pl-10 pr-10 py-2 border border-gray-700 bg-gray-800/50 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transform-gpu"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={disabled}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 hover:text-gray-300 focus:outline-none"
                  disabled={disabled}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </motion.button>
              </div>
            </div>
          </motion.div>

          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            initial="initial"
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform-gpu"
            disabled={disabled || isRegisterLoading}
          >
            <motion.span
              className="flex items-center"
              animate={isRegisterLoading ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              {isRegisterLoading ? (
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
          </motion.button>

          {registerError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-sm text-red-400"
            >
              {registerError}
            </motion.div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => onSwitchForm(false)}
              className="text-sm text-gray-400 hover:text-gray-300 flex items-center justify-center mx-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </button>
          </div>
        </motion.div>
      </motion.form>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-900/90 backdrop-blur-lg rounded-lg shadow-2xl p-8 border border-gray-800"
      >
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
            className="mt-4 text-2xl font-bold text-white"
          >
            {isRegisterForm ? 'Create Account' : 'Welcome to Genui!'}
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-2 text-gray-400"
          >
            {isRegisterForm ? 'Please fill in your details' : 'Please sign in to your account'}
          </motion.p>
        </motion.div>

        <AnimatePresence initial={false} custom={direction} mode="wait">
          {isRegisterForm ? renderRegisterForm() : renderLoginForm()}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default AuthForm; 