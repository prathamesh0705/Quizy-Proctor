/* start form control coding */
var signupBtn = document.querySelector(".signup-btn");
var loginBtn = document.querySelector(".login-btn");
var loginBox = document.querySelector(".login-box");
var signupBox = document.querySelector(".signup-box");

signupBtn.onclick = function () {
    signupBox.classList.add("active");
    loginBox.classList.remove("active");
    loginBtn.classList.remove("d-none");
    signupBtn.classList.add("d-none");
};

loginBtn.onclick = function () {
    signupBox.classList.remove("active");
    loginBox.classList.add("active");
    loginBtn.classList.add("d-none");
    signupBtn.classList.remove("d-none");
};

// start register coding
var registerForm = document.querySelector(".signup-form");
var allInput = registerForm.querySelectorAll("INPUT");
var textArea = registerForm.querySelector("textarea");

registerForm.onsubmit = function (e) {
    e.preventDefault();
    registrationData();
};

const registrationData = () => {
    const userData = {
        brandCode: allInput[0].value,
        brandName: allInput[1].value,
        website: allInput[2].value,
        contact: allInput[3].value,
        address: textArea.value,
        username: allInput[4].value,
        password: allInput[5].value
    };

    fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
    })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                registerForm.reset();
                swal("Registration Done ", "Please Sign in !", "success");
            } else {
                swal("Change Brand Code ", data.error || "This Brand Code Is Already Taken !", "warning");
            }
        })
        .catch(err => {
            console.error(err);
            swal("Error", "Something went wrong!", "error");
        });
};

// start signin coding
var signinBtn = document.querySelector(".signin-btn");
var brandCode = document.querySelector("#brand-code");
var username = document.querySelector("#username");
var password = document.querySelector("#password");

signinBtn.onclick = function (e) {
    e.preventDefault();
    if (brandCode.value && username.value && password.value !== "") {
        fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                brandCode: brandCode.value,
                username: username.value,
                password: password.value
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    signinBtn.innerHTML = "Please Wait...";
                    signinBtn.disabled = true;
                    setTimeout(function () {
                        // UPDATED REDIRECT LOCATION
                        window.location = "../admin/admin_dashboard.html"; 
                        sessionStorage.setItem("brandCode", brandCode.value);
                    }, 2000); // Reduced delay slightly
                } else {
                    swal("Login Failed!", data.error, "warning");
                }
            })
            .catch(err => {
                console.error(err);
                swal("Error", "Something went wrong!", "error");
            });
    } else {
        swal("Empty Field !", "Please Fill All The Fields", "warning");
    }
};