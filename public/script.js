document.addEventListener('DOMContentLoaded', function () {
    // Fetch and populate classes for "Mark Teachers Absent"
    fetch('/classes')
        .then(response => response.json())
        .then(data => {
            populateDropdown('absence-class', data);
        });

    // Fetch teachers based on selected class for "Mark Teachers Absent"
    document.getElementById('absence-class').addEventListener('change', function () {
        fetchTeachersByClass(this.options[this.selectedIndex].text); // Use the class_name for teachers
    });

    // Fetch and populate teachers based on selected class name
    function fetchTeachersByClass(className) {
        fetch(`/teachers?class_id=${className}`)
            .then(response => response.json())
            .then(data => {
                const absentTeachersDiv = document.getElementById('absent-teachers');
                absentTeachersDiv.innerHTML = ''; // Clear existing checkboxes

                data.forEach(teacher => {
                    const div = document.createElement('div');
                    div.className = 'form-check';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `teacher-${teacher.teacher_id}`;
                    checkbox.value = teacher.teacher_id;
                    checkbox.className = 'form-check-input';

                    const label = document.createElement('label');
                    label.htmlFor = `teacher-${teacher.teacher_id}`;
                    label.textContent = teacher.name;
                    label.className = 'form-check-label';

                    div.appendChild(checkbox);
                    div.appendChild(label);
                    absentTeachersDiv.appendChild(div);
                });
            });
    }

    // Fetch and populate classes for "Submit Timetable"
    fetch('/classes')
        .then(response => response.json())
        .then(data => {
            populateDropdown('submit-class', data);
        });

    // Fetch and populate classes for "View Timetable"
    fetch('/classes')
        .then(response => response.json())
        .then(data => {
            populateDropdown('view-class', data);
        });

    // Fetch and populate subjects for "Submit Timetable"
    fetch('/subjects')
        .then(response => response.json())
        .then(data => {
            populateDropdown('submit-subject', data);
        });

    // Fetch and populate teachers for "Submit Timetable"
    fetch('/teachers')
        .then(response => response.json())
        .then(data => {
            populateDropdown('submit-teacher', data);
        });

    // Fetch divisions based on selected class for "Submit Timetable"
    document.getElementById('submit-class').addEventListener('change', function () {
        const classId = this.value;
        fetchDivisions(classId, 'submit-division');
    });

    // Fetch divisions based on selected class for "View Timetable"
    document.getElementById('view-class').addEventListener('change', function () {
        fetchDivisions(this.value, 'view-division');
    });

    // Fetch divisions based on class ID
    function fetchDivisions(classId, dropdownId) {
        fetch(`/divisions/${classId}`)
            .then(response => response.json())
            .then(data => {
                const dropdown = document.getElementById(dropdownId);
                dropdown.innerHTML = ''; // Clear existing options
                data.forEach(div => {
                    const option = document.createElement('option');
                    option.value = div.division_id;
                    option.textContent = div.division_name;
                    dropdown.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching divisions:', error));
    }


    // Handle timetable submission
    document.getElementById('timetable-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const classId = document.getElementById('submit-class').value;
        const divisionId = document.getElementById('submit-division').value;
        const periodTime = document.getElementById('period-time').value;
        const subjectId = document.getElementById('submit-subject').value;
        const teacherId = document.getElementById('submit-teacher').value;
        const date = document.getElementById('date').value;

        const timetableData = {
            division_id: divisionId,
            period_time: periodTime,
            subject_id: subjectId,
            teacher_id: teacherId,
            date: date
        };

        fetch('/timetable', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(timetableData)
        })
            .then(response => response.text())
            .then(message => alert(message))
            .catch(error => console.error('Error:', error));
    });

    // Handle marking teachers as absent
    document.getElementById('absence-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const selectedTeachers = Array.from(document.querySelectorAll('#absent-teachers input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
        const absenceDate = document.getElementById('absence-date').value;

        selectedTeachers.forEach(teacher_id => {
            const absenceData = {
                teacher_id: teacher_id,
                date: absenceDate
            };

            fetch('/absence', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(absenceData)
            })
                .then(response => response.text())
                .then(message => {
                    // After marking absent, assign proxy
                    assignProxy(teacher_id, absenceDate);
                })
                .catch(error => console.error('Error:', error));
        });

        // Reload timetable after processing all absences
        setTimeout(() => {
            loadTimetableForDate(absenceDate, document.getElementById('view-class').value, document.getElementById('view-division').value);
        }, 1000);
    });

    // Handle loading the timetable
    document.getElementById('load-timetable').addEventListener('click', function () {
        const selectedDate = document.getElementById('view-date').value;
        const selectedClass = document.getElementById('view-class').value;
        const selectedDivision = document.getElementById('view-division').value;

        if (selectedDate && selectedClass && selectedDivision) {
            loadTimetableForDate(selectedDate, selectedClass, selectedDivision);
        } else {
            alert('Please select a date, class, and division to view the timetable.');
        }
    });
});

