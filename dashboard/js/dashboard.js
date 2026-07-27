/* ====== Teacher Dashboard JS (Final Version with All Functions) ======
    This file is dedicated to the Teacher's Dashboard.
    All data and functions are scoped to the logged-in teacher.
========================================*/

// ---------------------- API helpers ----------------------
// These functions use standard browser 'fetch' and do not use Node.js 'require'.
const API_BASE = "https://quizy-proctor.onrender.com/api";

async function apiGet(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    // Check if the response was successful before proceeding
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("API GET error:", err, path);
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error("API POST error:", err, path, body);
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

async function apiPut(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error("API PUT error:", err, path, body);
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

async function apiDelete(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE"
    });
    return await res.json();
  } catch (err) {
    console.error("API DELETE error:", err, path);
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

// ---------------------- authentication & initial data check ----------------------
const brandCode = sessionStorage.getItem("brandCode");
const userRole = sessionStorage.getItem("userRole");
const teacherId = sessionStorage.getItem("userId");
const teacherName = sessionStorage.getItem("userName");

if (!brandCode || userRole !== 'teacher' || !teacherId) {
  document.body.innerHTML = "";
  document.body.style.background = "black";
  swal("Unauthorized Access!", "You must be logged in as a teacher.", "warning")
    .then(() => { window.location = "../homepage/homepage.html"; });
  throw new Error("Not a logged-in teacher.");
}

let allUserData = null; 
(async function loadBrand() {
  const r = await apiGet(`/brand/${encodeURIComponent(brandCode)}`);
  if (r.ok) {
    allUserData = r.data;
    const brandNameEl = document.getElementById("brand-name");
    if (brandNameEl) {
        brandNameEl.innerHTML = "Welcome Teacher: " + (teacherName || "");
    }
  } else {
    console.error("Failed to load brand:", r.error);
  }
})();

// ---------------------- logout & UI Toggler ----------------------
document.getElementById("logout-btn").onclick = function () {
    this.innerHTML = "Logging out...";
    this.disabled = true;
    sessionStorage.clear();
    setTimeout(() => { window.location = "../company/company.html"; }, 1000);
};

const sideNav = document.querySelector(".side-nav");
const toggler = document.querySelector(".toggler-icon");
if(toggler && sideNav) {
    toggler.onclick = function() {
        sideNav.classList.toggle('active');
    };
}

// ---------------------- SUBJECTS management ----------------------
const visibleSubject = document.querySelector(".visible-subject");
const subjectBtn = document.querySelector(".subject-btn");
const subjectEl = document.querySelector(".subject");
let allSubject = []; 

async function refreshSubjects() {
  // Ensure teacherId is treated as a string for URL, although the backend expects INT
  const r = await apiGet(`/teacher/subjects/${teacherId}`); 
  if (r.ok) {
    allSubject = r.data || [];
    renderSubjects();
    populateChooseSubject();
    const subjectCountEl = document.getElementById('subject-count');
    if (subjectCountEl) subjectCountEl.textContent = allSubject.length;
  } else {
    console.error("Failed to fetch subjects:", r.error);
  }
}

function renderSubjects() {
  if(!visibleSubject) return;
  visibleSubject.innerHTML = "";
  allSubject.forEach((s) => {
    const html = `
      <div class="d-flex subject-box justify-content-between align-items-center p-2 border-bottom" data-id="${s.id}">
          <h5>${escapeHtml(s.subjectName)}</h5>
          <div>
              <i class="fa fa-edit edit-btn mx-2" style="cursor:pointer; color: #3498db;"></i>
              <i class="fa fa-save save-btn mx-2 d-none" style="cursor:pointer; color: #2ecc71;"></i>
              <i class="fa fa-trash del-btn mx-2" style="cursor:pointer; color: #e74c3c;"></i>
          </div>
      </div>
    `;
    visibleSubject.insertAdjacentHTML("beforeend", html);
  });
  attachSubjectHandlers();
}

function attachSubjectHandlers() {
  if(!visibleSubject) return;
  
  visibleSubject.querySelectorAll(".del-btn").forEach(btn => {
    btn.onclick = async function () {
      const parent = this.closest(".subject-box");
      const id = parent.dataset.id;
      swal({ title: "Are you sure?", text: "This will delete the subject.", icon: "warning", buttons: true, dangerMode: true})
      .then(async (willDelete) => {
        if (willDelete) {
            const res = await apiDelete(`/subjects/${id}`);
            if (!res.ok) return swal("Error", res.error || "Failed to delete", "error");
            await refreshSubjects();
            swal("Deleted!", "Subject has been removed.", "success");
        }
      });
    };
  });

  visibleSubject.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.onclick = function () {
      const parent = this.closest(".subject-box");
      const h5 = parent.querySelector("h5");
      const saveBtn = parent.querySelector(".save-btn");
      h5.contentEditable = true;
      h5.focus();
      h5.style.border = "1px solid #3498db";
      h5.style.padding = "5px";
      this.classList.add("d-none");
      saveBtn.classList.remove("d-none");

      saveBtn.onclick = async function () {
        const editedSub = h5.innerText.trim();
        const id = parent.dataset.id;
        if (!editedSub) return;
        const res = await apiPut(`/subjects/${id}`, { subjectName: editedSub, teacherId });
        if (!res.ok) return swal("Error", res.error || "Failed to update", "error");
        
        h5.contentEditable = false;
        h5.style.border = "none";
        h5.style.padding = "0";
        saveBtn.classList.add("d-none");
        btn.classList.remove("d-none");
        await refreshSubjects();
        swal("Updated", "Subject updated successfully", "success");
      };
    };
  });
}

