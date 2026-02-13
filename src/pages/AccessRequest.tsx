import React, { useState, useMemo } from "react";
import { User, Building2, Briefcase, Mail, Phone, FileText, Loader2, AlertCircle, Check, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { apiCall } from "../api/api";
import datambitLogo from "/datambit_logo.png";
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

interface FormData {
  name: string;
  organisation: string;
  designation: string;
  organisationEmail: string;
  contactNumber: string;
  countryCode: string;
  reason: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const AccessRequest: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    organisation: "",
    designation: "",
    organisationEmail: "",
    contactNumber: "",
    countryCode: "44",
    reason: ""
  });

  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Get all countries and their calling codes
  const countries = useMemo(() => {
    return getCountries()
      .map(country => ({
        code: country,
        dialCode: getCountryCallingCode(country),
        name: new Intl.DisplayNames(['en'], { type: 'region' }).of(country) || country
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Validation functions matching backend requirements
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Name validation - only alphabets and spaces
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (!/^[A-Za-z\s]+$/.test(formData.name)) {
      newErrors.name = "Only alphabets and spaces are allowed";
    } else if (formData.name.length > 50) {
      newErrors.name = "Name cannot exceed 50 characters";
    }

    // Organisation validation - alphanumeric and spaces
    if (!formData.organisation.trim()) {
      newErrors.organisation = "Organisation is required";
    } else if (!/^[A-Za-z0-9 ]+$/.test(formData.organisation)) {
      newErrors.organisation = "No special characters are allowed";
    } else if (formData.organisation.length > 50) {
      newErrors.organisation = "Organisation cannot exceed 50 characters";
    }

    // Designation validation
    if (!formData.designation.trim()) {
      newErrors.designation = "Designation is required";
    } else if (formData.designation.length > 50) {
      newErrors.designation = "Designation cannot exceed 50 characters";
    }

    // Organisation Email validation
    if (!formData.organisationEmail.trim()) {
      newErrors.organisationEmail = "Email is required";
    } else {
      const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
      const domain = formData.organisationEmail.split('@')[1]?.toLowerCase();
      
      if (!domain) {
        newErrors.organisationEmail = "Invalid email format";
      } else if (personalDomains.includes(domain)) {
        newErrors.organisationEmail = "Please use your organization email";
      } else if (formData.organisationEmail.length > 50) {
        newErrors.organisationEmail = "Email cannot exceed 50 characters";
      }
    }

    // Country code validation
    if (!formData.countryCode.trim()) {
      newErrors.countryCode = "Country code is required";
    } else if (!/^\d+$/.test(formData.countryCode)) {
      newErrors.countryCode = "Only numbers are allowed";
    } else if (formData.countryCode.length > 4) {
      newErrors.countryCode = "Country code cannot exceed 4 digits";
    }

    // Contact number validation
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    } else if (!/^\d+$/.test(formData.contactNumber)) {
      newErrors.contactNumber = "Only numbers are allowed";
    } else if (formData.contactNumber.length < 10 || formData.contactNumber.length > 11) {
      newErrors.contactNumber = "Contact number must be 10-11 digits";
    }

    // Reason validation
    if (!formData.reason.trim()) {
      newErrors.reason = "Reason is required";
    } else if (formData.reason.length > 300) {
      newErrors.reason = "Reason cannot exceed 300 characters";
    }

    // Consent validation
    if (!consent) {
      newErrors.consent = "Please accept the consent policy to proceed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiCall({
        endpoint: "/api/v2/auth/access-request",
        method: "POST",
        body: formData,
      });

      setSubmitSuccess("Your access request has been submitted successfully!");
      setFormData({
        name: "",
        organisation: "",
        designation: "",
        organisationEmail: "",
        contactNumber: "",
        countryCode: "",
        reason: "",
      });
      setConsent(false);
      console.log(response);
    } catch (err: any) {
      setSubmitError("Failed to submit access request. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setConsent((e.target as HTMLInputElement).checked);
      return;
    }
    
    // Only allow numbers in contact number
    if (name === 'contactNumber' && !/^\d*$/.test(value)) {
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleCountrySelect = (dialCode: string) => {
    setFormData(prev => ({ ...prev, countryCode: dialCode }));
    setIsCountryDropdownOpen(false);
    if (errors.countryCode) {
      setErrors(prev => ({ ...prev, countryCode: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 overflow-hidden fixed inset-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative"
      >
        <div className="bg-gray-900/90 backdrop-blur-lg rounded-lg shadow-2xl p-8 border border-gray-800 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          <img src={datambitLogo} alt="Datambit logo" className="mx-auto h-20 mb-4" />
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Request Access</h1>
            <p className="mt-2 text-gray-400">Fill in the form below to get access to our platform</p>
          </div>

          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md flex items-start"
            >
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{submitError}</p>
            </motion.div>
          )}

          {submitSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-md flex items-start"
            >
              <Check className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-400">{submitSuccess}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    maxLength={50}
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      errors.name ? "border-red-600" : "border-gray-700"
                    } bg-gray-800/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
              </div>

              {/* Organisation Field */}
              <div>
                <label htmlFor="organisation" className="block text-sm font-medium text-gray-300 mb-1">
                  Organisation
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    id="organisation"
                    name="organisation"
                    value={formData.organisation}
                    onChange={handleInputChange}
                    maxLength={50}
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      errors.organisation ? "border-red-600" : "border-gray-700"
                    } bg-gray-800/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Company Name"
                  />
                </div>
                {errors.organisation && <p className="mt-1 text-sm text-red-400">{errors.organisation}</p>}
              </div>

              {/* Designation Field */}
              <div>
                <label htmlFor="designation" className="block text-sm font-medium text-gray-300 mb-1">
                  Designation
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      errors.designation ? "border-red-600" : "border-gray-700"
                    } bg-gray-800/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Your Role"
                  />
                </div>
                {errors.designation && <p className="mt-1 text-sm text-red-400">{errors.designation}</p>}
              </div>

              {/* Organisation Email Field */}
              <div>
                <label htmlFor="organisationEmail" className="block text-sm font-medium text-gray-300 mb-1">
                  Organisation Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="email"
                    id="organisationEmail"
                    name="organisationEmail"
                    value={formData.organisationEmail}
                    onChange={handleInputChange}
                    maxLength={50}
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      errors.organisationEmail ? "border-red-600" : "border-gray-700"
                    } bg-gray-800/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="you@organisation.com"
                  />
                </div>
                {errors.organisationEmail && <p className="mt-1 text-sm text-red-400">{errors.organisationEmail}</p>}
              </div>

              {/* Contact Number Fields */}
              <div className="flex space-x-4">
                <div className="w-1/3 relative">
                  <label htmlFor="countryCode" className="block text-sm font-medium text-gray-300 mb-1">
                    Country Code
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className={`w-full flex items-center justify-between px-3 py-2 border ${
                        errors.countryCode ? "border-red-600" : "border-gray-700"
                      } bg-gray-800/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    >
                      <span>+{formData.countryCode}</span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </button>

                    {isCountryDropdownOpen && (
                      <div 
                        className="absolute z-50 mt-1 bg-gray-800 rounded-md shadow-lg overflow-hidden border border-gray-700"
                        style={{
                          width: '300px',  // Fixed width for better readability
                          maxHeight: '250px',
                          left: '0',
                          overflowY: 'auto',
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#4B5563 #1F2937'
                        }}
                      >
                        <div className="py-1">
                          {countries.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => handleCountrySelect(country.dialCode)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 focus:outline-none focus:bg-gray-700 flex items-center justify-between group"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-white min-w-[60px]">+{country.dialCode}</span>
                                <span className="text-gray-300 group-hover:text-white">{country.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.countryCode && <p className="mt-1 text-sm text-red-400">{errors.countryCode}</p>}
                </div>
                <div className="w-2/3">
                  <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      type="tel"
                      id="contactNumber"
                      name="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      maxLength={11}
                      className={`block w-full pl-10 pr-3 py-2 border ${
                        errors.contactNumber ? "border-red-600" : "border-gray-700"
                      } bg-gray-800/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="1234567890"
                    />
                  </div>
                  {errors.contactNumber && <p className="mt-1 text-sm text-red-400">{errors.contactNumber}</p>}
                </div>
              </div>
            </div>

            {/* Reason Field */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-1">
                Reason for Access
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-500" />
                </div>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  maxLength={300}
                  rows={4}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.reason ? "border-red-600" : "border-gray-700"
                  } bg-gray-800/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Please describe why you need access to our platform..."
                />
              </div>
              {errors.reason && <p className="mt-1 text-sm text-red-400">{errors.reason}</p>}
              <p className="mt-1 text-sm text-gray-500">{formData.reason.length}/300 characters</p>
            </div>

            {/* Add this before the submit button */}
            <div className="space-y-2">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="consent"
                    name="consent"
                    type="checkbox"
                    checked={consent}
                    onChange={handleInputChange}
                    className="w-4 h-4 border-gray-600 rounded bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                </div>
                <label htmlFor="consent" className="ml-3 text-sm text-gray-300">
                  By submitting this form, you consent to Datambit Limited using your details to contact you regarding your query.                </label>
              </div>
              {errors.consent && <p className="text-sm text-red-400">{errors.consent}</p>}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Submitting...
                </span>
              ) : (
                "Submit Request"
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AccessRequest; 