// Populate dropdown helper function
function populateDropdown(dropdownId, data) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = ''; // Clear existing options
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.class_id || item.subject_id || item.teacher_id; // Adjust based on data
        option.textContent = item.class_name || item.subject_name || item.name; // Adjust based on data
        dropdown.appendChild(option);
    });
}

// Fetch divisions based on class ID
function fetchDivisions(classId, dropdownId) {
    fetch(`/divisions/${classId}`)
        .then(response => response.json())
        .then(data => {
            const dropdown = document.getElementById(dropdownId);
            dropdown.innerHTML = ''; // Clear existing options
            data.forEach(div => {
                const option = document.createElement('option');
                option.value = div.division_id;
                option.textContent = div.division_name;
                dropdown.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching divisions:', error));
}

// Fetch divisions based on selected class for "Submit Timetable"
document.getElementById('submit-class').addEventListener('change', function () {
    const selectedOption = this.options[this.selectedIndex];
    const classId = selectedOption.dataset.classId; // Use the stored class_id
    fetchDivisions(classId, 'submit-division');
});

// Fetch divisions based on selected class for "View Timetable"
document.getElementById('view-class').addEventListener('change', function () {
    const selectedOption = this.options[this.selectedIndex];
    const classId = selectedOption.dataset.classId; // Use the stored class_id
    fetchDivisions(classId, 'view-division');
});



// Fetch and populate teachers based on selected class
function fetchTeachersByClass(classId) {
    fetch(`/teachers?class_id=${classId}`)
        .then(response => response.json())
        .then(data => {
            const absentTeachersDiv = document.getElementById('absent-teachers');
            absentTeachersDiv.innerHTML = ''; // Clear existing checkboxes

            data.forEach(teacher => {
                const div = document.createElement('div');
                div.className = 'form-check';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `teacher-${teacher.teacher_id}`;
                checkbox.value = teacher.teacher_id;
                checkbox.className = 'form-check-input';

                const label = document.createElement('label');
                label.htmlFor = `teacher-${teacher.teacher_id}`;
                label.textContent = teacher.name;
                label.className = 'form-check-label';

                div.appendChild(checkbox);
                div.appendChild(label);
                absentTeachersDiv.appendChild(div);
            });
        });
}

// Load timetable for a specific date, class, and division
function loadTimetableForDate(date, class_id, division_id) {
    fetch(`/timetable/date?date=${date}&class_id=${class_id}&division_id=${division_id}`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('timetable-display').querySelector('tbody');
            tbody.innerHTML = '';
            if (data.length > 0) {
                data.forEach(entry => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${entry.division_name}</td>
                        <td>${entry.period_time}</td>
                        <td>${entry.subject_name}</td>
                        <td>${entry.teacher_name}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="4">No timetable found for this date, class, and division.</td>`;
                tbody.appendChild(row);
            }
        })
        .catch(error => console.error('Error:', error));
}

// Assign proxy teacher for an absent teacher
function assignProxy(absentTeacherId, date) {
    fetch(`/assign-proxy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ absent_teacher_id: absentTeacherId, date: date })
    })
        .then(response => response.text())
        .then(message => console.log('Proxy assigned:', message))
        .catch(error => console.error('Error:', error));
}

document.getElementById('toggle-dark-mode').addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
});
