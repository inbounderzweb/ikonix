import React, { useState, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import axios from "axios";
import qs from 'qs'
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ open, onClose }) {
  const [view, setView] = useState("login");
  const [method, setMethod] = useState("email");
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("form");
  const { token } = useAuth();

  const [receivedOtp, setReceivedOtp] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const otpRefs = useRef([]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSendEmailVerification = async () => {
    if (!token) {
      alert("Auth token missing");
      return;
    }

    console.log("🔐 Sending token:", token);

    try {
      const response = await axios.post(
        "https://ikonixperfumer.com/beta/api/register",
        qs.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          otp: 0,
        }),
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
        setStep("verify");
      } else {
        alert(response.data.message || "Something went wrong");
      }
    } catch (err) {
      console.error("❌ Error during registration step 1:", err?.response?.data || err.message);
      alert("❌ Registration error. See console for details.");
    }
  };

  const onValidateOtp = async () => {
    const finalOtp = otp.join("");
    console.log("📨 OTP Entered:", finalOtp, "Expected:", receivedOtp);

    if (finalOtp === receivedOtp) {
      if (!token) {
        alert("Auth token missing");
        return;
      }

      try {
        const response = await axios.post(
          "https://ikonixperfumer.com/beta/api/register",
          qs.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            otp: 1,
          }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("✅ API Response (Step 2):", response.data);
        alert(response.data.message || "Account created successfully");
      } catch (error) {
        console.error("❌ Error during OTP validation:", error?.response?.data || error.message);
        alert("OTP verification failed. Check console for error.");
      }
    } else {
      alert("Please check the OTP you entered");
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < otp.length - 1) {
      otpRefs.current[index + 1]?.focus();
    } else if (!value && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const Field = ({ type = "text", placeholder, ...props }) => (
    <input
      type={type}
      placeholder={placeholder}
      {...props}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );

  const PrimaryButton = ({ children, ...props }) => (
    <button
      type="button"
      {...props}
      className="w-full rounded-md bg-indigo-600 py-2 text-white transition hover:bg-indigo-700 disabled:opacity-60"
    >
      {children}
    </button>
  );

  const RegisterEmail = () => {
    if (step === "form") {
      return (
        <div className="space-y-4">
          <Field
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
          />
          <Field
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
          <Field
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
          <PrimaryButton onClick={handleSendEmailVerification}>
            Send verification code
          </PrimaryButton>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between gap-2">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (otpRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              className="w-12 text-center rounded-md border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ))}
        </div>
        <PrimaryButton onClick={onValidateOtp}>Verify & Create account</PrimaryButton>
      </div>
    );
  };

  const LoginEmail = () => (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <Field type="email" placeholder="Email" />
      <Field type="password" placeholder="Password" />
      <PrimaryButton>Continue</PrimaryButton>
    </form>
  );

  const LoginMobile = () => (
    <div className="space-y-4">
      {!otpSent ? (
        <>
          <PhoneInput
            country="in"
            value={phone}
            onChange={setPhone}
            inputClass="!w-full !py-2 !text-sm"
            placeholder="Mobile number"
          />
          <PrimaryButton onClick={() => setOtpSent(true)} disabled={!phone}>
            Send OTP
          </PrimaryButton>
        </>
      ) : (
        <>
          <Field type="text" placeholder="Enter OTP" />
          <PrimaryButton
            onClick={() => {
              setOtpSent(false);
              onClose();
            }}
          >
            Verify & Sign in
          </PrimaryButton>
        </>
      )}
    </div>
  );

  const RegisterMobile = () => (
    <div className="space-y-4">
      <Field placeholder="Full name" />
      <PhoneInput
        country="in"
        value={phone}
        onChange={setPhone}
        inputClass="!w-full !py-2 !text-sm"
        placeholder="Mobile number"
      />
      <PrimaryButton onClick={() => setOtpSent(true)} disabled={!phone}>
        Send OTP
      </PrimaryButton>
    </div>
  );

  const MethodTabs = () => (
    <div className="mb-6 flex items-center justify-center gap-4 text-sm">
      {["email", "mobile"].map((m) => (
        <button
          key={m}
          className={`pb-1 capitalize transition border-b-2 ${
            method === m
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => {
            setMethod(m);
            setOtpSent(false);
            setStep("form");
          }}
        >
          {m === "email" ? "Email" : "Mobile OTP"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <button
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <div className="px-8 py-10">
          {view === "login" && (
            <>
              <h2 className="text-center text-2xl font-semibold text-gray-800">Sign in</h2>
              <MethodTabs />
              {method === "email" ? <LoginEmail /> : <LoginMobile />}
              <div className="mt-6 text-center text-sm text-gray-600">
                <button onClick={() => setView("forgot")} className="hover:underline">
                  Forgot password?
                </button>
                <p>
                  Don’t have an account?{" "}
                  <button
                    onClick={() => {
                      setView("register");
                      setMethod("email");
                      setOtpSent(false);
                      setStep("form");
                    }}
                    className="text-indigo-600 hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </>
          )}

          {view === "register" && (
            <>
              <h2 className="text-center text-2xl font-semibold text-gray-800">Create account</h2>
              <MethodTabs />
              {method === "email" ? <RegisterEmail /> : <RegisterMobile />}
              <div className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setView("login");
                    setMethod("email");
                    setOtpSent(false);
                    setStep("form");
                  }}
                  className="text-indigo-600 hover:underline"
                >
                  Sign in
                </button>
              </div>
            </>
          )}

          {view === "forgot" && (
            <>
              <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">Reset password</h2>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <Field type="email" placeholder="Email" />
                <PrimaryButton>Send reset link</PrimaryButton>
              </form>
              <div className="mt-6 text-center text-sm text-gray-600">
                <button onClick={() => setView("login")} className="hover:underline">
                  Back to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
