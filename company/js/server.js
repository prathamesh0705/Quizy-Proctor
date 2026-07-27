console.log("--- SERVER.JS (FINALIZED VERSION - CLEAN) IS RUNNING ---");

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./db"); // your db.js connection

const app = express();
app.use(cors({
    origin: [
        "https://quizy-proctor.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
// Increase the limit to accept larger data, like images
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// =================================================================
// == BRAND & COMPANY ROUTES ==
// =================================================================

// Get all brand codes for homepage dropdown
app.get("/api/brands", (req, res) => {
    const sql = "SELECT brand_code FROM brands";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("SQL Error in /api/brands:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        const mappedResults = results.map(item => ({ brandCode: item.brand_code }));
        res.json(mappedResults);
    });
});

// Get a specific brand's details
app.get("/api/brand/:brandCode", (req, res) => {
    const { brandCode } = req.params;
    const sql = "SELECT brand_name, address FROM brands WHERE brand_code = ?";
    db.query(sql, [brandCode], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/brand/:brandCode:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        if (results.length > 0) {
            const brandData = {
                brandName: results[0].brand_name,
                address: results[0].address
            };
            res.json({ ok: true, data: brandData });
        } else {
            res.status(404).json({ ok: false, error: "Brand not found" });
        }
    });
});

// Brand (Company) Registration
app.post("/api/register", (req, res) => {
    const { brandCode, brandName, website, contact, address, username, password } = req.body;
    const sql = "INSERT INTO brands (brand_code, brand_name, website, contact, address, username, password) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [brandCode, brandName, website, contact, address, username, password], (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.json({ ok: false, error: "Brand Code already taken" });
            }
            console.error("SQL Error in /api/register:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true });
    });
});

// Brand (Company) Login
app.post("/api/login", (req, res) => {
    const { brandCode, username, password } = req.body;
    const sql = "SELECT * FROM brands WHERE brand_code = ? AND username = ? AND password = ?";
    db.query(sql, [brandCode, username, password], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/login:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        if (results.length > 0) {
            res.json({ ok: true });
        } else {
            res.json({ ok: false, error: "Invalid credentials" });
        }
    });
});

// =================================================================
// == SUBJECT ROUTES ==
// =================================================================

// Get all subjects for a brand
app.get("/api/subjects/:brandCode", (req, res) => {
    const { brandCode } = req.params;
    const sql = "SELECT id, subject_name FROM subjects WHERE brand_code = ?";
    db.query(sql, [brandCode], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/subjects/:brandCode:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        const mappedResults = results.map(s => ({
            id: s.id,
            subjectName: s.subject_name
        }));
        res.json({ ok: true, data: mappedResults });
    });
});

