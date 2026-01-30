// static/core/app/auth.js
"use strict";

console.log("🔐 Loading Auth module...");

const Auth = {
    // فعال‌سازی تب
    setActiveTab(tab) {
        const tabSignin = Utils.$("tab-signin");
        const tabSignup = Utils.$("tab-signup");
        const signin = Utils.$("signin-content");
        const signup = Utils.$("signup-content");

        if (!signin || !signup) return;

        const isSignup = tab === "signup";

        signin.classList.toggle("hidden", isSignup);
        signup.classList.toggle("hidden", !isSignup);

        if (tabSignin) tabSignin.classList.toggle("active", !isSignup);
        if (tabSignup) tabSignup.classList.toggle("active", isSignup);

        if (isSignup) this.updateIdentifierUI();
    },

    // به‌روزرسانی UI شناسه
    updateIdentifierUI() {
        const role = (Utils.$("signup-role")?.value || "patient").toLowerCase();
        const label = Utils.$("id-label");
        const hint = Utils.$("id-hint");
        const input = Utils.$("signup-identifier");

        if (!label || !input) return;

        if (role === "patient") {
            label.textContent = "National ID";
            input.placeholder = "Enter 10-digit National ID";
            input.required = true;
            if (hint) hint.textContent = "Example: 0123456789 (10 digits)";
        } else {
            label.textContent = "Practice Code";
            input.placeholder = "A-123456";
            input.required = true;
            if (hint) hint.textContent = "Format: A- followed by 6 digits (e.g., A-123456)";
        }
    },

    // ورود
    async handleSignIn(e) {
        e.preventDefault();

        const email = (Utils.$("signin-email")?.value || "").trim().toLowerCase();
        const password = Utils.$("signin-password")?.value || "";

        if (!email || !password) {
            alert("Email and password are required");
            return;
        }

        const btn = Utils.$("signin-form")?.querySelector('button[type="submit"]');
        const oldText = btn ? btn.textContent : "";
        if (btn) {
            btn.disabled = true;
            btn.textContent = "Signing in...";
        }

        try {
            const { ok, status, data } = await Utils.apiRequest("/api/login/", {
                method: "POST",
                body: { email, password },
            });

            if (!ok) {
                Utils.showError("Login failed", status, data);
                return;
            }

            const user = data?.user || data;
            const role = (user?.role || "patient").toLowerCase();

            if (role === "pharmacist" || role === "admin") Utils.go("/dashboard/pharmacist/");
            else if (role === "doctor") Utils.go("/dashboard/doctor/");
            else Utils.go("/dashboard/patient/");
        } catch (err) {
            console.error(err);
            alert("Network error");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = oldText || "Sign In";
            }
        }
    },

    // ثبت‌نام
    async handleSignUp(e) {
        e.preventDefault();

        const name = (Utils.$("signup-name")?.value || "").trim();
        const email = (Utils.$("signup-email")?.value || "").trim().toLowerCase();
        const password = Utils.$("signup-password")?.value || "";
        const role = (Utils.$("signup-role")?.value || "patient").toLowerCase();
        const identifier = (Utils.$("signup-identifier")?.value || "").trim();

        if (!name || !email || !password) {
            alert("Please fill name, email, password");
            return;
        }

        // اعتبارسنجی شناسه
        if (!this.validateIdentifier(role, identifier)) {
            return;
        }

        const btn = Utils.$("signup-form")?.querySelector('button[type="submit"]');
        const oldText = btn ? btn.textContent : "";
        if (btn) {
            btn.disabled = true;
            btn.textContent = "Creating...";
        }

        try {
            const payload = { name, email, password, role, identifier };

            const { ok, status, data } = await Utils.apiRequest("/api/signup/", {
                method: "POST",
                body: payload,
            });

            if (!ok) {
                Utils.showError("Signup failed", status, data);
                return;
            }

            alert("Account created successfully! Please sign in.");
            this.setActiveTab("signin");
            Utils.$("signin-email").value = email;
            Utils.$("signin-password").value = "";
            Utils.$("signin-password")?.focus?.();
        } catch (err) {
            console.error(err);
            alert("Network error");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = oldText || "Create Account";
            }
        }
    },

    // اعتبارسنجی شناسه
    validateIdentifier(role, identifier) {
        if (role === "patient") {
            if (!/^\d{10}$/.test(identifier)) {
                alert("National ID must be exactly 10 digits");
                return false;
            }
        } else if (role === "doctor" || role === "pharmacist") {
            if (!/^A-\d{6}$/.test(identifier)) {
                alert("Practice Code must be like A-123456");
                return false;
            }
        } else {
            alert("Invalid role");
            return false;
        }
        return true;
    },

    // مقداردهی اولیه صفحه auth
    init() {
        console.log("🔐 Initializing Auth page...");

        const signinForm = Utils.$("signin-form");
        const signupForm = Utils.$("signup-form");
        const tabSignin = Utils.$("tab-signin");
        const tabSignup = Utils.$("tab-signup");

        if (tabSignin) tabSignin.addEventListener("click", () => this.setActiveTab("signin"));
        if (tabSignup) tabSignup.addEventListener("click", () => this.setActiveTab("signup"));

        if (signinForm) signinForm.addEventListener("submit", (e) => this.handleSignIn(e));
        if (signupForm) signupForm.addEventListener("submit", (e) => this.handleSignUp(e));

        Utils.$("signup-role")?.addEventListener("change", () => this.updateIdentifierUI());

        this.setActiveTab("signin");
        this.updateIdentifierUI();

        console.log("✅ Auth page initialized");
    }
};

window.Auth = Auth;
console.log("✅ Auth module loaded");