// =========================
// Session Data
// =========================
var subject = sessionStorage.getItem("subject");
var brandCode = sessionStorage.getItem("brandCode");
var studentName = sessionStorage.getItem("name");
var address = sessionStorage.getItem("address");
var fatherName = sessionStorage.getItem("fatherName");
var enrollment = sessionStorage.getItem("enrollment");
var imgUrl = sessionStorage.getItem("imgUrl");
var tabSwitchCount = 0;
var warningCount = 0;

// =========================
// Quiz Data
// =========================
var allQuestion = [];
var index = 0;
var total = 0;
var right = 0;
var wrong = 0;

// =========================
// On-Screen Message (NO CHANGE - Your original code)
// =========================
function showOnScreenMessage(message, duration = 3000) {
    let existingMessage = document.getElementById("onscreen-message");
    if (existingMessage) {
        existingMessage.innerText = message;
        return;
    }
    let msgBox = document.createElement("div");
    msgBox.id = "onscreen-message";
    msgBox.style.position = "fixed";
    msgBox.style.top = "15%";
    msgBox.style.left = "50%";
    msgBox.style.transform = "translateX(-50%)";
    msgBox.style.background = "rgba(0,0,0,0.8)";
    msgBox.style.color = "white";
    msgBox.style.padding = "15px 25px";
    msgBox.style.borderRadius = "10px";
    msgBox.style.fontSize = "16px";
    msgBox.style.zIndex = "9999";
    msgBox.style.textAlign = "center";
    msgBox.innerText = message;
    document.body.appendChild(msgBox);
    setTimeout(() => { if (msgBox) document.body.removeChild(msgBox); }, duration);
}

// =========================
// Fetch Questions (NO CHANGE - Your original API route)
// =========================
async function fetchQuestions() {
    try {
        const res = await fetch(`https://quizy-proctor.onrender.com/api/questions/${brandCode}/${encodeURIComponent(subject)}`);
        const response = await res.json();
        if (response.ok && response.data) {
            allQuestion = response.data;
            total = allQuestion.length;
            document.getElementById("subject-title").textContent = subject;
            createNavigation();
            getQuestionFunc();
            startExamTimer();
        } else {
            throw new Error(response.error || "Failed to load questions");
        }
    } catch (err) {
        console.error("Error fetching questions:", err);
        showOnScreenMessage("Failed to load questions!");
    }
}

// =========================
// Submit Quiz (NO CHANGE - Your original code)
// =========================
function submitFunc() {
    fetch('https://quizy-proctor.onrender.com/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            brandCode: brandCode,
            enrollment: enrollment,
            name: studentName,
            subject: subject,
            rightAns: right,
            wrongAns: wrong,
            maxMark: total,
        })
    }).then(res => res.json())
      .then(data => {
        if (data.ok) {
            showOnScreenMessage("✅ Quiz submitted successfully!");
            setTimeout(() => { 
                sessionStorage.clear(); 
                window.location = "../homepage/homepage.html"; 
            }, 2000);
        } else {
            throw new Error(data.error || "Failed to submit results");
        }
    }).catch(err => {
        console.error(err);
        showOnScreenMessage("Error submitting quiz results.");
    });
}

// =========================
// Quiz Logic
// =========================
function getQuestionFunc() {
    updateNavigation();
    if (index >= total) return endQuiz();
    
    let data = allQuestion[index];
    const questionTextEl = document.getElementById("question-text");
    const optionsListEl = document.getElementById("options-list");
    
    questionTextEl.innerHTML = `Q-${index + 1}: ${data.question}`;
    optionsListEl.innerHTML = ""; // Clear previous options

    const options = [
        { text: data.optionOne, value: 'option-1' },
        { text: data.optionTwo, value: 'option-2' },
        { text: data.optionThree, value: 'option-3' },
        { text: data.optionFour, value: 'option-4' }
    ];

    options.forEach(opt => {
        optionsListEl.innerHTML += `
            <div class="option">
                <label>
                    <input type="radio" class="option-input" value="${opt.value}" name="option">
                    ${opt.text}
                </label>
            </div>
        `;
    });
    
    if (allQuestion[index].answered) {
        // If question was already answered, check the saved answer
        document.querySelectorAll(".option-input").forEach(input => {
            if (input.value === allQuestion[index].selectedAnswer) {
                input.checked = true;
            }
        });
        lockAnswers();
    }
}

// in quiz.js

document.getElementById("next-btn").onclick = function () {
    let ans = getAnswer();
    if (ans === undefined) { 
        showOnScreenMessage("Please select an option before submitting!"); 
        return; 
    }
    allQuestion[index].selectedAnswer = ans;

    // This logic was here before and is correct
    if (!allQuestion[index].answered) {
        if (ans.trim().toLowerCase() === allQuestion[index].correctAnswer.trim().toLowerCase()) {
            right++;
        } else {
            wrong++;
        }
    }

    allQuestion[index].answered = true;
    lockAnswers();
    updateNavigation();

    // --- THIS IS THE CORRECTED LOGIC ---
    if (index < total - 1) { 
        // If it's not the last question, move to the next one
        index++;
        setTimeout(getQuestionFunc, 200); // A small delay for a smoother feel
    } else { 
        // If it IS the last question, end the quiz to show the final submit screen
        setTimeout(endQuiz, 200);
    }
};

