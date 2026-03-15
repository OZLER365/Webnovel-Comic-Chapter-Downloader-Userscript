// ==UserScript==
// @name         Webnovel Comic Ripper
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Downloads Webnovel comic chapters into a folder based on the tab name.
// @author       ozler365
// @license      GPL-3.0-only
// @icon         https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/82/e4/53/82e453f3-7569-7fc1-05d1-ea20871c2241/Placeholder.mill/400x400bb-75.webp
// @match        https://www.webnovel.com/comic/*/*
// @grant        GM_download
// @downloadURL https://update.greasyfork.org/scripts/562799/Webnovel%20Comic%20Ripper.user.js
// @updateURL https://update.greasyfork.org/scripts/562799/Webnovel%20Comic%20Ripper.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. Create a floating download button
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '📥 Download Chapter';
    Object.assign(downloadBtn.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '999999',
        padding: '12px 20px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        fontFamily: 'sans-serif',
        fontWeight: 'bold'
    });
    document.body.appendChild(downloadBtn);

    // Helper: Get cookie by name (for the CSRF token)
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }

    // Helper: Clean the tab title so it is a valid folder name
    function getCleanFolderName() {
        // Removes characters that are invalid in Windows/Mac folder names: \ / : * ? " < > |
        let title = document.title.replace(/[\\/:*?"<>|]/g, '').trim();
        return title || 'Webnovel_Comic_Chapter';
    }

    // 2. Main download logic
    downloadBtn.addEventListener('click', async () => {
        downloadBtn.textContent = 'Fetching data...';
        downloadBtn.disabled = true;

        try {
            // Parse URL for IDs
            const urlParts = window.location.href.split('?')[0].split('/');
            const chapterPart = urlParts.pop(); // e.g., you-are-my-female-now_38330774499412077
            const comicPart = urlParts.pop();   // e.g., beauty-and-the-beasts_14279238705852001

            const chapterId = chapterPart.split('_').pop();
            const comicId = comicPart.split('_').pop();
            const csrfToken = getCookie('_csrfToken');

            if (!chapterId || !comicId) {
                throw new Error("Could not extract Comic ID or Chapter ID from the URL.");
            }

            // Construct API URL
            const apiUrl = `/go/pcm/comic/getContent?_csrfToken=${csrfToken}&chapterId=${chapterId}&comicId=${comicId}`;

            // Fetch chapter info
            const response = await fetch(apiUrl);
            const jsonData = await response.json();

            const pages = jsonData?.data?.chapterInfo?.chapterPage;
            if (!pages || pages.length === 0) {
                throw new Error("No images found in the API response.");
            }

            const folderName = getCleanFolderName();
            downloadBtn.textContent = `Downloading ${pages.length} images...`;

            // 3. Queue downloads
            pages.forEach((page, index) => {
                // Ensure correct file extension (defaulting to .jpg if missing)
                const ext = page.url.split('.').pop().split('?')[0] || 'jpg';
                
                // Pad the index with zeros (e.g., 001, 002) so they sort correctly in the folder
                const fileNumber = String(index + 1).padStart(3, '0');
                const fileName = `${folderName}/${fileNumber}.${ext}`;

                // Trigger the download via the userscript manager
                GM_download({
                    url: page.url,
                    name: fileName,
                    saveAs: false,
                    onerror: (err) => console.error(`Failed to download page ${fileNumber}:`, err)
                });
            });

            setTimeout(() => {
                downloadBtn.textContent = '✅ Downloads Queued!';
                downloadBtn.style.backgroundColor = '#10b981';
            }, 1000);

        } catch (error) {
            console.error(error);
            downloadBtn.textContent = '❌ Error (See Console)';
            downloadBtn.style.backgroundColor = '#ef4444';
        }

        // Reset button after a few seconds
        setTimeout(() => {
            downloadBtn.textContent = '📥 Download Chapter';
            downloadBtn.style.backgroundColor = '#3b82f6';
            downloadBtn.disabled = false;
        }, 5000);
    });
})();