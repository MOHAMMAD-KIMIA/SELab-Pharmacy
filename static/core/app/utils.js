"use strict";

const Utils = {
    $(id) {
        return document.getElementById(id);
    },

    $$(selector) {
        return document.querySelector(selector);
    },

    $$$(selector) {
        return document.querySelectorAll(selector);
    },

    getCsrfToken() {
        const cookieToken = this.getCookie("csrftoken");
        const domToken = document.querySelector('input[name="csrfmiddlewaretoken"]')?.value;
        return cookieToken || domToken;
    },

    getCookie(name) {
        const value = `; ${document.cookie || ""}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
        return null;
    },

    async safeJson(res) {
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
    },

    async apiRequest(url, { method = "GET", body = null, headers = {} } = {}) {
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
            const csrf = this.getCsrfToken();
            if (csrf) opts.headers["X-CSRFToken"] = csrf;
        }

        const res = await fetch(url, opts);
        const data = await this.safeJson(res);
        return { ok: res.ok, status: res.status, data };
    },

    showError(prefix, status, data) {
        const msg = data?.error || data?.detail || data?.raw || `${prefix} (${status})`;
        alert(msg);
    },

    go(url) {
        window.location.assign(url);
    },

    normalizeList(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.results)) return data.results;
        return [];
    },

    showMessage(elementId, text, type = "info") {
        const element = this.$(elementId);
        if (!element) return;

        element.innerHTML = text;
        element.style.display = "block";

        const colors = {
            success: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
            error: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
            info: { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
            warning: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" }
        };

        const color = colors[type] || colors.info;
        element.style.backgroundColor = color.bg;
        element.style.color = color.text;
        element.style.border = `1px solid ${color.border}`;
        element.style.borderRadius = "0.5rem";
        element.style.padding = "1rem";
        element.style.marginTop = "1rem";

        setTimeout(() => {
            element.style.display = "none";
        }, 5000);
    }
};

window.Utils = Utils;
console.log("✅ Utils module loaded");