// Add a new subject
app.post("/api/subjects", (req, res) => {
    const { brandCode, subjectName } = req.body;
    const sql = "INSERT INTO subjects (brand_code, subject_name) VALUES (?, ?)";
    db.query(sql, [brandCode, subjectName], (err, result) => {
        if (err) {
            console.error("SQL Error in /api/subjects (POST):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true, insertId: result.insertId });
    });
});

// Update a subject AND all its related questions
app.put("/api/subjects/:id", (req, res) => {
    const { id } = req.params;
    const { subjectName: newSubjectName, teacherId } = req.body; // teacherId might be needed for scoping

    // Step 1: Get the old subject name before updating
    db.query("SELECT subject_name FROM subjects WHERE id = ?", [id], (err, results) => {
        if (err || results.length === 0) {
            console.error("SQL Error in /api/subjects/:id (PUT Step 1):", err);
            return res.status(500).json({ ok: false, error: "Cannot find original subject." });
        }
        const oldSubjectName = results[0].subject_name;

        // Step 2: Update the name in the 'subjects' table
        db.query("UPDATE subjects SET subject_name = ? WHERE id = ?", [newSubjectName, id], (err, result) => {
            if (err) {
                console.error("SQL Error in /api/subjects/:id (PUT Step 2):", err);
                return res.status(500).json({ ok: false, error: "Database error while updating subject." });
            }

            // Step 3: Update all questions that used the old subject name
            // We also scope this to the teacherId to be safe
            db.query("UPDATE questions SET subjectName = ? WHERE subjectName = ? AND teacherId = ?", [newSubjectName, oldSubjectName, teacherId], (err, result) => {
                if (err) {
                    console.error("SQL Error in /api/subjects/:id (PUT Step 3):", err);
                    return res.status(500).json({ ok: false, error: "Database error while updating questions." });
                }
                res.json({ ok: true });
            });
        });
    });
});

// Delete a subject
app.delete("/api/subjects/:id", (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM subjects WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("SQL Error in /api/subjects/:id (DELETE):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true });
    });
});

// =================================================================
// == QUESTION ROUTES ==
// =================================================================

// Get all questions for a specific subject of a brand
app.get("/api/questions/:brandCode/:subjectName", (req, res) => {
    const { brandCode, subjectName } = req.params;
    const sql = "SELECT * FROM questions WHERE brandCode = ? AND subjectName = ?";
    db.query(sql, [brandCode, subjectName], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/questions/:brandCode/:subjectName:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true, data: results });
    });
});

// Add a new question
app.post("/api/questions", (req, res) => {
    const { brandCode, subjectName, question, optionOne, optionTwo, optionThree, optionFour, correctAnswer } = req.body;
    const sql = "INSERT INTO questions (brandCode, subjectName, question, optionOne, optionTwo, optionThree, optionFour, correctAnswer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [brandCode, subjectName, question, optionOne, optionTwo, optionThree, optionFour, correctAnswer], (err, result) => {
        if (err) {
            console.error("SQL Error in /api/questions (POST):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true, insertId: result.insertId });
    });
});

// Update a question
app.put("/api/questions/:id", (req, res) => {
    const { id } = req.params;
    const { question, optionOne, optionTwo, optionThree, optionFour, correctAnswer } = req.body;
    const sql = "UPDATE questions SET question = ?, optionOne = ?, optionTwo = ?, optionThree = ?, optionFour = ?, correctAnswer = ? WHERE id = ?";
    db.query(sql, [question, optionOne, optionTwo, optionThree, optionFour, correctAnswer, id], (err, result) => {
        if (err) {
            console.error("SQL Error in /api/questions/:id (PUT):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true });
    });
});

// Delete a question
app.delete("/api/questions/:id", (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM questions WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("SQL Error in /api/questions/:id (DELETE):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true });
    });
});

// =================================================================
// == STUDENT (USER) ROUTES ==
// =================================================================

// Get all registered users (for homepage login check)
app.get("/api/users", (req, res) => {
    const { brandCode } = req.query;
    const sql = "SELECT * FROM registrations WHERE brandCode = ?";
    db.query(sql, [brandCode], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/users:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json(results);
    });
});

// Get all registrations for the dashboard view
app.get("/api/registrations/:brandCode", (req, res) => {
    const { brandCode } = req.params;
    const sql = "SELECT * FROM registrations WHERE brandCode = ?";
    db.query(sql, [brandCode], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/registrations/:brandCode:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true, data: results });
    });
});

// Register a new student/user
app.post("/api/registrations", (req, res) => {
    const { brandCode, name, fatherName, dob, userType, mobile, enrollment, password, address, profilePic } = req.body;
    const sql = "INSERT INTO registrations (brandCode, name, fatherName, dob, userType, mobile, enrollment, password, address, profilePic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [brandCode, name, fatherName, dob, userType, mobile, enrollment, password, address, profilePic], (err, result) => {
        if (err) {
             if (err.code === "ER_DUP_ENTRY") {
                return res.json({ ok: false, error: "Enrollment number already exists" });
            }
            console.error("SQL Error in /api/registrations (POST):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true });
    });
});