if(subjectBtn) {
    subjectBtn.onclick = async function (e) {
      e.preventDefault();
      const value = subjectEl.value && subjectEl.value.trim();
      if (!value) return swal("Subject is Empty !", "Please Enter Subject !", "warning");
      const res = await apiPost("/teacher/subjects", { brandCode, subjectName: value, teacherId });
      if (res.ok) {
        subjectEl.value = "";
        await refreshSubjects();
        swal("Success!", "Subject added", "success");
      } else {
        swal("Error", res.error || "Failed to add subject", "warning");
      }
    };
}


// ---------------------- QUESTIONS management ----------------------
const chooseSubject = document.querySelector("#choose-subject");
const questionForm = document.querySelector(".question-form");
const selectSubject = document.querySelector("#select-subject");
const subjectResultEl = document.querySelector("#subject-result-el");
let newQuestions = [];
const visibleQuestion = document.querySelector(".visible-question");

function populateChooseSubject() {
  const selects = [chooseSubject, selectSubject, subjectResultEl];
  selects.forEach(sel => {
    if (sel) sel.innerHTML = `<option value="">Choose Subject</option>`;
  });

  allSubject.forEach(s => {
    const opt = `<option value="${escapeHtml(s.subjectName)}">${escapeHtml(s.subjectName)}</option>`;
    selects.forEach(sel => {
        if(sel) sel.insertAdjacentHTML("beforeend", opt);
    });
  });
}

