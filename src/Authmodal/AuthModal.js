import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import PhoneInput from "react-phone-input-2"; // npm i react-phone-input-2
import "react-phone-input-2/lib/style.css";

/**
 * AuthModal 2.1 – Email verification step added for sign‑up
 *
 * ✦ Highlights
 *   • Register‑with‑email now sends a verification code ➜ user must confirm before account creation.
 *   • Existing Mobile‑OTP and Email‑Password flows unchanged.
 *   • All network calls remain TODOs for your integration.
 */
export default function AuthModal({ open, onClose }) {
  const [view, setView] = useState("login");   // login | register | forgot
  const [method, setMethod] = useState("email"); // email | mobile
  const [otpSent, setOtpSent] = useState(false); // mobile OTP flow
  const [phone, setPhone] = useState("");

  if (!open) return null;

  /* Utilities */
  const Field = ({ type = "text", placeholder }) => (
    <input
      type={type}
      placeholder={placeholder}
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

  /* --------------- LOGIN: Email --------------- */
  const LoginEmail = () => (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <Field type="email" placeholder="Email" />
      <Field type="password" placeholder="Password" />
      <PrimaryButton>Continue</PrimaryButton>
    </form>
  );

  /* --------------- LOGIN: Mobile --------------- */
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
          <PrimaryButton
            disabled={!phone}
            onClick={() => {
              // TODO: send login OTP
              setOtpSent(true);
            }}
          >
            Send OTP
          </PrimaryButton>
        </>
      ) : (
        <>
          <Field type="text" placeholder="Enter OTP" />
          <PrimaryButton
            onClick={() => {
              // TODO: verify OTP ➜ log user in
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

  /* --------------- REGISTER: Email w/ verification --------------- */
  const RegisterEmail = () => {
    const [step, setStep] = useState("form"); // form | verify

    if (step === "form") {
      return (
        <div className="space-y-4">
          <Field placeholder="Full name" />
          <Field type="email" placeholder="Email" />
          <Field type="password" placeholder="Password" />
          <PrimaryButton
            onClick={() => {
              // TODO: send verification code to email
              setStep("verify");
            }}
          >
            Send verification code
          </PrimaryButton>
        </div>
      );
    }

    // step === 'verify'
    return (
      <div className="space-y-4">
        <Field type="text" placeholder="Enter verification code" />
        <PrimaryButton
          onClick={() => {
            // TODO: verify code & create account
            onClose();
          }}
        >
          Verify & Create account
        </PrimaryButton>
      </div>
    );
  };

  /* --------------- REGISTER: Mobile --------------- */
  const RegisterMobile = () => (
    <div className="space-y-4">
      {!otpSent ? (
        <>
          <Field placeholder="Full name" />
          <PhoneInput
            country="in"
            value={phone}
            onChange={setPhone}
            inputClass="!w-full !py-2 !text-sm"
            placeholder="Mobile number"
          />
          <PrimaryButton
            disabled={!phone}
            onClick={() => {
              // TODO: send OTP for registration
              setOtpSent(true);
            }}
          >
            Send OTP
          </PrimaryButton>
        </>
      ) : (
        <>
          <Field type="text" placeholder="Enter OTP" />
          <PrimaryButton
            onClick={() => {
              // TODO: verify OTP & create account
              setOtpSent(false);
              onClose();
            }}
          >
            Verify & Sign up
          </PrimaryButton>
        </>
      )}
    </div>
  );

  /* --------------- Tab switch --------------- */
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
          }}
        >
          {m === "email" ? "Email" : "Mobile OTP"}
        </button>
      ))}
    </div>
  );

  /* --------------- Render --------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <button
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="px-8 py-10">
          {/* ---------- LOGIN ---------- */}
          {view === "login" && (
            <>
              <h2 className="text-center text-2xl font-semibold text-gray-800">Sign in</h2>
              <MethodTabs />
              {method === "email" ? <LoginEmail /> : <LoginMobile />}
              <div className="mt-6 space-y-2 text-center text-sm text-gray-600">
                {method === "email" && (
                  <button type="button" onClick={() => setView("forgot")}
                    className="hover:underline">
                    Forgot password?
                  </button>
                )}
                <p>
                  Don’t have an account? {" "}
                  <button
                    type="button"
                    onClick={() => { setView("register"); setMethod("email"); setOtpSent(false); }}
                    className="text-indigo-600 hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ---------- REGISTER ---------- */}
          {view === "register" && (
            <>
              <h2 className="text-center text-2xl font-semibold text-gray-800">Create account</h2>
              <MethodTabs />
              {method === "email" ? <RegisterEmail /> : <RegisterMobile />}
              <div className="mt-6 text-center text-sm text-gray-600">
                Already have an account? {" "}
                <button
                  type="button"
                  onClick={() => { setView("login"); setMethod("email"); setOtpSent(false); }}
                  className="text-indigo-600 hover:underline"
                >
                  Sign in
                </button>
              </div>
            </>
          )}

          {/* ---------- FORGOT ---------- */}
          {view === "forgot" && (
            <>
              <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">Reset password</h2>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <Field type="email" placeholder="Email" />
                <PrimaryButton>Send reset link</PrimaryButton>
              </form>
              <div className="mt-6 text-center text-sm text-gray-600">
                <button type="button" onClick={() => setView("login")} className="hover:underline">
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
