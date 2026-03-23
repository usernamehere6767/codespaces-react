import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import './App.css';

function App() {
  const [students, setStudents] = useState([]);
  const [bannedPairs, setBannedPairs] = useState([]);
  const [currentPairs, setCurrentPairs] = useState([]);
  const [absentStudents, setAbsentStudents] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load data from cookies on mount
  useEffect(() => {
    const savedStudents = Cookies.get('students');
    const savedBannedPairs = Cookies.get('bannedPairs');

    if (savedStudents) {
      setStudents(JSON.parse(savedStudents));
    }
    if (savedBannedPairs) {
      setBannedPairs(JSON.parse(savedBannedPairs));
    }
  }, []);

  // Save students to cookie whenever they change
  useEffect(() => {
    if (students.length > 0) {
      Cookies.set('students', JSON.stringify(students), { expires: 365 });
    }
  }, [students]);

  // Save banned pairs to cookie whenever they change
  useEffect(() => {
    if (bannedPairs.length > 0) {
      Cookies.set('bannedPairs', JSON.stringify(bannedPairs), { expires: 365 });
    }
  }, [bannedPairs]);

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n');
        const names = lines
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        setStudents(names);
        setCurrentPairs([]);
        setBannedPairs([]);
        Cookies.set('students', JSON.stringify(names), { expires: 365 });
        Cookies.set('bannedPairs', JSON.stringify([]), { expires: 365 });
      } catch (error) {
        alert('Error reading CSV file: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const isPairBanned = (name1, name2) => {
    return bannedPairs.some(
      (pair) =>
        (pair[0] === name1 && pair[1] === name2) ||
        (pair[0] === name2 && pair[1] === name1)
    );
  };

  const toggleAbsentStudent = (student) => {
    setAbsentStudents((prev) =>
      prev.includes(student)
        ? prev.filter((s) => s !== student)
        : [...prev, student]
    );
  };

  const generatePairs = () => {
    const availableStudents = students.filter(
      (student) => !absentStudents.includes(student)
    );

    if (availableStudents.length < 2) {
      alert('Need at least 2 available students to create pairs');
      return;
    }

    // Shuffle students
    const shuffled = [...availableStudents].sort(() => Math.random() - 0.5);
    const newPairs = [];
    const used = new Set();

    // Try to create pairs avoiding banned combinations
    for (let i = 0; i < shuffled.length - 1; i++) {
      if (used.has(shuffled[i])) continue;

      for (let j = i + 1; j < shuffled.length; j++) {
        if (used.has(shuffled[j])) continue;

        if (!isPairBanned(shuffled[i], shuffled[j])) {
          newPairs.push([shuffled[i], shuffled[j]]);
          used.add(shuffled[i]);
          used.add(shuffled[j]);
          break;
        }
      }
    }

    // Handle leftover student (odd number) - create a group of three
    const leftoverStudents = shuffled.filter((s) => !used.has(s));
    if (leftoverStudents.length > 0) {
      // Try to find a valid group of three with someone from the last pair
      if (newPairs.length > 0) {
        const lastPair = newPairs.pop();
        newPairs.push([lastPair[0], lastPair[1], leftoverStudents[0]]);
      }
    }

    if (newPairs.length === 0) {
      alert('Could not create pairs - all possible combinations are banned!');
      return;
    }

    // Add new pairs to banned list (as pairs only, not groups of three)
    const pairsOnly = newPairs.filter((group) => group.length === 2);
    const updatedBannedPairs = [...bannedPairs, ...pairsOnly];
    setBannedPairs(updatedBannedPairs);
    setCurrentPairs(newPairs);
    setAbsentStudents([]);
    Cookies.set('bannedPairs', JSON.stringify(updatedBannedPairs), { expires: 365 });
  };

  const resetLastPairs = () => {
    if (currentPairs.length === 0) {
      alert('No pairs to reset');
      return;
    }

    // Remove the last pairs from banned list
    const pairsOnly = currentPairs.filter((group) => group.length === 2);
    const updatedBannedPairs = bannedPairs.slice(0, bannedPairs.length - pairsOnly.length);
    setBannedPairs(updatedBannedPairs);
    setCurrentPairs([]);
    setAbsentStudents([]);
    Cookies.set('bannedPairs', JSON.stringify(updatedBannedPairs), { expires: 365 });
  };

  const resetStudentList = () => {
    if (window.confirm('Are you sure you want to reset everything? This will clear the student list and all pairing history.')) {
      setStudents([]);
      setBannedPairs([]);
      setCurrentPairs([]);
      Cookies.remove('students');
      Cookies.remove('bannedPairs');
    }
  };

  const resetBannedPairs = () => {
    if (window.confirm('Are you sure you want to clear all banned pairs? This will allow any combinations to be paired again.')) {
      setBannedPairs([]);
      Cookies.set('bannedPairs', JSON.stringify([]), { expires: 365 });
      setDropdownOpen(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Student Pairing App</h1>

        <div className="file-upload-section">
          <label htmlFor="csv-upload">Upload CSV with Last Names:</label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
          />
        </div>

        {students.length > 0 && (
          <>
            <div className="info-section">
              <h2>Students ({students.length})</h2>
              <ul className="student-list">
                {students.map((student, index) => (
                  <li key={index}>{student}</li>
                ))}
              </ul>
            </div>

            <div className="absent-section-selector">
              <h3>Mark Absent for This Roll:</h3>
              <div className="checkbox-list">
                {students.map((student, index) => (
                  <label key={index} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={absentStudents.includes(student)}
                      onChange={() => toggleAbsentStudent(student)}
                    />
                    {student}
                  </label>
                ))}
              </div>
              {absentStudents.length > 0 && (
                <p className="absent-count">
                  {absentStudents.length} student(s) marked absent
                </p>
              )}
            </div>

            <div className="buttons-section">
              <button onClick={generatePairs} className="btn btn-primary">
                Generate Pairs
              </button>
              <button onClick={resetLastPairs} className="btn btn-secondary">
                Reset Last Pairs
              </button>
              <button onClick={resetStudentList} className="btn btn-danger">
                Reset Student List
              </button>
            </div>

            {currentPairs.length > 0 && (
              <div className="pairs-section">
                <h2>Current Pairs</h2>
                <ul className="pairs-list">
                  {currentPairs.map((pair, index) => (
                    <li key={index}>
                      {pair.length === 2
                        ? `${pair[0]} & ${pair[1]}`
                        : `${pair[0]} & ${pair[1]} & ${pair[2]}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bannedPairs.length > 0 && (
              <div className="banned-section">
                <button
                  className="dropdown-toggle"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span className="toggle-arrow">{dropdownOpen ? '▼' : '▶'}</span>
                  Banned Pairs ({bannedPairs.length})
                </button>
                {dropdownOpen && (
                  <div className="banned-dropdown">
                    <ul className="banned-pairs-list">
                      {bannedPairs.map((pair, index) => (
                        <li key={index}>{pair[0]} & {pair[1]}</li>
                      ))}
                    </ul>
                    <button
                      onClick={resetBannedPairs}
                      className="btn btn-warning"
                    >
                      Clear All Banned Pairs
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {students.length === 0 && (
          <p className="empty-state">
            Upload a CSV file to get started!
          </p>
        )}
      </header>
    </div>
  );
}

export default App;
