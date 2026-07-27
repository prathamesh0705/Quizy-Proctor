// ===========================================
// == Admin-Only Dashboard JavaScript (Extended) ==
// ===========================================

// ---------------------- API helpers ----------------------
const API_BASE = "https://quizy-proctor.onrender.com/api";

async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    // Only parse JSON if the response status is OK (200-299)
    if (!res.ok) {
        throw new Error(`API call failed with status: ${res.status}`);
    }
    return await res.json();
}

async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return await res.json();
}

async function apiDelete(path) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "DELETE"
    });
    return await res.json();
}

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return "";
    return String(unsafe).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

// ---------------------- Auth & Logout ----------------------
const brandCode = sessionStorage.getItem("brandCode");

if (!brandCode) {
    document.body.innerHTML = "<h1>Unauthorized Access</h1>";
    swal("Unauthorized!", "You must be logged in as an admin.", "error")
        .then(() => window.location = "../company/company.html");
}

document.querySelector("#logout-btn").onclick = function () {
    sessionStorage.clear();
    window.location = "../company/company.html";
};

// ===============================================
// == UI Selectors
// ===============================================
const teacherForm = document.querySelector("#teacher-registration-form");
const teachersDataBody = document.querySelector("#teachers-data-body");

// ===============================================
// == Data Management Logic (Teacher) ==
// ===============================================

// ---------------------- Teacher Management Logic ----------------------
async function refreshTeachers() {
    if (!teachersDataBody) return;

    teachersDataBody.innerHTML = '<tr><td colspan="5" class="text-center text-info">Loading teachers...</td></tr>';
    try {
        // API endpoint: /teachers/[brandCode]
        const response = await apiGet(`/teachers/${brandCode}`);
        teachersDataBody.innerHTML = ""; 

        if (response.ok && response.data.length > 0) {
            response.data.forEach((teacher, index) => {
                const row = `
                    <tr data-id="${teacher.id}">
                        <td>${index + 1}</td>
                        <td>${escapeHtml(teacher.name)}</td>
                        <td>${escapeHtml(teacher.enrollment)}</td>
                        <td>${escapeHtml(teacher.mobile)}</td>
                        <td>
                            <i class="fa fa-trash del-teacher-btn text-danger" style="cursor:pointer;" title="Delete Teacher"></i>
                        </td>
                    </tr>
                `;
                teachersDataBody.insertAdjacentHTML("beforeend", row);
            });
        } else {
            teachersDataBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No teachers have been registered yet.</td></tr>';
        }
        attachTeacherDeleteHandlers();
    } catch(err) {
        console.error("Error loading teachers:", err);
        teachersDataBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">⚠️ **FAILED TO LOAD TEACHERS**: Network error or bad response.</td></tr>';
    }
}

if (teacherForm) {
    teacherForm.onsubmit = async (e) => {
        e.preventDefault();
        const teacherData = {
            brandCode: brandCode,
            name: document.querySelector("#teacher-name").value,
            mobile: document.querySelector("#teacher-mobile").value,
            enrollment: document.querySelector("#teacher-id").value,
            password: document.querySelector("#teacher-password").value,
        };

        const response = await apiPost("/teachers", teacherData);

        if (response.ok) {
            swal("Success!", "Teacher registered successfully.", "success");
            teacherForm.reset();
            refreshTeachers();
        } else {
            swal("Error", response.error || "Failed to register teacher.", "warning");
        }
    };
}

function attachTeacherDeleteHandlers() {
    teachersDataBody.querySelectorAll(".del-teacher-btn").forEach(btn => {
        btn.onclick = function() {
            const row = this.closest("tr");
            const teacherId = row.dataset.id;
            const teacherName = row.cells[1].innerText;

            swal({
                title: "Are you sure?",
                text: `You are about to delete the teacher: ${teacherName}. This cannot be undone.`,
                icon: "warning",
                buttons: true,
                dangerMode: true,
            }).then(async (willDelete) => {
                if (willDelete) {
                    const response = await apiDelete(`/teachers/${teacherId}`);
                    if (response.ok) {
                        swal("Deleted!", "Teacher has been removed.", "success");
                        refreshTeachers();
                    } else {
                        swal("Error", response.error || "Could not delete teacher.", "error");
                    }
                }
            });
        };
    });
}

// ---------------------- Initialization ----------------------
document.addEventListener("DOMContentLoaded", function () {
    // Initial load for the default view (Teachers)
    refreshTeachers();
});