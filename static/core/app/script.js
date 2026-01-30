"use strict";
"unsafe-eval";  

(() => {

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (id) => document.getElementById(id);

  function getCookie(name) {
    const value = `; ${document.cookie || ""}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }

  function getCsrfTokenFromDom() {
    const el = document.querySelector('input[name="csrfmiddlewaretoken"]');
    return el ? el.value : null;
  }

  function getCsrfToken() {
    return getCookie("csrftoken") || getCsrfTokenFromDom();
  }

  async function safeJson(res) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const txt = await res.text();
    if (!txt) return null;
    if (ct.includes("application/json")) {
      try {
        return JSON.parse(txt);
      } catch {
        return { raw: txt };
      }
    }
    try {
      return JSON.parse(txt);
    } catch {
      return { raw: txt };
    }
  }

  async function apiRequest(url, { method = "GET", body = null, headers = {} } = {}) {
    const opts = {
      method,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...headers,
      },
    };

    if (body !== null && body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }

    const m = method.toUpperCase();
    if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(m)) {
      const csrf = getCsrfToken();
      if (csrf) opts.headers["X-CSRFToken"] = csrf;
    }

    const res = await fetch(url, opts);
    const data = await safeJson(res);
    return { ok: res.ok, status: res.status, data };
  }

  function showError(prefix, status, data) {
    const msg = data?.error || data?.detail || data?.raw || `${prefix} (${status})`;
    alert(msg);
  }

  function go(url) {
    window.location.assign(url);
  }

  // -----------------------------
  // AUTH (Signin/Signup page)
  // -----------------------------
  function setActiveTab(tab) {
    const tabSignin = $("tab-signin");
    const tabSignup = $("tab-signup");
    const signin = $("signin-content");
    const signup = $("signup-content");

    if (!signin || !signup) return;

    const isSignup = tab === "signup";

    signin.classList.toggle("hidden", isSignup);
    signup.classList.toggle("hidden", !isSignup);

    tabSignin && tabSignin.classList.toggle("active", !isSignup);
    tabSignup && tabSignup.classList.toggle("active", isSignup);

    if (isSignup) updateIdentifierUI();
  }

  function updateIdentifierUI() {
    const role = ($("signup-role")?.value || "patient").toLowerCase();
    const label = $("id-label");
    const hint = $("id-hint");
    const input = $("signup-identifier");

    if (!label || !input) return;

    if (role === "patient") {
      label.textContent = "National ID";
      input.placeholder = "Enter 10-digit National ID";
      input.required = true;
      input.dataset.kind = "national_id";
      if (hint) hint.textContent = "Example: 0123456789 (10 digits)";
    } else {
      label.textContent = "Practice Code";
      input.placeholder = "A-123456";
      input.required = true;
      input.dataset.kind = "practice_code";
      if (hint) hint.textContent = "Format: A- followed by 6 digits (e.g., A-123456)";
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();

    const email = ($("signin-email")?.value || "").trim().toLowerCase();
    const password = $("signin-password")?.value || "";

    if (!email || !password) {
      alert("Email and password are required");
      return;
    }

    const btn = $("signin-form")?.querySelector('button[type="submit"]');
    const oldText = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Signing in...";
    }

    try {
      const { ok, status, data } = await apiRequest("/api/login/", {
        method: "POST",
        body: { email, password },
      });

      if (!ok) {
        showError("Login failed", status, data);
        return;
      }

      const user = data?.user || data;
      const role = (user?.role || "patient").toLowerCase();

      if (role === "pharmacist" || role === "admin") go("/dashboard/pharmacist/");
      else if (role === "doctor") go("/dashboard/doctor/");
      else go("/dashboard/patient/");
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText || "Sign In";
      }
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();

    const name = ($("signup-name")?.value || "").trim();
    const email = ($("signup-email")?.value || "").trim().toLowerCase();
    const password = $("signup-password")?.value || "";
    const role = ($("signup-role")?.value || "patient").toLowerCase();

    const identifier = ($("signup-identifier")?.value || "").trim();

    if (!name || !email || !password) {
      alert("Please fill name, email, password");
      return;
    }

    if (role === "patient") {
      if (!/^\d{10}$/.test(identifier)) {
        alert("National ID must be exactly 10 digits");
        return;
      }
    } else if (role === "doctor" || role === "pharmacist") {
      if (!/^A-\d{6}$/.test(identifier)) {
        alert("Practice Code must be like A-123456");
        return;
      }
    } else {
      alert("Invalid role");
      return;
    }

    const btn = $("signup-form")?.querySelector('button[type="submit"]');
    const oldText = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Creating...";
    }

    try {
      const payload = { name, email, password, role, identifier };

      const { ok, status, data } = await apiRequest("/api/signup/", {
        method: "POST",
        body: payload,
      });

      if (!ok) {
        showError("Signup failed", status, data);
        return;
      }

      alert("Account created successfully! Please sign in.");
      setActiveTab("signin");
      $("signin-email") && ($("signin-email").value = email);
      $("signin-password") && ($("signin-password").value = "");
      $("signin-password")?.focus?.();
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText || "Create Account";
      }
    }
  }

  function initAuthPage() {
    const signinForm = $("signin-form");
    const signupForm = $("signup-form");

    const tabSignin = $("tab-signin");
    const tabSignup = $("tab-signup");

    tabSignin && tabSignin.addEventListener("click", () => setActiveTab("signin"));
    tabSignup && tabSignup.addEventListener("click", () => setActiveTab("signup"));

    signinForm && signinForm.addEventListener("submit", handleSignIn);
    signupForm && signupForm.addEventListener("submit", handleSignUp);

    $("signup-role")?.addEventListener("change", updateIdentifierUI);

    setActiveTab("signin");
    updateIdentifierUI();
  }

  // -----------------------------
  // Pharmacist Dashboard (optional, safe)
  // -----------------------------
  let medicineCache = [];

  function normalizeList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.results)) return data.results;
    return [];
  }

  async function loadMedicinesForPharmacist() {
    const tbody = $("medicines-table");
    if (!tbody) return;

    const { ok, status, data } = await apiRequest("/api/medicines/");
    if (!ok) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:1rem">Failed to load medicines</td></tr>`;
      return;
    }

    medicineCache = normalizeList(data);

    if (!medicineCache.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:1rem">No medicines found</td></tr>`;
      return;
    }

    tbody.innerHTML = medicineCache
      .map((m) => {
        const price = Number(m.price ?? 0);
        const stock = m.stock ?? 0;
        return `
          <tr>
            <td>${m.name ?? ""}</td>
            <td>${m.category ?? ""}</td>
            <td>${m.batch_number ?? ""}</td>
            <td>${m.expiry_date ?? ""}</td>
            <td>$${Number.isFinite(price) ? price.toFixed(2) : "0.00"}</td>
            <td>${stock}</td>
            <td>
              <button class="btn btn-outline" type="button" onclick="editMedicine(${m.id})">Edit</button>
              <button class="btn btn-outline" type="button" onclick="deleteMedicine(${m.id})">Delete</button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  window.showAddMedicine = function () {
    const modal = $("medicine-modal");
    if (!modal) return;

    $("medicine-modal-title") && ($("medicine-modal-title").textContent = "Add Medicine");
    $("medicine-save-btn") && ($("medicine-save-btn").textContent = "Save");

    $("medicine-form")?.reset();
    $("medicine-id") && ($("medicine-id").value = "");

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => $("medicine-name")?.focus(), 0);
  };

  window.closeMedicineModal = function () {
    const modal = $("medicine-modal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  };

  async function onMedicineSubmit(e) {
    e.preventDefault();

    const id = ($("medicine-id")?.value || "").trim();

    const name = ($("medicine-name")?.value || "").trim();
    const category = ($("medicine-category")?.value || "").trim();
    const batch_number = ($("medicine-batch")?.value || "").trim();
    const expiry_date = ($("medicine-expiry")?.value || "").trim();
    const priceRaw = ($("medicine-price")?.value || "").trim();
    const stockRaw = ($("medicine-stock")?.value || "").trim();
    const notes = ($("medicine-notes")?.value || "").trim();

    if (!name) return alert("Medicine name is required");
    if (!expiry_date) return alert("Expiry date is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry_date)) return alert("Expiry must be YYYY-MM-DD");

    const payload = {
      name,
      category,
      batch_number,
      expiry_date,
      price: priceRaw ? Number(priceRaw) : 0,
      stock: stockRaw ? Number(stockRaw) : 0,
      notes,
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `/api/medicines/${id}/` : "/api/medicines/";

    const { ok, status, data } = await apiRequest(url, { method, body: payload });
    if (!ok) return showError("Save failed", status, data);

    window.closeMedicineModal();
    await loadMedicinesForPharmacist();
  }

  window.editMedicine = function (id) {
    const m = (medicineCache || []).find((x) => String(x.id) === String(id));
    if (!m) return;

    const modal = $("medicine-modal");
    if (!modal) return;

    $("medicine-modal-title") && ($("medicine-modal-title").textContent = "Edit Medicine");
    $("medicine-save-btn") && ($("medicine-save-btn").textContent = "Update");

    $("medicine-id") && ($("medicine-id").value = m.id ?? "");
    $("medicine-name") && ($("medicine-name").value = m.name ?? "");
    $("medicine-category") && ($("medicine-category").value = m.category ?? "");
    $("medicine-batch") && ($("medicine-batch").value = m.batch_number ?? "");
    $("medicine-expiry") && ($("medicine-expiry").value = m.expiry_date ?? "");
    $("medicine-price") && ($("medicine-price").value = m.price ?? "");
    $("medicine-stock") && ($("medicine-stock").value = m.stock ?? "");
    $("medicine-notes") && ($("medicine-notes").value = m.notes ?? "");

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
  };

  window.deleteMedicine = async function (id) {
    if (!confirm("Delete this medicine?")) return;

    const { ok, status, data } = await apiRequest(`/api/medicines/${id}/`, { method: "DELETE" });
    if (!ok) return showError("Delete failed", status, data);

    await loadMedicinesForPharmacist();
  };

  function initPharmacistDashboard() {
    const form = $("medicine-form");
    if (form && !form.dataset.bound) {
      form.addEventListener("submit", onMedicineSubmit);
      form.dataset.bound = "1";
    }
    loadMedicinesForPharmacist();
  }

  // -----------------------------
  // Doctor Dashboard (load medicines into table + select)
  // -----------------------------
  async function loadDoctorMedicines() {
    const tbody = $("doctor-medicines-table");
    const select = $("medicine-select");

    if (!tbody && !select) return;

    const { ok, status, data } = await apiRequest("/api/medicines/");
    if (!ok) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:1rem">Failed to load medicines</td></tr>`;
      if (select) select.innerHTML = `<option value="">Failed to load</option>`;
      return;
    }

    const list = normalizeList(data);

    if (!list.length) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:1rem">No medicines found</td></tr>`;
      if (select) select.innerHTML = `<option value="">No medicines available</option>`;
      return;
    }

    if (tbody) {
      tbody.innerHTML = list
        .map(
          (m) => `
          <tr>
            <td>${m.name || ""}</td>
            <td>${m.category || ""}</td>
            <td>${m.stock ?? 0}</td>
          </tr>
        `
        )
        .join("");
    }

    if (select) {
      select.innerHTML =
        `<option value="">Select a medicine...</option>` +
        list
          .map((m) => {
            const stock = m.stock ?? 0;
            const label = `${m.name || ""} - Stock: ${stock}`;
            return `<option value="${m.id}">${label}</option>`;
          })
          .join("");
    }
  }

  window.createPrescription = function (e) {
    e.preventDefault();
    alert("Prescription submit is not connected to backend yet.");
  };

  function initDoctorDashboard() {
    loadDoctorMedicines();
  }

  // -----------------------------
  // Boot
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    if ($("signin-form") || $("signup-form")) initAuthPage();
    if ($("medicines-table")) initPharmacistDashboard();
    if ($("doctor-medicines-table") || $("medicine-select")) initDoctorDashboard();
  });
})();