// Update a registration
app.put("/api/registrations/:id", (req, res) => {
    const { id } = req.params;
    const { name, fatherName, dob, userType, mobile, enrollment, password, address, profilePic } = req.body;
    const sql = "UPDATE registrations SET name = ?, fatherName = ?, dob = ?, userType = ?, mobile = ?, enrollment = ?, password = ?, address = ?, profilePic = ? WHERE id = ?";
    db.query(sql, [name, fatherName, dob, userType, mobile, enrollment, password, address, profilePic, id], (err, result) => {
        if (err) {
            // ADDED: Specific check for duplicate entry error
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({ ok: false, error: "This Student ID is already in use by another student." });
            }
            // Fallback for other errors
            console.error("SQL Error in /api/registrations/:id (PUT):", err);
            return res.status(500).json({ ok: false, error: "A database error occurred." });
        }
        res.json({ ok: true });
    });
});

// Delete a registration
app.delete("/api/registrations/:id", (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM registrations WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("SQL Error in /api/registrations/:id (DELETE):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true });
    });
});

// =================================================================
// == TEACHER MANAGEMENT ROUTES (for Admin) ==
// =================================================================

// Get all teachers for a specific brand
app.get("/api/teachers/:brandCode", (req, res) => {
    const { brandCode } = req.params;
    const sql = "SELECT id, name, mobile, enrollment FROM registrations WHERE brandCode = ? AND userType = 'teacher'";
    db.query(sql, [brandCode], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/teachers/:brandCode:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true, data: results });
    });
});

// Register a new teacher
app.post("/api/teachers", (req, res) => {
    const { brandCode, name, mobile, enrollment, password } = req.body;
    const userType = 'teacher'; // Hardcode the userType

    const sql = "INSERT INTO registrations (brandCode, name, userType, mobile, enrollment, password) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [brandCode, name, userType, mobile, enrollment, password], (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.json({ ok: false, error: "This Teacher ID (Enrollment) is already taken." });
            }
            console.error("SQL Error in /api/teachers (POST):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true, insertId: result.insertId });
    });
});

// Delete a teacher
app.delete("/api/teachers/:id", (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM registrations WHERE id = ? AND userType = 'teacher'";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("SQL Error in /api/teachers/:id (DELETE):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true });
    });
});


// =================================================================
// == ADMIN DASHBOARD ROUTES ==
// =================================================================

// 1. Get ALL Students for Admin Dashboard
app.get("/api/students/admin/:brandCode", (req, res) => {
    const { brandCode } = req.params;
    // Select all registrations where userType is 'student' for the brand.
    const sql = "SELECT id, name, mobile, enrollment FROM registrations WHERE brandCode = ? AND userType = 'student'";
    db.query(sql, [brandCode], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/students/admin/:brandCode:", err);
            return res.status(500).json({ ok: false, error: "Database error fetching all students" });
        }
        // The frontend expects the data field to contain the array of students.
        res.json({ ok: true, data: results });
    });
});

// 2. Get ALL Quizzes/Subjects for Admin Dashboard
app.get("/api/quizzes/admin/:brandCode", (req, res) => {
    const { brandCode } = req.params;
    // Select all subjects for the brand. Count questions for each subject.
    const sql = `
        SELECT s.id, s.subject_name AS subject, s.teacherId AS teacherEnrollment, COUNT(q.id) AS questionCount
        FROM subjects s
        LEFT JOIN questions q ON s.brand_code = q.brandCode AND s.subject_name = q.subjectName
        WHERE s.brand_code = ?
        GROUP BY s.id, s.subject_name, s.teacherId
        ORDER BY s.subject_name
    `;
    db.query(sql, [brandCode], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/quizzes/admin/:brandCode:", err);
            return res.status(500).json({ ok: false, error: "Database error fetching all quizzes" });
        }
        // The frontend expects the data field to contain the array of quizzes.
        res.json({ ok: true, data: results });
    });
});

