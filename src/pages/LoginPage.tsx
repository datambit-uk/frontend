import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthenticationContent';
import bgVideo from '/hero_bg.mp4';
import VideoBackground from '../components/VideoBackground';
import AuthForm from '../components/AuthForm';
import CookieBanner from '../components/CookieBanner';
import { apiCall } from "../api/api";

const LoginPage: React.FC = () => {
  // Login form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [cookieConsentGiven, setCookieConsentGiven] = useState<boolean | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Register form states
  const [isRegisterForm, setIsRegisterForm] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const clearLoginStates = () => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRememberMe(false);
    setLoginError("");
  };

  const clearRegisterStates = () => {
    setRegisterEmail("");
    setRegisterPassword("");
    setConfirmPassword("");
    setAccessCode("");
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
    setRegisterError("");
  };

  const switchForm = (toRegister: boolean) => {
    if (toRegister) {
      clearLoginStates();
    } else {
      clearRegisterStates();
    }
    setIsRegisterForm(toRegister);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");

    // Validate access code
    if (!/^[A-Z0-9]{6}$/.test(accessCode)) {
      setRegisterError("Access code must be exactly 6 alphanumeric characters");
      return;
    }

    // Validate passwords match
    if (registerPassword !== confirmPassword) {
      setRegisterError("Passwords do not match");
      return;
    }

    // Validate password strength with regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(registerPassword)) {
      setRegisterError("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character");
      return;
    }

    setIsRegisterLoading(true);

    try {
      const response = await apiCall({
        endpoint: "/api/v2/auth/register",
        method: "POST",
        body: {
          "username": registerEmail,
          "password": registerPassword,
          "access_code": accessCode
        },
        auto_refresh: false
      });

      if (response && response?.message) {
        // Successfully registered, switch to login form
        switchForm(false);
        setLoginError("Registration successful! Please login.");
      } else {
        setRegisterError("Registration failed. Please try again.");
      }
    } catch (error: any) {
      setRegisterError(error.message || "Registration failed. Please try again.");
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");

    try {
      const response = await apiCall({
        endpoint: "/api/v2/auth/login",
        method: "POST",
        body: { "username": email, "password": password },
        auto_refresh: false
      });

      if (response && response?.message) {
        login(response.message.access_token, response.message.refresh_token, rememberMe);
        navigate("/home");
      } else {
        setLoginError("Invalid credentials. Please try again.");
      }
    } catch (error: any) {
      setLoginError(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgetPasswordClick = () => {
    navigate("/password-reset");
  };

  useEffect(() => {
    const validateToken = async () => {
      try {
        const localToken = localStorage.getItem("jwtToken");
        const sessionToken = sessionStorage.getItem("jwtToken");
        const token = localToken || sessionToken;

        if (token) {
          setIsLoading(true);
          const response = await apiCall({
            endpoint: "/api/v2/auth/validate-token",
            method: "POST",
            jwtToken: true,
          });

          if (response) {
            const refreshToken =
              localStorage.getItem("refreshToken") ||
              sessionStorage.getItem("refreshToken");

            if (!refreshToken) {
              setIsLoading(false);
              setInitialLoading(false);
              return;
            }

            navigate("/home");
            return;
          }
        }
      } catch (err: any) {
        console.log("Token validation failed:", err);
      } finally {
        setIsLoading(false);
        setInitialLoading(false);
      }
    };

    validateToken();
  }, []);

  const handleCookieConsent = (consent: boolean) => {
    localStorage.setItem("cookieConsent", consent ? "accepted" : "rejected");
    setCookieConsentGiven(consent);
  };

  useEffect(() => {
    const storedConsent = localStorage.getItem("cookieConsent");
    if (storedConsent) {
      setCookieConsentGiven(storedConsent === "accepted");
    }
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen w-screen flex flex-col md:flex-row bg-gray-100 relative overflow-hidden">
        <VideoBackground videoSrc={bgVideo} />

        <div className="flex w-full md:w-1/2 items-center justify-center bg-black relative">
          {cookieConsentGiven === null && (
            <div className="absolute inset-0 bg-gray-500 opacity-50 z-20" style={{ pointerEvents: "none" }} />
          )}

          <AuthForm
            isRegisterForm={isRegisterForm}
            onSwitchForm={switchForm}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            rememberMe={rememberMe}
            setRememberMe={setRememberMe}
            isLoading={isLoading}
            error={loginError}
            onSubmit={handleSubmit}
            onForgotPassword={handleForgetPasswordClick}
            disabled={cookieConsentGiven === null}
            registerProps={{
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
              onRegisterSubmit: handleRegisterSubmit
            }}
          />
        </div>
      </div>

      {cookieConsentGiven === null && (
        <CookieBanner
          onAccept={() => handleCookieConsent(true)}
          onReject={() => handleCookieConsent(false)}
        />
      )}
    </>
  );
};

export default LoginPage;