async function fetchQuestionsFor(subjectName) {
  // NOTE: The API should handle filtering by teacherId, but this client-side filter is fine too if the API returns too much data.
  const r = await apiGet(`/questions/${encodeURIComponent(brandCode)}/${encodeURIComponent(subjectName)}`); 
  if (r.ok) {
    // Filter questions client-side to only show teacher's questions
    newQuestions = r.data.filter(q => q.teacherId == teacherId) || []; 
    renderQuestions();
  } else {
    console.error("Failed to fetch questions:", r.error);
    if(visibleQuestion) visibleQuestion.innerHTML = "<p class='text-danger'>Failed to load questions or No Data Available!</p>";
  }
}
function renderQuestions() {
    if(!visibleQuestion) return;

    if (!newQuestions || newQuestions.length === 0) {
        visibleQuestion.innerHTML = "<p class='text-center mt-3'>No questions for this subject.</p>";
        return;
    }

    // Build the entire HTML for all questions in a single string
    let questionsHTML = "";
    newQuestions.forEach((q, index) => {
        questionsHTML += `
            <div class="mb-4 p-3 border-bottom" data-id="${q.id}">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="question-text mb-0">${index + 1}) ${escapeHtml(q.question)}</h5>
                    <div>
                        <i class="fa fa-edit edit-question-btn mx-2" style="cursor:pointer; color: #3498db;"></i>
                        <i class="fa fa-save save-question-btn d-none mx-2" style="cursor:pointer; color: #2ecc71;"></i>
                        <i class="fa fa-trash del-question-btn mx-2" style="cursor:pointer; color: #e74c3c;"></i>
                    </div>
                </div>
                <div class="options-container mt-3" style="font-size: 0.9rem; padding-left: 25px;">
                    <span class="option-text d-block">1) ${escapeHtml(q.optionOne)}</span>
                    <span class="option-text d-block">2) ${escapeHtml(q.optionTwo)}</span>
                    <span class="option-text d-block">3) ${escapeHtml(q.optionThree)}</span>
                    <span class="option-text d-block">4) ${escapeHtml(q.optionFour)}</span>
                    <span class="d-block mt-2">
                        Correct Answer: <span class="correct-answer badge bg-success">${escapeHtml(q.correctAnswer)}</span>
                    </span>
                </div>
            </div>
        `;
    });

    // Set the container's HTML all at once
    visibleQuestion.innerHTML = questionsHTML;

    // Re-attach the click handlers to the new buttons
    attachQuestionHandlers();
}

function attachQuestionHandlers() {
    if(!visibleQuestion) return;

    visibleQuestion.querySelectorAll(".del-question-btn").forEach(btn => {
        btn.onclick = function () {
            const parent = this.closest("[data-id]");
            const qId = parent.dataset.id;
            swal({ title: "Are you sure?", text: "This will permanently delete the question.", icon: "warning", buttons: true, dangerMode: true,
            }).then(async (willDelete) => {
                if (willDelete) {
                    const res = await apiDelete(`/questions/${qId}`);
                    if (!res.ok) return swal("Error", res.error || "Failed to delete question.", "error");
                    await fetchQuestionsFor(selectSubject.value);
                    swal("Deleted!", "Question has been removed.", "success");
                }
            });
        };
    });

    visibleQuestion.querySelectorAll(".edit-question-btn").forEach(btn => {
        btn.onclick = function () {
            const parent = this.closest("[data-id]");
            const saveBtn = parent.querySelector(".save-question-btn");
            const questionTextEl = parent.querySelector(".question-text");
            const optionSpans = parent.querySelectorAll(".option-text");
            const answerSpan = parent.querySelector(".correct-answer");

            this.classList.add("d-none");
            saveBtn.classList.remove("d-none");

            [questionTextEl, ...optionSpans, answerSpan].forEach(el => {
                el.contentEditable = true;
                el.style.border = "1px solid #3498db";
                el.style.padding = "5px";
                el.style.borderRadius = "5px";
            });
            questionTextEl.focus();

            saveBtn.onclick = async function () {
                const qId = parent.dataset.id;
                const index = Array.from(parent.parentElement.children).indexOf(parent);
                const updatedQuestion = {
                    // Need to correctly strip the index from the innerText
                    question: questionTextEl.innerText.replace(`${index + 1}) `, "").trim(),
                    optionOne: optionSpans[0].innerText.replace('1) ', '').trim(),
                    optionTwo: optionSpans[1].innerText.replace('2) ', '').trim(),
                    optionThree: optionSpans[2].innerText.replace('3) ', '').trim(),
                    optionFour: optionSpans[3].innerText.replace('4) ', '').trim(),
                    correctAnswer: answerSpan.innerText.trim()
                };
                const res = await apiPut(`/questions/${qId}`, updatedQuestion);

                if (res.ok) {
                    [questionTextEl, ...optionSpans, answerSpan].forEach(el => {
                        el.contentEditable = false;
                        el.style.border = "none";
                        el.style.padding = ""; // Reset padding
                    });
                    saveBtn.classList.add("d-none");
                    btn.classList.remove("d-none");
                    swal("Success!", "Question updated.", "success");
                } else {
                    swal("Error", res.error || "Failed to update question.", "error");
                }
            };
        };
    });
}