function endQuiz() {
    clearInterval(examTimer);
    document.getElementById("quiz-box").innerHTML = `
        <div class="quiz-body text-center p-5">
            <h2>Click Submit to finish your exam.</h2>
            <button class="btn btn-success mt-3 quiz-submit-btn" style="padding: 10px 25px; font-size: 1.2rem;">Submit</button>
        </div>
    `;
    document.querySelector(".quiz-submit-btn").onclick = submitFunc;
}

const getAnswer = () => {
    let answer;
    document.querySelectorAll(".option-input").forEach(input => {
        if (input.checked) answer = input.value;
    });
    return answer;
};

// Replace your old lockAnswers function with this one
function lockAnswers() {
    document.querySelectorAll(".option").forEach(optionDiv => {
        const input = optionDiv.querySelector('.option-input');
        input.disabled = true;
        
        if (input.checked) {
            // Add a special class to the container of the selected answer
            optionDiv.classList.add('selected-answer'); 
        } else {
            // Add a class to fade out the unselected answers
            optionDiv.classList.add('disabled-option');
        }
    });
}


// =========================
// Navigation UI (CHANGED)
// =========================
// CHANGED: We now get the container from the HTML instead of creating it
const navContainer = document.getElementById("question-nav-buttons");

function createNavigation() {
    navContainer.innerHTML = ""; // Clear any existing buttons
    for (let i = 0; i < total; i++) {
        let btn = document.createElement("button");
        btn.innerText = i + 1;
        btn.onclick = () => { 
            index = i; 
            getQuestionFunc(); 
        };
        navContainer.appendChild(btn);
    }
}

function updateNavigation() {
    if (!navContainer) return;
    navContainer.querySelectorAll("button").forEach((btn, i) => {
        btn.className = ""; // Reset classes

        if (allQuestion[i]?.answered) {
            btn.classList.add('answered');
        }
        if (i === index) {
            btn.classList.add('current');
        }
    });
}

// =========================
// Proctoring & Other Logic (NO CHANGE)
// =========================
let examTimer;

