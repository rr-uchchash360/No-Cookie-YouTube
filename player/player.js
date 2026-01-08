document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('video-container');
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('v');

    if (videoId) {
        document.title = "No Cookie Video"; // Will be updated by title injection if possible

        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
        iframe.title = "YouTube video player";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;

        // Clear loading state and add iframe
        container.innerHTML = '';
        container.appendChild(iframe);

        // Save to recent history or bookmarks could go here
    } else {
        container.innerHTML = '<div class="error"><h3>No video ID found</h3><p>Please return to YouTube and try again.</p></div>';
    }

    // Back button logic
    document.getElementById('back-btn').addEventListener('click', () => {
        if (document.referrer && document.referrer.includes('youtube.com')) {
            window.history.back();
        } else {
            window.location.href = 'https://www.youtube.com';
        }
    });
});
