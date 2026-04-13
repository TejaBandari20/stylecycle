// ================= CONFIG =================
const API_BASE_URL = "http://51.20.181.96:5000";

// ================= SIGNUP =================
const signupForm = document.getElementById("signuppost");

if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const mobile = document.getElementById("mobile").value;

        try {
            const res = await fetch(`${API_BASE_URL}/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, email, password, mobile })
            });

            const data = await res.json();

            if (res.ok) {
                alert("Signup successful ✅");
                window.location.href = "/Login";
            } else {
                alert(data.message || "Signup failed");
            }
        } catch (err) {
            alert("Network error ❌");
        }
    });
}

// ================= LOGIN =================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                // ✅ Save user info (NO JWT)
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("username", data.username);

                alert("Login successful ✅");
                window.location.href = "/Home";
            } else {
                alert(data.message || "Login failed");
            }
        } catch (err) {
            alert("Network error ❌");
        }
    });
}

// ================= LOAD POSTS =================
async function loadPosts() {
    const container = document.getElementById("donationsList");
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/posts`);
        const posts = await res.json();

        container.innerHTML = "";

        posts.forEach(post => {
            const div = document.createElement("div");

            div.innerHTML = `
                <h3>${post.title}</h3>
                <p>${post.description}</p>
                <button onclick="claimDonation('${post.donationId}')">Claim</button>
            `;

            container.appendChild(div);
        });
    } catch (err) {
        container.innerHTML = "Error loading posts ❌";
    }
}

// ================= CLAIM =================
async function claimDonation(donationId) {
    const userId = localStorage.getItem("userId");

    if (!userId) {
        alert("Please login first ❌");
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/claim`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                donationId,
                userId
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Claim successful ✅");
        } else {
            alert(data.message || "Claim failed");
        }
    } catch (err) {
        alert("Network error ❌");
    }
}

// ================= DONATE =================
const donationForm = document.getElementById("eventForm");

if (donationForm) {
    donationForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const userId = localStorage.getItem("userId");

        if (!userId) {
            alert("Please login first ❌");
            return;
        }

        const formData = new FormData();

        formData.append("title", document.getElementById("title").value);
        formData.append("description", document.getElementById("description").value);
        formData.append("category", document.getElementById("category").value);
        formData.append("quantity", document.getElementById("quantity").value);
        formData.append("image", document.getElementById("image").files[0]);

        // ✅ attach user
        formData.append("userId", userId);

        try {
            const res = await fetch(`${API_BASE_URL}/api/donate`, {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                alert("Donation successful ✅");
            } else {
                alert(data.message || "Donation failed");
            }
        } catch (err) {
            alert("Network error ❌");
        }
    });
}

// ================= AUTO LOAD =================
window.onload = () => {
    loadPosts();
};