// 3. Get ALL Results for Admin Dashboard
app.get("/api/results/admin/:brandCode", (req, res) => {
    const { brandCode } = req.params;
    // Select all result data for the brand.
    const sql = "SELECT * FROM results WHERE brandCode = ? ORDER BY timestamp DESC";
    db.query(sql, [brandCode], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/results/admin/:brandCode:", err);
            return res.status(500).json({ ok: false, error: "Database error fetching all results" });
        }
        // The frontend expects the data field to contain the array of results.
        res.json({ ok: true, data: results });
    });
});


// =================================================================
// == QUIZ & RESULT ROUTES ==
// =================================================================

// Submit a quiz result

// Submit a quiz result
app.post("/api/results", (req, res) => {
    // CHANGED: Removed 'name' from the destructured variables in older version
    const { brandCode, enrollment, subject, rightAns, wrongAns, maxMark } = req.body;

    // First: check if this student already submitted for this subject & brand
    const checkSql = "SELECT * FROM results WHERE brandCode = ? AND subject = ? AND enrollment = ? LIMIT 1";
    db.query(checkSql, [brandCode, subject, enrollment], (checkErr, checkRows) => {
        if (checkErr) {
            console.error("DATABASE ERROR during result check:", checkErr);
            return res.status(500).json({ ok: false, error: "Database error" });
        }

        if (checkRows.length > 0) {
            // Student already attempted
            return res.json({ ok: false, error: "Test already attempted!" });
        }

        // If not attempted, insert new result
        const insertSql = "INSERT INTO results (brandCode, enrollment, subject, rightAns, wrongAns, maxMark) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(insertSql, [brandCode, enrollment, subject, rightAns, wrongAns, maxMark], (err, result) => {
            if (err) {
                console.error("DATABASE ERROR during result submission:", err);
                return res.status(500).json({ ok: false, error: "Database error" });
            }
            res.json({ ok: true });
        });
    });
});

// Get results for a specific subject (with student names)
app.get("/api/results/:brandCode/:subject", (req, res) => {
    const { brandCode, subject } = req.params;
    const sql = `
        SELECT 
            reg.name, 
            r.enrollment, 
            r.subject, 
            r.rightAns, 
            r.wrongAns,  
            r.maxMark
        FROM results r
        JOIN registrations reg ON r.enrollment = reg.enrollment AND r.brandCode = reg.brandCode
        WHERE r.brandCode = ? AND r.subject = ?
    `;

    db.query(sql, [brandCode, subject], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/results/:brandCode/:subject:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true, data: results });
    });
});

// =================================================================
// == CERTIFICATE ROUTE ==
// =================================================================

// Get all results for a specific student for their certificate
app.get("/api/certificate/:brandCode/:enrollment", (req, res) => {
    const { brandCode, enrollment } = req.params;
    const sql = `
        SELECT 
            r.subject, r.rightAns, r.wrongAns, r.maxMark,
            r.enrollment, r.brandCode,
            reg.name, reg.fatherName, reg.profilePic
        FROM results r
        JOIN registrations reg 
            ON r.enrollment = reg.enrollment 
            AND r.brandCode = reg.brandCode
        WHERE r.brandCode = ? AND r.enrollment = ?
    `;

    db.query(sql, [brandCode, enrollment], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/certificate/:brandCode/:enrollment:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        if (results.length === 0) {
            return res.status(404).json({ ok: false, error: "No results found for this enrollment number." });
        }
        res.json({ ok: true, data: results });
    });
});

// Check if a test has been attempted
app.get('/api/checkAttempt/:brandCode/:subject/:enrollment', (req, res) => {
    const { brandCode, subject, enrollment } = req.params;
    const query = "SELECT * FROM results WHERE brandCode = ? AND subject = ? AND enrollment = ? LIMIT 1";
    db.query(query, [brandCode, subject, enrollment], (err, rows) => {
        if (err) {
            console.error("SQL Error in /api/checkAttempt:", err);
            return res.status(500).json({ error: "Server error checking attempt" });
        }
        if (rows.length > 0) {
            return res.json({ attempted: true });
        } else {
            return res.json({ attempted: false });
        }
    });
});