if (questionForm) {
    questionForm.onsubmit = async (e) => {
        e.preventDefault();
        const subjectName = chooseSubject.value;
        if (!subjectName) return swal("Choose Subject!", "Please Select a Subject.", "warning");
        const q = {
            brandCode, subjectName, teacherId,
            question: document.querySelector("#question").value,
            optionOne: document.querySelector("#option-one").value,
            optionTwo: document.querySelector("#option-two").value,
            optionThree: document.querySelector("#option-three").value,
            optionFour: document.querySelector("#option-four").value,
            correctAnswer: document.querySelector("#correct-answer").value
        };
        const res = await apiPost("/teacher/questions", q);
        if (res.ok) {
            swal("Success!", "Question added successfully!", "success");
            questionForm.reset();
            if(selectSubject.value === subjectName) await fetchQuestionsFor(subjectName);
        } else {
            swal("Error", res.error || "Failed to add question.", "error");
        }
    };
}

if (selectSubject) {
  selectSubject.onchange = async () => {
    const value = selectSubject.value;
    if (value) {
      await fetchQuestionsFor(value);
    } else {
      if(visibleQuestion) visibleQuestion.innerHTML = "";
    }
  };
}

// ---------------------- STUDENT management (Scoped for Teachers) ----------------------
const registrationForm = document.querySelector(".registration-form");
const userTypeEl = registrationForm ? registrationForm.querySelector("#choose-type") : null;
const registrationDataEl = document.querySelector(".registration-data");
let modalImgUrl = null;
let registrationData = [];

async function refreshRegistrations() {
  const response = await apiGet(`/teacher/students/${teacherId}`);
  if (response.ok) {
    registrationData = response.data || [];
    renderRegistrations();
    const studentCountEl = document.getElementById('student-count');
    if (studentCountEl) studentCountEl.textContent = registrationData.length;
  } else {
    console.error("Failed to fetch students:", response.error);
    if(registrationDataEl) registrationDataEl.innerHTML = `<tr><td colspan="11" class="text-danger text-center">Could not load student data.</td></tr>`;
  }
}

function renderRegistrations() {
    if (!registrationDataEl) return;

    // First, handle the case where there are no students
    if (registrationData.length === 0) {
        registrationDataEl.innerHTML = `<tr><td colspan="11" class="text-center">You have not registered any students yet.</td></tr>`;
        return;
    }

    // Build the entire table HTML in a string first
    let tableHTML = "";
    registrationData.forEach((student, index) => {
        tableHTML += `
            <tr data-id="${student.id}">
                <th>${index + 1}</th>
                <td><img src="${escapeHtml(student.profilePic || 'images/avtar.png')}" width="40" height="40" alt="Profile" class="rounded-circle"></td>
                <td>${escapeHtml(student.name)}</td>
                <td>${escapeHtml(student.fatherName)}</td>
                <td>${escapeHtml(formatDate(student.dob))}</td>
                <td>${escapeHtml(student.userType)}</td>
                <td>${escapeHtml(student.mobile)}</td>
                <td>${escapeHtml(student.enrollment)}</td>
                <td>******</td>
                <td>${escapeHtml(student.address)}</td>
                <td>
                    <i class='fa fa-trash del-student-btn mx-2' style="cursor:pointer; color: #e74c3c;"></i>
                    <i class='fa fa-eye edit-student-btn' data-bs-toggle="modal" data-bs-target="#myModal" style="cursor:pointer; color: #3498db;"></i>
                </td>
            </tr>
        `;
    });

    // Set the table body's HTML all at once
    registrationDataEl.innerHTML = tableHTML;

    // Re-attach the click handlers to the new buttons
    attachStudentRegistrationHandlers();
}

