import React, { useState, useRef } from "react";
import axios from "axios";
import qs from "qs";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ open, onClose }) {
  const [currentTab, setCurrentTab] = useState("login"); // Can be 'login', 'register', 'otp', 'resetPassword'
  const [otp, setOtp] = useState(["", "", "", "", "", ""]); // Store OTP values
  const otpRefs = useRef([]); // Refs for inputs to focus next field
  const [form, setForm] = useState({ name: "", email: "", password: "", mobile: "" }); // Form data for register
  const [receivedOtp, setReceivedOtp] = useState(""); // Store OTP sent from the API
  const { token, setUser } = useAuth(); // Correct usage to access both `token` and `setUser`
  const [emailOTP, setEmailOtp] = useState(true); // Email OTP toggle
  const [authMethod, setAuthMethod] = useState("email"); // Default to 'email' for login, register, and reset password
  const [isPasswordLogin, setIsPasswordLogin] = useState(false); // Manage password login toggle




console.log(emailOTP,'emailotp status')

  const handleOtpChange = (e, index) => {
    const value = e.target.value;
    if (/[^0-9]/.test(value)) return; // Allow only numbers

    const newOtp = [...otp];
    newOtp[index] = value;







    setOtp(newOtp);

    // Automatically move focus to the next field
    if (value && index < otp.length - 1) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleBack = () => {
    if (currentTab === "otp") {
      setCurrentTab("register"); // Go back to register
    } else if (currentTab === "resetPassword") {
      setCurrentTab("login"); // Go back to login
    } else if (currentTab === "register") {
      setCurrentTab("login"); // Go back to login
    }
  };

  // Handle send verification code for registration or login
  const HandleSendVerification = async () => {
    if (!token) {
      alert("Auth token missing");
      return;
    }

    console.log("🔐 Sending token:", token);

    const loginApiWithEmail = 'https://ikonixperfumer.com/beta/api/login';
    const registerApi = 'https://ikonixperfumer.com/beta/api/register';
    const apiToCall = emailOTP ? loginApiWithEmail : registerApi; // Use login API if it's email OTP; otherwise, use registration API.

    try {
      // If the login is with email, we need to pass the email only, no password
      // ... all previous imports remain the same

// Replace inside `HandleSendVerification`
const response = await axios.post(
  apiToCall,
  qs.stringify(
    authMethod === "mobile" && emailOTP === "false" 
      ? {
          name: form.name,
          mobile: form.mobile,
          password: form.password,
          otp: 0,
        }
      : emailOTP
      ? {
          email: form.email,
          mobile: form.mobile,
          otp_login: 1,
        }
      : {
          name: form.name,
          email: form.email,
          mobile: form.mobile,
          password: form.password,
          otp: 0,
        }
  ),
  {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
  }
);


      console.log("📩 API Response (Step 1):", response.data);

      const responseOtp = response.data?.otp;
      if (responseOtp) {
        setReceivedOtp(responseOtp);
        setCurrentTab("otp"); // Switch to OTP tab
        // setEmailOtp(false);

      } else {
        alert(response.data.message || "Something went wrong");
        // setEmailOtp(true);

      }
    } catch (err) {
      console.error("❌ Error during registration/login step 1:", err?.response?.data || err.message);
      alert("❌ Registration error. See console for details.");
    }
  };

 const HandleOtpVerify = async (e) => {
    e.preventDefault();
    // Check if OTP is not empty
    if (!receivedOtp) {
      alert("OTP is missing");
      return;
    }
    // Join OTP array values to compare with the received OTP
    const enteredOtp = otp.join("");
  
    console.log("🔐 Received OTP:", receivedOtp);
    console.log("🔐 Entered OTP:", enteredOtp);





    const verifyloginApiWithEmail = 'https://ikonixperfumer.com/beta/api/login';
    const verifyregisterApi = 'https://ikonixperfumer.com/beta/api/register';
    const apiToCall = emailOTP ? verifyloginApiWithEmail : verifyregisterApi; // Use login API if it's email OTP; otherwise, use registration API.
  
    // Compare the received OTP with the user-entered OTP
    if (receivedOtp == enteredOtp) {
      // alert("OTP matched");
      try {
       const response = await axios.post(
  apiToCall,
  qs.stringify(
    authMethod === "mobile" && emailOTP === "false" 
      ? {
          name: form.name,
          mobile: form.mobile,
          password: form.password,
          otp: 1,
        }
      : emailOTP
      ? {
          email: form.email,
          mobile: form.mobile,
          otp_login: 2,
        }
      : {
          name: form.name,
          email: form.email,
          mobile: form.mobile,
          password: form.password,
          otp: 1,
        }
  ),
  {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
  }
);
 setEmailOtp(true);


        console.log("📩 API Response (Step 2):", response.data);
        
        // Collect user data from the response
        const userData = response.data.user;
        const tokenValue = response.data.token;

        // Save user and token to localStorage and context
        const userInfo = {
          token: tokenValue,
          email: userData.email,
          id: userData.id,
          name: userData.name,
          mobile: userData.mobile,
        };
        
        console.log("🔐 Saving user data to context and localStorage:", userInfo);
        

        // Save user info to localStorage
        localStorage.setItem("authUser", JSON.stringify(userInfo));
        // Save user info to context
        setUser(userInfo);  // Ensure this is called to update context
        // Clear OTP fields and proceed to the login state
        setOtp(["", "", "", "", "", ""]);
        setCurrentTab("login");

      } catch (err) {
        console.error("❌ Error during registration step 2:", err?.response?.data || err.message);
        alert("❌ Registration error. See console for details.");
      }
      setOtp(["", "", "", "", "", ""]); // Clear OTP input fields
      //  setEmailOtp(false);
    } else {
      alert("Invalid OTP, please try again.");
      //  setEmailOtp(false);
    }
  };

  // Handle reset password
  const HandleResetPassword = async () => {
    if (!token) {
      alert("Auth token missing");
      return;
    }

    try {
      const response = await axios.post(
        "https://ikonixperfumer.com/beta/api/reset-password",
        qs.stringify({
          email: form.email,
          mobile: form.mobile,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("📩 Reset Password Response:", response.data);

      if (response.data.success) {
        alert("Password reset link sent.");
        setCurrentTab("login");
      } else {
        alert("Error sending reset link.");
      }
    } catch (err) {
      console.error("❌ Error during reset password:", err?.response?.data || err.message);
      alert("❌ Error during reset password. See console for details.");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-8 rounded-lg shadow-lg w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {currentTab === "login"
              ? "SIGN IN"
              : currentTab === "register"
              ? "CREATE ACCOUNT"
              : currentTab === "otp"
              ? "ENTER OTP"
              : "RESET PASSWORD"}
          </h2>
          <button onClick={onClose} className="text-gray-600 text-xl">
            X
          </button>
        </div>

        {/* Back Button */}
        {currentTab !== "login" && (
          <button
            className="text-sm text-blue-600 mb-4"
            onClick={handleBack}
          >
            {"<-----"} Back
          </button>
        )}

        {/* Auth Method Selection */}
        {(currentTab === "register" || currentTab === "login" || currentTab === "resetPassword") && (
          <div className="flex justify-between mb-4">
            <button
              className={`w-1/2 p-3 ${authMethod === "email" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"}`}
              onClick={() => setAuthMethod("email")}
            >
              Email
            </button>
            <button
              className={`w-1/2 p-3 ${authMethod === "mobile" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"}`}
              onClick={() => setAuthMethod("mobile")}
            >
              Mobile
            </button>
          </div>
        )}

        {/* Form content based on the tab */}
        {currentTab === "login" && (
          <div>
            <p className="text-sm text-center mb-4">Login with OTP</p>

            {authMethod === "email" ? (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded mb-4"
                />
                {!isPasswordLogin && (
                  <button
                    className="w-full p-3 bg-blue-500 text-white rounded mb-4"
                    onClick={() =>{setEmailOtp(true); setCurrentTab("otp"); HandleSendVerification();}}
                  >
                    Login with OTP
                  </button>
                )}
                {isPasswordLogin && (
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full p-3 border border-gray-300 rounded mb-4"
                  />
                )}
                <p
                  className="text-sm text-blue-600 cursor-pointer text-center"
                  onClick={() => setIsPasswordLogin(!isPasswordLogin)}
                >
                  {isPasswordLogin ? "Use OTP instead" : "Use password instead"}
                </p>
              </>
            ) : (
              <>
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded mb-4"
                />
                <button
                  className="w-full p-3 bg-blue-500 text-white rounded"
                  onClick={() =>{setEmailOtp(true); setCurrentTab("otp"); HandleSendVerification();}}
                >
                  Login with OTP
                </button>
              </>
            )}

            <div className="text-center mt-4">
              <p
                className="text-sm text-blue-600 cursor-pointer"
                onClick={() => setCurrentTab("resetPassword")}
              >
                Forgot password?
              </p>
              <p className="text-sm">
                Don’t have an account?{" "}
                <span
                  className="text-blue-600 cursor-pointer"
                  onClick={() => setCurrentTab("register")}
                >
                  Sign up
                </span>
              </p>
            </div>
          </div>
        )}

        {currentTab === "register" && (
          <div>
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded mb-4"
            />
            {authMethod === "email" ? (
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded mb-4"
              />
            ) : (
              <input
                type="tel"
                placeholder="Mobile Number"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded mb-4"
              />
            )}
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded mb-4"
            />
            <button
              className="w-full p-3 bg-blue-500 text-white rounded"
              onClick={HandleSendVerification}
            >
              Send verification code
            </button>
          </div>
        )}

        {currentTab === "otp" && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Enter OTP</h3>
            <div className="flex justify-between mb-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  value={digit}
                  onChange={(e) => handleOtpChange(e, index)}
                  maxLength={1}
                  className="w-12 h-12 text-center border border-gray-300 rounded-md"
                />
              ))}
            </div>
            <button
              onClick={HandleOtpVerify}
              className="w-full p-3 bg-blue-500 text-white rounded"
            >
              Verify OTP
            </button>
          </div>
        )}

        {currentTab === "resetPassword" && (
          <div>
            {authMethod === "email" ? (
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 border border-gray-300 rounded mb-4"
              />
            ) : (
              <input
                type="tel"
                placeholder="Mobile Number"
                className="w-full p-3 border border-gray-300 rounded mb-4"
              />
            )}
            <button
              onClick={HandleResetPassword}
              className="w-full p-3 bg-blue-500 text-white rounded"
            >
              Send reset link
            </button>
            <div className="text-center mt-4">
              <p
                className="text-sm"
                onClick={() => setCurrentTab("login")}
              >
                Back to sign in
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
