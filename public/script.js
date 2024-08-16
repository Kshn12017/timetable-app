document.addEventListener('DOMContentLoaded', function () {
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
            populateDropdown('absent-teacher', data);
        });

    // Fetch divisions based on selected class for "Submit Timetable"
    document.getElementById('submit-class').addEventListener('change', function () {
        fetchDivisions(this.value, 'submit-division');
    });

    // Fetch divisions based on selected class for "View Timetable"
    document.getElementById('view-class').addEventListener('change', function () {
        fetchDivisions(this.value, 'view-division');
    });
});

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
        });
}

// Handle timetable submission
document.getElementById('timetable-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const timetableData = {
        division_id: document.getElementById('submit-division').value,
        period_time: document.getElementById('period-time').value,
        subject_id: document.getElementById('submit-subject').value,
        teacher_id: document.getElementById('submit-teacher').value,
        date: document.getElementById('date').value // Date field
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

// Handle marking teacher as absent
// Fetch and populate teachers for "Mark Teachers Absent"
fetch('/teachers')
    .then(response => response.json())
    .then(data => {
        const absentTeachersDiv = document.getElementById('absent-teachers');
        absentTeachersDiv.innerHTML = ''; // Clear existing checkboxes

        data.forEach(teacher => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `teacher-${teacher.teacher_id}`;
            checkbox.value = teacher.teacher_id;

            const label = document.createElement('label');
            label.htmlFor = `teacher-${teacher.teacher_id}`;
            label.textContent = teacher.name;

            absentTeachersDiv.appendChild(checkbox);
            absentTeachersDiv.appendChild(label);
            absentTeachersDiv.appendChild(document.createElement('br'));
        });
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
            console.log(`Teacher ${teacher_id} marked as absent`);
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

//Absence Handling
document.getElementById('absence-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const selectedTeachers = Array.from(document.getElementById('absent-teachers').selectedOptions).map(option => option.value);
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
            console.log(`Teacher ${teacher_id} marked as absent`);
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
