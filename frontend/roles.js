const analyticsLink =
    document.getElementById("analyticsLink");

const userBtn =
    document.getElementById("userBtn");

const analyzerBtn =
    document.getElementById("analyzerBtn");

// Simple demo credentials for the "Analyzer" role.
// NOTE: client-side only, not real security.
const ANALYZER_USERNAME = "analyst";
const ANALYZER_PASSWORD = "transitlens2026";

function setRole(role){
    if(role === "user"){
        analyticsLink.style.display = "none";
        userBtn.classList.add("active-role");
        analyzerBtn.classList.remove("active-role");
    }
    else{
        analyticsLink.style.display = "inline";
        analyzerBtn.classList.add("active-role");
        userBtn.classList.remove("active-role");
    }
    localStorage.setItem("role", role);
}

function showAnalyzerLoginModal(){
    // Prevent duplicate modals if clicked twice quickly
    if (document.getElementById("analyzerModalOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "analyzerModalOverlay";
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex;
        align-items: center; justify-content: center; z-index: 1000;
    `;

    overlay.innerHTML = `
        <form id="analyzerLoginForm" style="
            background: #fff; padding: 24px; border-radius: 8px;
            width: 280px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            font-family: inherit;
        ">
            <h3 style="margin: 0 0 16px 0;">Analyzer Login</h3>

            <label style="display:block; margin-bottom: 4px; font-size: 14px;">Username</label>
            <input id="analyzerUsernameInput" type="text" autocomplete="username"
                style="width: 100%; padding: 8px; margin-bottom: 12px; box-sizing: border-box;" />

            <label style="display:block; margin-bottom: 4px; font-size: 14px;">Password</label>
            <input id="analyzerPasswordInput" type="password" autocomplete="current-password"
                style="width: 100%; padding: 8px; margin-bottom: 16px; box-sizing: border-box;" />

            <div id="analyzerLoginError" style="color: #c0392b; font-size: 13px; margin-bottom: 8px; display: none;">
                Falscher Benutzername oder falsches Passwort.
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button type="button" id="analyzerCancelBtn" style="padding: 6px 12px;">Cancel</button>
                <button type="submit" style="padding: 6px 12px;">Login</button>
            </div>
        </form>
    `;

    document.body.appendChild(overlay);

    const form = document.getElementById("analyzerLoginForm");
    const usernameInput = document.getElementById("analyzerUsernameInput");
    const passwordInput = document.getElementById("analyzerPasswordInput");
    const errorMsg = document.getElementById("analyzerLoginError");

    usernameInput.focus();

    function closeModal(){
        overlay.remove();
    }

    document.getElementById("analyzerCancelBtn").addEventListener("click", closeModal);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (usernameInput.value ===  "test" && passwordInput.value === "test") {
            sessionStorage.setItem("analyzerAuthenticated", "true");
            setRole("analyzer");
            closeModal();
        } else {
            errorMsg.style.display = "block";
            passwordInput.value = "";
            passwordInput.focus();
        }
    });
}

userBtn.addEventListener("click", () => {
    sessionStorage.removeItem("analyzerAuthenticated");
    setRole("user");
});

analyzerBtn.addEventListener("click", showAnalyzerLoginModal);

const savedRole = localStorage.getItem("role") || "user";
const isAnalyzerSession = sessionStorage.getItem("analyzerAuthenticated") === "true";

setRole(savedRole === "analyzer" && isAnalyzerSession ? "analyzer" : "user");