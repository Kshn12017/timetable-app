// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

// Initialize the Express app
const app = express();

// Serve static files
app.use(express.static('public'));

// Use body-parser middleware to parse JSON requests
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'kshn', // Replace with your MySQL username
    password: '1234', // Replace with your MySQL password
    database: 'teacher_timetable_db' // Replace with your database name
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database');
});

// Example route
app.get('/', (req, res) => {
    res.send('Teacher Timetable App');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

//Get All Classes
app.get('/classes', (req, res) => {
    const sql = 'SELECT * FROM Classes';
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

//Get All Divisions for a Specific Class
app.get('/divisions/:class_id', (req, res) => {
    const class_id = req.params.class_id;
    const sql = 'SELECT * FROM Divisions WHERE class_id = ?';
    db.query(sql, [class_id], (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});


//Get All Subjects
app.get('/subjects', (req, res) => {
    const sql = 'SELECT * FROM Subjects';
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

// Get Teachers by Class
app.get('/teachers', (req, res) => {
    const class_id = req.query.class_id;

    if (class_id) {
        const sql = `
            SELECT teacher_id, name
            FROM Teachers
            WHERE JSON_SEARCH(classes_assigned, 'one', ?) IS NOT NULL
        `;
        db.query(sql, [class_id], (err, result) => {
            if (err) throw err;
            res.json(result);
        });
    } else {
        const sql = 'SELECT teacher_id, name FROM Teachers';
        db.query(sql, (err, result) => {
            if (err) throw err;
            res.json(result);
        });
    }
});


//Mark a Teacher as Absent
app.post('/absence', (req, res) => {
    const { teacher_id, date } = req.body;
    const sql = 'INSERT INTO Absence (teacher_id, date) VALUES (?, ?)';
    db.query(sql, [teacher_id, date], (err, result) => {
        if (err) throw err;
        res.send('Teacher marked as absent');
    });
});


//Assign Proxy
app.post('/assign-proxy', (req, res) => {
    const { absent_teacher_id, date } = req.body;

    // Get all divisions and periods where the teacher was supposed to teach
    const findTeacherTimetableSql = `
        SELECT division_id, period_time 
        FROM Timetables 
        WHERE teacher_id = ? AND DATE(date) = ?
    `;

    db.query(findTeacherTimetableSql, [absent_teacher_id, date], (err, timetableEntries) => {
        if (err) throw err;

        if (timetableEntries.length > 0) {
            timetableEntries.forEach(entry => {
                const { division_id, period_time } = entry;

                // Find a free teacher
                const findFreeTeacherSql = `
                    SELECT t.teacher_id 
                    FROM Teachers t 
                    LEFT JOIN Timetables tt 
                    ON t.teacher_id = tt.teacher_id AND tt.period_time = ? AND tt.date = ? AND tt.division_id = ?
                    WHERE tt.teacher_id IS NULL
                `;

                db.query(findFreeTeacherSql, [period_time, date, division_id], (err, freeTeachers) => {
                    if (err) throw err;

                    if (freeTeachers.length > 0) {
                        const proxyTeacherId = freeTeachers[0].teacher_id;

                        // Update the timetable with the proxy teacher
                        const updateTimetableSql = `
                            UPDATE Timetables 
                            SET teacher_id = ? 
                            WHERE teacher_id = ? AND period_time = ? AND date = ? AND division_id = ?
                        `;

                        db.query(updateTimetableSql, [proxyTeacherId, absent_teacher_id, period_time, date, division_id], (err, result) => {
                            if (err) throw err;
                            console.log(`Proxy teacher assigned for division ${division_id}, period ${period_time}`);
                        });
                    } else {
                        console.log(`No available proxy teacher found for division ${division_id}, period ${period_time}`);
                    }
                });
            });

            res.send('Proxy teachers assigned where possible');
        } else {
            res.send('No timetable entries found for the absent teacher on the given date');
        }
    });
});


//Timetable Submission
app.post('/timetable', (req, res) => {
    const { division_id, period_time, subject_id, teacher_id, date } = req.body;
    const sql = 'INSERT INTO Timetables (division_id, period_time, subject_id, teacher_id, date) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [division_id, period_time, subject_id, teacher_id, date], (err, result) => {
        if (err) throw err;
        res.send('Timetable entry added successfully');
    });
});

//Fetching today's timetable
app.get('/timetable/date', (req, res) => {
    const { date, class_id, division_id } = req.query;
    const sql = `
        SELECT Divisions.division_name, timetables.period_time, Subjects.subject_name, Teachers.name AS teacher_name, DATE(timetables.date) AS date
        FROM timetables
        JOIN Divisions ON timetables.division_id = Divisions.division_id
        JOIN Classes ON Divisions.class_id = Classes.class_id
        JOIN Subjects ON timetables.subject_id = Subjects.subject_id
        JOIN Teachers ON timetables.teacher_id = Teachers.teacher_id
        WHERE DATE(timetables.date) = ? AND Classes.class_id = ? AND Divisions.division_id = ?
    `;
    db.query(sql, [date, class_id, division_id], (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});