function attachStudentRegistrationHandlers() {
    if(!registrationDataEl) return;
    registrationDataEl.querySelectorAll(".del-student-btn").forEach(btn => {
        btn.onclick = function () {
            const parent = this.closest("tr");
            const id = parent.dataset.id;
            swal({
                title: "Are you sure?", text: "This student's record will be permanently deleted.",
                icon: "warning", buttons: true, dangerMode: true,
            }).then(async (willDelete) => {
                if (willDelete) {
                    const res = await apiDelete(`/registrations/${id}`);
                    if (!res.ok) return swal("Error", res.error || "Failed to delete student.", "error");
                    await refreshRegistrations();
                    swal("Deleted!", "Student record has been removed.", "success");
                }
            });
        };
    });

    registrationDataEl.querySelectorAll(".edit-student-btn").forEach(btn => {
        btn.onclick = function () {
            const id = this.closest("tr").dataset.id;
            const studentData = registrationData.find(s => s.id == id);
            if(!studentData) return;

            const modal = document.querySelector("#myModal");
            const modalForm = modal.querySelector(".modal-form");
            const allModalInput = modalForm.querySelectorAll("input");
            const modalTextarea = modalForm.querySelector("textarea");
            const uploadBox = modal.querySelector(".upload-box");
            
            if(uploadBox) uploadBox.style.backgroundImage = `url(${escapeHtml(studentData.profilePic || 'images/avtar.png')})`;
            allModalInput[0].value = studentData.name;
            allModalInput[1].value = studentData.fatherName;
            allModalInput[2].value = formatDate(studentData.dob);
            allModalInput[3].value = studentData.userType;
            allModalInput[4].value = studentData.mobile;
            allModalInput[5].value = studentData.enrollment;
            allModalInput[6].value = studentData.password;
            modalTextarea.value = studentData.address;

            allModalInput.forEach(i => i.disabled = true);
            modalTextarea.disabled = true;

            const modalEditBtn = modal.querySelector(".modal-edit");
            const modalUpdateBtn = modal.querySelector(".modal-updatte-btn");
            modalEditBtn.classList.remove("d-none");
            modalUpdateBtn.classList.add("d-none");

            modalEditBtn.onclick = () => {
                allModalInput.forEach(i => i.disabled = false);
                modalTextarea.disabled = false;
                modalEditBtn.classList.add("d-none");
                modalUpdateBtn.classList.remove("d-none");
            };

            modalUpdateBtn.onclick = async function () {
                const updatedData = {
                    name: allModalInput[0].value, fatherName: allModalInput[1].value,
                    dob: allModalInput[2].value, userType: allModalInput[3].value,
                    mobile: allModalInput[4].value, enrollment: allModalInput[5].value,
                    password: allModalInput[6].value, address: modalTextarea.value,
                    profilePic: modalImgUrl || studentData.profilePic 
                };
                
                swal({ title: "Are you sure?", text: "Update this student's record?", icon: "warning", buttons: true, dangerMode: true })
                .then(async (willUpdate) => {
                    if (willUpdate) {
                        const res = await apiPut(`/registrations/${id}`, updatedData);
                        if (!res.ok) return swal("Error", res.error || "Failed to update.", "error");
                        
                        const bootstrapModal = bootstrap.Modal.getInstance(modal);
                        bootstrapModal.hide();
                        await refreshRegistrations();
                        swal("Updated!", "Student record has been updated.", "success");
                    }
                });
            };
        };
    });
}