function startExamTimer() {
    let examTimeLeft = total * 30; // 30 seconds per question
    let timerEl = document.getElementById("exam-timer");
    
    clearInterval(examTimer);
    timerEl.innerText = `Time Left: ${examTimeLeft}s`;
    examTimer = setInterval(() => {
        examTimeLeft--;
        const minutes = Math.floor(examTimeLeft / 60);
        const seconds = examTimeLeft % 60;
        timerEl.innerText = `Time Left: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        if (examTimeLeft <= 0) {
            clearInterval(examTimer);
            showOnScreenMessage("Time's up!");
            endQuiz();
        }
    }, 1000);
}

// All remaining functions from your original file are preserved below
async function startCamera() {
    // ===== Create container for camera feed (with updated styles to match the theme) =====
    let cameraContainer = document.createElement('div');
    cameraContainer.style.cssText =
        'position:fixed; top:10px; right:10px; width:220px; height:180px; border:2px solid var(--border-color); background:black; z-index:9999; border-radius: 10px; overflow: hidden;';
    document.body.appendChild(cameraContainer);

    let videoEl = document.createElement('video');
    videoEl.style.cssText = 'width:100%; height:100%; transform: scaleX(-1); object-fit: cover;'; // Mirrored view
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    cameraContainer.appendChild(videoEl);

    // Canvas overlay for gaze indicator
    let canvasEl = document.createElement('canvas');
    canvasEl.width = 220;
    canvasEl.height = 180;
    canvasEl.style.cssText = 'position:absolute; top:0; left:0;';
    cameraContainer.appendChild(canvasEl);
    let ctx = canvasEl.getContext('2d');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoEl.srcObject = stream;

        let faceWarningCount = 0;
        let gazeWarningCount = 0;
        let lastFaceWarningTime = 0;
        let lastGazeWarningTime = 0;

        // ===== Initialize Face Mesh =====
        const faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        faceMesh.setOptions({
            // --- THIS IS THE FIX ---
            maxNumFaces: 2, // Changed from 1 to 2 to allow detection of a second person
            // -----------------------
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults((results) => {
            const now = Date.now();
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

            const noFace = !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0;
            const multipleFaces = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 1;

            // ===== Face warnings =====
            if ((noFace || multipleFaces) && now - lastFaceWarningTime > 3000) {
                faceWarningCount++;
                lastFaceWarningTime = now;

                let msg = noFace ? "No face detected!" : "Multiple faces detected!";
                showOnScreenMessage(`⚠️ Warning ${faceWarningCount}/3: ${msg}`);

                if (faceWarningCount >= 3) {
                    showOnScreenMessage("❌ Test submitted due to face violations!");
                    endQuiz(true);
                    return;
                }
            }

            // ===== Eye-gaze detection =====
            if (!noFace && results.multiFaceLandmarks.length === 1) {
                const landmarks = results.multiFaceLandmarks[0];
                const leftIris = landmarks[468];
                const rightIris = landmarks[473];
                const leftEye = landmarks[33];
                const rightEye = landmarks[263];

                const gazeX = (leftIris.x + rightIris.x) / 2;
                const leftThreshold = leftEye.x + 0.44 * (rightEye.x - leftEye.x);
                const rightThreshold = leftEye.x + 0.55 * (rightEye.x - leftEye.x);
                const lookingAway = gazeX < leftThreshold || gazeX > rightThreshold;

                if (lookingAway && now - lastGazeWarningTime > 3000) {
                    gazeWarningCount++;
                    lastGazeWarningTime = now;
                    showOnScreenMessage(`⚠️ Warning ${gazeWarningCount}/3: Eyes looking away!`);

                    if (gazeWarningCount >= 3) {
                        showOnScreenMessage("❌ Test submitted due to gaze violations!");
                        endQuiz(true);
                        return;
                    }
                }
            }
        });

        // ===== MediaPipe Camera Utils =====
        const mpCamera = new Camera(videoEl, {
            onFrame: async () => await faceMesh.send({ image: videoEl }),
            width: 320,
            height: 240
        });
        mpCamera.start();

        stream.getVideoTracks()[0].onended = () => {
            showOnScreenMessage("Camera lost! Submitting test.", 4000);
            setTimeout(() => endQuiz(true), 3000);
        };

    } catch (error) {
        alert("Camera access is required for the test.");
        window.location = "../homepage/homepage.html";
    }
}

async function checkAttempt() {
    try {
        const res = await fetch(`https://quizy-proctor.onrender.com/api/checkAttempt/${brandCode}/${encodeURIComponent(subject)}/${encodeURIComponent(enrollment)}`);
        const data = await res.json();
        if (data.attempted) {
            showOnScreenMessage("❌ You have already attempted this test!", 4000);
            setTimeout(() => {
                window.location = "../homepage/homepage.html";
            }, 4000);
            return false;
        }
        return true;
    } catch (err) {
        console.error("Error checking test attempt:", err);
        showOnScreenMessage("Error checking test status!");
        return false;
    }
}

async function startAudioDetection() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const microphone = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        microphone.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let audioWarningCount = 0;
        let lastWarningTime = 0;
        function detectNoise() {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            const now = Date.now();
            if (average > 30 && now - lastWarningTime > 3000) {
                audioWarningCount++;
                lastWarningTime = now;
                showOnScreenMessage(`⚠️ Warning ${audioWarningCount}/3: Noise detected!`);
                if (audioWarningCount >= 3) {
                    showOnScreenMessage("❌ Test submitted due to excessive noise!");
                    endQuiz();
                    return;
                }
            }
            requestAnimationFrame(detectNoise);
        }
        detectNoise();
    } catch (error) {
        console.error("Microphone access error:", error);
    }
}

function enableFullScreen() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        tabSwitchCount++;
        showOnScreenMessage(`Warning ${tabSwitchCount}/2: Do not switch tabs!`);
        if (tabSwitchCount >= 2) {
            showOnScreenMessage("Test submitted due to tab switching!");
            endQuiz();
        }
    }
});

document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
        showOnScreenMessage("You must stay in fullscreen mode!", 4000);
        setTimeout(endQuiz, 3000);
    }
});

document.addEventListener("DOMContentLoaded", function () {
    let overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); color:white; display:flex; align-items:center; justify-content:center; z-index:9999;";
    let overlayHTML = `
        <div style="text-align:center; padding: 30px; background: #282b30; border-radius: 10px;">
            <h2 style="margin-bottom: 20px;">Confirm Student ID to Start Test</h2>
            <input 
                type="text" 
                id="enrollment-input" 
                placeholder="Enter Student Enrollment ID" 
                style="padding: 10px; margin-bottom: 20px; border-radius: 5px; border: 1px solid #7289da; width: 250px; color: #1e2124;"
                value="${enrollment}"
            >
            <button id="start-test-btn" style="padding:10px 20px; font-size: 1.2em; cursor:pointer; background: #7289da; color: white; border: none; border-radius: 5px;">Start Test</button>
        </div>
    `;
    overlay.innerHTML = overlayHTML;
    document.body.appendChild(overlay);

    document.getElementById("start-test-btn").onclick = async function () {
        const inputElement = document.getElementById("enrollment-input");
        const currentEnrollment = inputElement ? inputElement.value.trim() : "";
        if (!currentEnrollment) {
            swal("Error", "Please enter your Enrollment ID to start the quiz.", "error");
            return;
        }
        enrollment = currentEnrollment;
        sessionStorage.setItem("enrollment", currentEnrollment);
        const canStart = await checkAttempt();
        if (!canStart) return;
        document.body.removeChild(overlay);
        enableFullScreen();
        await startCamera();
        startAudioDetection();
        fetchQuestions();
    };
});