// Web Speech API check
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert("Speech Recognition API is not supported in this browser. Please use Chrome or Edge.");
}

const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

const micBtn = document.getElementById('mic-btn');
const statusMsg = document.getElementById('status-msg');
const transcriptP = document.getElementById('transcript-text');
const translationP = document.getElementById('translation-text');
const langToggle = document.getElementById('language-toggle');
const labelEn = document.getElementById('label-en');
const labelFi = document.getElementById('label-fi');
const outputHeader = document.querySelector('.output-block h3');
const videoFeed = document.getElementById('video-feed');
const subtitleText = document.getElementById('subtitle-text');
const cameraError = document.getElementById('camera-error');
const retryCameraBtn = document.getElementById('retry-camera');

let isListening = false;
let sourceLang = 'en-US';
let targetLang = 'fi';
let stream = null;

// Camera initialization
const initCamera = async () => {
    // Check if browser supports mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showCameraError("Your browser doesn't support camera access. Use Chrome or Edge.");
        return;
    }

    try {
        // Stop previous stream if exists
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        videoFeed.srcObject = stream;
        cameraError.classList.add('hidden');
    } catch (err) {
        console.error("Camera access error:", err.name, err.message);
        let msg = "Camera access denied.";
        if (err.name === 'NotAllowedError') msg = "Permission denied. Please allow camera access.";
        else if (err.name === 'NotFoundError') msg = "No camera found on this device.";
        else if (err.name === 'NotReadableError') msg = "Camera is already in use by another app.";
        else if (err.name === 'SecurityError') msg = "Security error. Please use localhost or HTTPS.";

        showCameraError(msg);
    }
};

const showCameraError = (message) => {
    cameraError.classList.remove('hidden');
    cameraError.querySelector('p').textContent = message;
};

retryCameraBtn.addEventListener('click', () => {
    initCamera();
});

// Language configuration
const updateLanguageConfig = () => {
    if (langToggle.checked) {
        // Finnish to English
        sourceLang = 'fi-FI';
        targetLang = 'en';
        labelFi.classList.add('active');
        labelEn.classList.remove('active');
        outputHeader.textContent = 'Translation (English)';
    } else {
        // English to Finnish
        sourceLang = 'en-US';
        targetLang = 'fi';
        labelEn.classList.add('active');
        labelFi.classList.remove('active');
        outputHeader.textContent = 'Translation (Finnish)';
    }
    recognition.lang = sourceLang;
};

langToggle.addEventListener('change', updateLanguageConfig);
updateLanguageConfig();

// Initialize camera on load
initCamera();

// Microphone toggle
micBtn.addEventListener('click', () => {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
});

function startListening() {
    try {
        recognition.start();
        isListening = true;
        micBtn.classList.add('listening');
        micBtn.style.boxShadow = '0 0 30px rgba(255, 0, 127, 0.5)';
        statusMsg.textContent = 'Listening... Speak now';
        transcriptP.classList.remove('placeholder');
        translationP.classList.remove('placeholder');
    } catch (e) {
        console.error(e);
    }
}

function stopListening() {
    recognition.stop();
    isListening = false;
    micBtn.classList.remove('listening');
    statusMsg.textContent = 'Paused. Click to resume';
}

// Speech Recognition Results
recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscript += transcript;
            translateText(finalTranscript);
        } else {
            interimTranscript += transcript;
            subtitleText.textContent = interimTranscript; // Show interim speech as subtitles
        }
    }

    if (interimTranscript || finalTranscript) {
        transcriptP.textContent = finalTranscript || interimTranscript;
    }
};

recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    statusMsg.textContent = `Error: ${event.error}`;
    stopListening();
};

// Translation Logic
async function translateText(text) {
    if (!text.trim()) return;

    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang.split('-')[0]}|${targetLang}`;

    try {
        translationP.textContent = 'Translating...';
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.responseData) {
            const translated = data.responseData.translatedText;
            translationP.textContent = translated;
            subtitleText.textContent = translated; // Update subtitle with translation
        } else {
            translationP.textContent = 'Translation error. Please try again.';
        }
    } catch (error) {
        console.error('Translation fetch error:', error);
        translationP.textContent = 'Service unavailable. Check your connection.';
    }
}