if (registrationForm) {
  if(userTypeEl) {
    userTypeEl.parentElement.style.display = 'none';
  }

  registrationForm.onsubmit = async function (e) {
    e.preventDefault();
    const data = {
      brandCode,
      name: document.querySelector("#name").value,
      fatherName: document.querySelector("#father").value,
      dob: document.querySelector("#dob").value,
      userType: 'student',
      mobile: document.querySelector("#mobile").value,
      enrollment: document.querySelector("#enrollment").value,
      password: document.querySelector("#password").value,
      address: document.querySelector("#address").value,
      teacherId: teacherId
    };
    const response = await apiPost("/teacher/students", data);
    if (response.ok) {
      swal("Student Registered!", "The student has been added to your class.", "success");
      registrationForm.reset();
      await refreshRegistrations();
    } else {
      swal("Error", response.error || "Failed to register student.", "warning");
    }
  };
}

// ---------------------- RESULTS & CERTIFICATE ----------------------
var allUserResultBox = document.querySelector(".subject-result-data");
// REPLACE the existing results block in dashboard.js with this one.

if (subjectResultEl) {
    subjectResultEl.addEventListener('change', async () => {
        if (!allUserResultBox) return;

        const statsRow = document.getElementById('results-stats-row');
        allUserResultBox.innerHTML = "<tr><td colspan='7' class='text-center'>Loading...</td></tr>";
        const subject = subjectResultEl.value;

        if (subject) {
            const response = await apiGet(`/teacher/results/${teacherId}/${encodeURIComponent(subject)}`);
            
            if (response.ok) {
                const stats = response.stats;
                const allResult = response.results || [];

                // --- Populate Stat Cards ---
                document.getElementById('stats-total').textContent = stats.totalStudents;
                document.getElementById('stats-passed').textContent = stats.passed;
                document.getElementById('stats-failed').textContent = stats.failed;
                document.getElementById('stats-highest').textContent = `${stats.highestScore} / ${stats.highestMaxMark}`;
                if (statsRow) statsRow.style.display = 'flex';

                // --- THIS IS THE CORRECTED PART THAT BUILDS THE TABLE ---
                // It ensures no extra elements are added.
                let tableHTML = ""; // Build the HTML in a variable first
                if (allResult.length === 0) {
                    tableHTML = `<tr><td colspan="7" class="text-center">No results found for this subject.</td></tr>`;
                } else {
                    allResult.forEach((data, index) => {
                        // This loop now creates clean <tr> elements without extra tags
                        tableHTML += `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${escapeHtml(data.name)}</td>
                                <td>${escapeHtml(data.enrollment)}</td>
                                <td>${escapeHtml(data.subject)}</td>
                                <td>${escapeHtml(data.rightAns)}</td>
                                <td>${escapeHtml(data.wrongAns)}</td>
                                <td>${escapeHtml(data.maxMark)}</td>
                            </tr>
                        `;
                    });
                }
                allUserResultBox.innerHTML = tableHTML; // Set the final, clean HTML

            } else {
                swal("Error", response.error || "Failed to fetch results.", "error");
                allUserResultBox.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading results.</td></tr>`;
                if (statsRow) statsRow.style.display = 'none';
            }
        } else {
            // Clear everything if no subject is selected
            allUserResultBox.innerHTML = "";
            if (statsRow) statsRow.style.display = 'none';
        }
    });
}


// ---------------------- Other Functions ----------------------
var uploadInput = document.querySelector(".upload-input");
if (uploadInput) {
  uploadInput.onchange = function () {
    var fReader = new FileReader();
    fReader.onload = function (e) {
      modalImgUrl = e.target.result;
      const uploadBox = document.querySelector('.upload-box');
      if (uploadBox) uploadBox.style.backgroundImage = `url(${modalImgUrl})`;
    };
    fReader.readAsDataURL(uploadInput.files[0]);
  };
}

// ---------------------- small helpers ----------------------
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toISOString().split("T")[0];
}

// ---------------------- INITIAL LOAD ----------------------
(async function init() {
  await refreshSubjects();
  await refreshRegistrations();
  populateChooseSubject();
})();
