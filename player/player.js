document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('video-container');
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('v');

    if (videoId) {
        document.title = "No Cookie Video";

        fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
            .then(res => res.json())
            .then(data => { if (data.title) document.title = data.title; })
            .catch(() => {});

        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1`;
        iframe.title = "YouTube video player";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;

        container.innerHTML = '';
        container.appendChild(iframe);

        let currentSpeed = 1;
        let config = { min: 0.25, max: 3, step: 0.25 };
        let shortcuts = { speedDown: '[', speedUp: ']' };

        chrome.storage.local.get(
            ['playbackSpeedMin', 'playbackSpeedMax', 'playbackSpeedStep', 'shortcuts'],
            (result) => {
                config.min = result.playbackSpeedMin ?? 0.25;
                config.max = result.playbackSpeedMax ?? 3;
                config.step = result.playbackSpeedStep ?? 0.25;
                shortcuts = result.shortcuts || { speedDown: '[', speedUp: ']' };
            }
        );

        const speedBadge = document.createElement('div');
        speedBadge.textContent = '1x';
        speedBadge.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(0,0,0,0.75);
            color: #fff;
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.25s;
            pointer-events: none;
            font-family: Arial, sans-serif;
            backdrop-filter: blur(4px);
        `;
        document.body.appendChild(speedBadge);

        document.body.addEventListener('mouseenter', () => { speedBadge.style.opacity = '1'; });
        document.body.addEventListener('mouseleave', () => { speedBadge.style.opacity = '0'; });

        window.addEventListener('message', (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.event === 'onPlaybackRateChange') {
                    currentSpeed = data.info;
                    speedBadge.textContent = formatSpeed(currentSpeed);
                }
            } catch (_) {}
        });

        function setSpeed(speed) {
            currentSpeed = speed;
            iframe.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [speed] }),
                '*'
            );
            speedBadge.textContent = formatSpeed(speed);
        }

        function changeSpeed(direction) {
            let s = Math.round((currentSpeed + direction * config.step) / config.step) * config.step;
            s = Math.max(config.min, Math.min(config.max, s));
            if (s !== currentSpeed) setSpeed(s);
        }

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === shortcuts.speedDown) { e.preventDefault(); changeSpeed(-1); }
            if (e.key === shortcuts.speedUp) { e.preventDefault(); changeSpeed(1); }
        });

    } else {
        container.innerHTML = '<div class="error"><h3>No video ID found</h3><p>Please return to YouTube and try again.</p></div>';
    }

    document.getElementById('back-btn').addEventListener('click', () => {
        if (document.referrer && document.referrer.includes('youtube.com')) {
            window.history.back();
        } else {
            window.location.href = 'https://www.youtube.com';
        }
    });
});

function formatSpeed(speed) {
    return speed.toFixed(2).replace(/\.?0+$/, '') + 'x';
}
