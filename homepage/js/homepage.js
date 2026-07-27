// Get all brand codes from the database
const brandCodeEl = document.querySelector("#brand-code-el");

fetch("https://quizy-proctor.onrender.com/api/brands")
    .then(res => res.json())
    .then(data => {
        data.forEach(brand => {
            brandCodeEl.innerHTML += `<option value="${brand.brandCode}">${brand.brandCode}</option>`;
        });
    })
    .catch(err => {
        console.error(err);
        swal("Error", "Failed to load brand codes!", "error");
    });

// Global variables
const loginForm = document.querySelector(".login-form");
const allLoginInput = loginForm.querySelectorAll("input");
const loginBtn = loginForm.querySelector("button");
let brandCode;

// When user selects a brand
brandCodeEl.addEventListener("change", () => {
    if (brandCodeEl.value !== "choose space code") {
        allLoginInput[0].disabled = false;
        allLoginInput[1].disabled = false;
        loginBtn.disabled = false;
        brandCode = brandCodeEl.value;
    } else {
        allLoginInput[0].disabled = true;
        allLoginInput[1].disabled = true;
        loginBtn.disabled = true;
        brandCode = null;
    }
});

// Secure login form submission
loginForm.onsubmit = function (e) {
    e.preventDefault();
    if (!brandCode) {
        swal("Please select a college code!", "", "warning");
        return;
    }

    const enrollmentValue = allLoginInput[0].value;
    const passwordValue = allLoginInput[1].value;

    fetch(`https://quizy-proctor.onrender.com/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            brandCode: brandCode,
            enrollment: enrollmentValue,
            password: passwordValue
        })
    })
    .then(res => res.json())
    .then(response => {
        if (response.ok) {
            const user = response.user;

            if (user.userType === 'teacher') {
                // Teacher logs in -> go to their dashboard
                sessionStorage.setItem("brandCode", brandCode);
                sessionStorage.setItem("userRole", "teacher"); 
                sessionStorage.setItem("userName", user.name);
                sessionStorage.setItem("userId", user.id);
                window.location = "../dashboard/dashboard.html";

            } else if (user.userType === 'student') {
                // Student logs in -> go to the quiz welcome page
                // ++ CORRECTED: Save the entire user object as a single item ++
                sessionStorage.setItem("loggedInUser", JSON.stringify(user));
                sessionStorage.setItem("brandCode", brandCode);
                window.location = "../welcome/welcome.html";
            } else {
                 swal("Login Failed!", "Your account has an unknown role.", "warning");
            }
        } else {
            swal("Login Failed!", response.error, "warning");
        }
    })
    .catch(err => {
        console.error(err);
        swal("Error", "Could not connect to the server!", "error");
    });
};