// =================================================================
// == SECURE USER LOGIN (for Teachers & Students) ==
// =================================================================

app.post("/api/user/login", (req, res) => {
    const { brandCode, enrollment, password } = req.body;

    if (!brandCode || !enrollment || !password) {
        return res.status(400).json({ ok: false, error: "Missing credentials" });
    }

    const sql = "SELECT * FROM registrations WHERE brandCode = ? AND enrollment = ? AND password = ?";
    db.query(sql, [brandCode, enrollment, password], (err, results) => {
        if (err) {
            console.error("Database error during user login:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }

        if (results.length > 0) {
            // Login successful, send back user data but remove the password for security
            const user = results[0];
            delete user.password; 
            res.json({ ok: true, user: user });
        } else {
            // Login failed
            res.status(401).json({ ok: false, error: "Invalid ID or password" });
        }
    });
});

// =================================================================
// == TEACHER'S DASHBOARD ROUTES (Scoped Data) ==
// =================================================================

// Get all students assigned to a specific teacher
app.get("/api/teacher/students/:teacherId", (req, res) => {
    const { teacherId } = req.params;
    const sql = "SELECT * FROM registrations WHERE teacherId = ? AND userType = 'student'";
    db.query(sql, [teacherId], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/teacher/students/:teacherId:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true, data: results });
    });
});

// Register a new student under a specific teacher
app.post("/api/teacher/students", (req, res) => {
    // teacherId is included in the body sent from the frontend
    const { brandCode, name, fatherName, dob, mobile, enrollment, password, address, profilePic, teacherId } = req.body;
    const userType = 'student'; // Hardcode userType to student

    const sql = "INSERT INTO registrations (brandCode, name, fatherName, dob, userType, mobile, enrollment, password, address, profilePic, teacherId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [brandCode, name, fatherName, dob, userType, mobile, enrollment, password, address, profilePic, teacherId], (err, result) => {
        if (err) {
             if (err.code === "ER_DUP_ENTRY") {
                return res.json({ ok: false, error: "Enrollment number already exists" });
            }
            console.error("SQL Error in /api/teacher/students (POST):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true });
    });
});

// =================================================================
// == SCOPED QUIZ & SUBJECT ROUTES (for Teachers & Students) ==
// =================================================================

// Teacher creates a new subject
app.post("/api/teacher/subjects", (req, res) => {
    const { brandCode, subjectName, teacherId } = req.body;
    const sql = "INSERT INTO subjects (brand_code, subject_name, teacherId) VALUES (?, ?, ?)";
    db.query(sql, [brandCode, subjectName, teacherId], (err, result) => {
        if (err) {
            console.error("SQL Error in /api/teacher/subjects (POST):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true });
    });
});

// Teacher gets ONLY their own subjects
app.get("/api/teacher/subjects/:teacherId", (req, res) => {
    const { teacherId } = req.params;
    const sql = "SELECT id, subject_name FROM subjects WHERE teacherId = ?";
    db.query(sql, [teacherId], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/teacher/subjects/:teacherId:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        const mappedResults = results.map(s => ({ id: s.id, subjectName: s.subject_name }));
        res.json({ ok: true, data: mappedResults });
    });
});

// Teacher adds a new question (now with teacherId)
app.post("/api/teacher/questions", (req, res) => {
    const { brandCode, subjectName, question, optionOne, optionTwo, optionThree, optionFour, correctAnswer, teacherId } = req.body;
    const sql = "INSERT INTO questions (brandCode, subjectName, question, optionOne, optionTwo, optionThree, optionFour, correctAnswer, teacherId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [brandCode, subjectName, question, optionOne, optionTwo, optionThree, optionFour, correctAnswer, teacherId], (err, result) => {
        if (err) {
            console.error("SQL Error in /api/teacher/questions (POST):", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true });
    });
});

