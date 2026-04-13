// script.js

// Helper function to convert ArrayBuffer or Uint8Array to Base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Handles user logout by clearing the token and redirecting to the home page.
async function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// Validates the user's session by sending the JWT to the server.
async function valid() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Session expired. Please log in again.');
        window.location.href = '/Login';
        return null;
    }

    try {
        const response = await fetch('/valid', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                alert('Session expired. Please log in again.');
                window.location.href = '/Login';
            } else {
                alert(`Error: ${response.statusText}. Please log in again.`);
                window.location.href = '/Login';
            }
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error validating session:', error);
        alert('An error occurred. Please log in again.');
        window.location.href = '/Login';
        return null;
    }
}

// Loads and displays all public posts from the server (for userhome.html).
async function loadPosts() {
    try {
        // This endpoint now only returns posts where isClaimed is false
        const response = await fetch('/api/posts');
        if (!response.ok) throw new Error('Failed to fetch posts');

        const posts = await response.json();
        const postsContainer = document.getElementById('posts');
        if (!postsContainer) {
            console.warn("Element with ID 'posts' not found. Skipping loadPosts display.");
            return;
        }
        postsContainer.innerHTML = '';

        if (posts.length === 0) {
            postsContainer.innerHTML = '<p style="text-align: center; margin-top: 20px; color: #555;">No public posts available yet.</p>';
            return;
        }

        posts.forEach(post => {
            const card = document.createElement('div');
            card.classList.add('post-box');

            const img = document.createElement('img');
            if (post.image && post.image.data && post.image.contentType) {
                img.src = `data:${post.image.contentType};base64,${arrayBufferToBase64(post.image.data.data)}`;
            } else {
                img.src = 'placeholder.jpg';
                console.warn('Missing image data for post:', post._id);
            }
            img.alt = post.name;

            const info = document.createElement('div');
            info.className = 'info';
            info.innerHTML = `
                <h3>${post.name}</h3>
                <p><strong>Email:</strong> ${post.email}</p>
                <p><strong>Mobile:</strong> ${post.mobile}</p>
                <p><strong>Location:</strong> ${post.location}</p>
                <br>
            `;

            // Only show the "Claim" button if the post is NOT claimed
            if (!post.isClaimed) {
                info.innerHTML += `<center><a href="/Claimform?donationId=${post._id}" class="button">Claim</a></center>`;
            } else {
                // Optionally show a "Claimed" badge on public view, though /api/posts filters these out
                // This part is mostly for demonstrating the concept if filtering is removed later
                info.innerHTML += `<div class="claimed-badge">Claimed!</div>`;
            }

            card.appendChild(img);
            card.appendChild(info);
            postsContainer.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading public posts:", err);
        const postsContainer = document.getElementById('posts');
        if (postsContainer) {
            postsContainer.innerHTML = '<p style="text-align:center; color:red;">Failed to load posts.</p>';
        }
    }
}

// NOTE: loadMySubmissions is not here. It's in submissions.html now.