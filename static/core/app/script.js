"use strict";

console.log(" Loading main application...");

const modules = [
    { name: "utils", file: "utils.js" },
    { name: "auth", file: "auth.js" },
    { name: "doctor", file: "doctor.js" },
    { name: "pharmacist", file: "pharmacist.js" },
    { name: "patient", file: "patient.js" }
];

async function loadModules() {
    console.log(" Loading modules...");
    
    for (const module of modules) {
        try {
            if (isModuleNeeded(module.name)) {
                console.log(` Loading ${module.name} module...`);
                await loadScript(`/static/core/app/${module.file}`);
            }
        } catch (error) {
            console.error(`❌ Failed to load ${module.name} module:`, error);
        }
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function isModuleNeeded(moduleName) {
    const path = window.location.pathname;
    
    switch (moduleName) {
        case "utils":
            return true; 
            
        case "auth":
            return path.includes("/signin/") || 
                   document.getElementById("signin-form") || 
                   document.getElementById("signup-form");
            
        case "doctor":
            return path.includes("/dashboard/doctor/") || 
                   document.getElementById("doctor-medicine-table") ||
                   document.getElementById("doctor-medicine-select");
            
        case "pharmacist":
            return path.includes("/dashboard/pharmacist/") || 
                   document.getElementById("medicines-table");
            
        case "patient":
            return path.includes("/dashboard/patient/");
            
        default:
            return false;
    }
}

function initializePage() {
    console.log(" Initializing page...");
    const path = window.location.pathname;
    
    if (path.includes("/signin/") || 
        document.getElementById("signin-form") || 
        document.getElementById("signup-form")) {
        console.log(" Initializing Auth page...");
        if (window.Auth && window.Auth.init) {
            window.Auth.init();
        }
    }
    
    else if (path.includes("/dashboard/doctor/") || 
             document.getElementById("doctor-medicine-table")) {
        console.log(" Initializing Doctor dashboard...");
        if (window.Doctor && window.Doctor.init) {
            window.Doctor.init();
        }
    }
    
    else if (path.includes("/dashboard/pharmacist/") || 
             document.getElementById("medicines-table")) {
        console.log(" Initializing Pharmacist dashboard...");
        if (window.Pharmacist && window.Pharmacist.init) {
            window.Pharmacist.init();
        }
    }
    
    else if (path.includes("/dashboard/patient/")) {
        console.log(" Initializing Patient dashboard...");
    }
    
    else {
        console.log(" Initializing Landing page...");
    }
}

document.addEventListener("DOMContentLoaded", async function() {
    console.log(" DOM Content Loaded");
    
    try {
        await loadModules();
        
        setTimeout(initializePage, 100); 
    } catch (error) {
        console.error(" Error initializing application:", error);
    }
});

const style = document.createElement('style');
style.textContent = `
    .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .badge-green {
        background-color: #d1fae5;
        color: #065f46;
    }
    
    .badge-blue {
        background-color: #dbeafe;
        color: #1e40af;
    }
    
    .badge-red {
        background-color: #fee2e2;
        color: #991b1b;
    }
    
    .hidden {
        display: none !important;
    }
`;
document.head.appendChild(style);

console.log("✅ Main application script loaded");