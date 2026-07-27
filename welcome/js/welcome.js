// Global variables
var selectSubjectEl = document.querySelector("#select-subject-el");
var startQuizBtn = document.querySelector(".start-quiz-btn");
const brandCode = sessionStorage.getItem("brandCode");
// Get the logged-in student's data
const studentData = JSON.parse(sessionStorage.getItem("loggedInUser"));

// Ensure a student is logged in
if (!studentData || studentData.userType !== 'student') {
    swal("Unauthorized!", "You need to be logged in as a student.", "error")
        .then(() => window.location = "../homepage/homepage.html");
}

// Fetch subjects specifically for this student using their enrollment ID
fetch(`https://quizy-proctor.onrender.com/api/student/subjects/${studentData.enrollment}/${brandCode}`)
    .then(res => res.json())
    .then(response => {
        if (response.ok && response.data) {
            if (response.data.length === 0) {
                 selectSubjectEl.innerHTML += `<option value="" disabled>No subjects assigned yet</option>`;
                 return;
            }
            response.data.forEach(subject => {
                selectSubjectEl.innerHTML += `<option value="${subject.subjectName}">${subject.subjectName}</option>`;
            });
        } else {
            console.error("Failed to load subjects:", response.error);
        }
    })
    .catch(err => console.error("Error fetching subjects:", err));

// Start Quiz button logic
startQuizBtn.onclick = function () {
    const subjectName = selectSubjectEl.value;
    if (subjectName && subjectName !== "choose subject") {
        sessionStorage.setItem("subject", subjectName);

        // Overlay to start the test in fullscreen
        let overlay = document.createElement("div");
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); color: white; display: flex;
            align-items: center; justify-content: center; z-index: 9999;
        `;
        overlay.innerHTML = `
            <div style="text-align:center;">
                <h2>Click below to enter fullscreen mode and start your test.</h2>
                <button id="enter-fullscreen" style="padding:10px 20px; font-size:16px;">Start Test</button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById("enter-fullscreen").onclick = function () {
            document.body.removeChild(overlay);
            let elem = document.documentElement;
            if (elem.requestFullscreen) elem.requestFullscreen();
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
            
            // Redirect to the quiz page after a short delay
            setTimeout(() => window.location = "../quiz/quiz.html", 500);
        };
    } else {
        swal("No Subject Selected!", "Please choose a subject to begin.", "warning");
    }
};