// Student gets subjects from their assigned teacher
app.get("/api/student/subjects/:enrollment/:brandCode", (req, res) => {
    const { enrollment, brandCode } = req.params;
    // Using clean template literal format
    const sql = `SELECT s.id, s.subject_name 
FROM subjects s
JOIN registrations r ON s.teacherId = r.teacherId
WHERE r.enrollment = ? AND r.brandCode = ?`; 

    db.query(sql, [enrollment, brandCode], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/student/subjects/:enrollment/:brandCode:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        const mappedResults = results.map(s => ({ id: s.id, subjectName: s.subject_name }));
        res.json({ ok: true, data: mappedResults });
    });
});

// Student gets questions from their assigned teacher for a specific subject
app.get("/api/student/questions/:enrollment/:brandCode/:subjectName", (req, res) => {
    const { enrollment, brandCode, subjectName } = req.params;
    // Using clean template literal format
    const sql = `SELECT q.*
FROM questions q
JOIN registrations r ON q.teacherId = r.teacherId
WHERE r.enrollment = ? AND r.brandCode = ? AND q.subjectName = ?`;
    db.query(sql, [enrollment, brandCode, subjectName], (err, results) => {
        if (err) {
            console.error("SQL Error in /api/student/questions:", err);
            return res.status(500).json({ ok: false, error: "Database error" });
        }
        res.json({ ok: true, data: results });
    });
});

// FINALIZED ROUTE: Get results for a teacher's students with stats
app.get("/api/teacher/results/:teacherId/:subject", (req, res) => {
    const { teacherId, subject } = req.params;
    
    // Using clean template literal format
    const sql = `SELECT r.enrollment, r.subject, r.rightAns, r.wrongAns, r.maxMark, reg.name 
FROM results r
JOIN registrations reg ON r.enrollment = reg.enrollment AND r.brandCode = reg.brandCode
WHERE reg.teacherId = ? AND r.subject = ?`;

    db.query(sql, [teacherId, subject], (err, results) => {
        if (err) {
            // CRITICAL LOGGING: This will help you debug if 'teacherId' is the wrong column name
            console.error(`CRITICAL SQL ERROR in /api/teacher/results (Teacher ID: ${teacherId}, Subject: ${subject}):`, err);
            return res.status(500).json({ ok: false, error: `Database error during results fetch. Check server logs.` });
        }

        // --- Start of Statistics Calculation ---
        if (results.length === 0) {
            // LOGGING ZERO RESULTS: This confirms the query ran but found nothing
            console.log(`Teacher Results: Query executed successfully but returned 0 results for Teacher ID: ${teacherId}, Subject: ${subject}`);
            
            return res.json({ 
                ok: true, 
                stats: { totalStudents: 0, passed: 0, failed: 0, highestScore: 0, highestMaxMark: 0 },
                results: [] 
            });
        }
        
        let passedCount = 0;
        let failedCount = 0;
        let highestScore = -1;
        let highestMaxMark = 0;
        const passingPercentage = 33; // Assuming 33% is the passing mark

        results.forEach(result => {
            const score = (result.rightAns / result.maxMark) * 100;
            if (score >= passingPercentage) {
                passedCount++;
            } else {
                failedCount++;
            }

            if (result.rightAns > highestScore) {
                highestScore = result.rightAns;
                highestMaxMark = result.maxMark;
            }
        });

        const stats = {
            totalStudents: results.length,
            passed: passedCount,
            failed: failedCount,
            highestScore: highestScore,
            highestMaxMark: highestMaxMark
        };
        // --- End of Statistics Calculation ---

        res.json({ ok: true, stats: stats, results: results });
    });
});

// =================================================================
// == SERVER START ==
// =================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});