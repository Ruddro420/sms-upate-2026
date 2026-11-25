/**
 * Bangladesh Education Board Standard 5.00 Grading System
 */

export function calculateGrade(obtained, fullMarks = 100, isAbsent = false) {
  if (isAbsent) {
    return { grade: 'F', gpa: 0.0, passed: false, percentage: 0 };
  }
  const safeFull = fullMarks > 0 ? fullMarks : 100;
  const percentage = (obtained / safeFull) * 100;

  if (percentage >= 80) return { grade: 'A+', gpa: 5.0, passed: true, percentage };
  if (percentage >= 70) return { grade: 'A', gpa: 4.0, passed: true, percentage };
  if (percentage >= 60) return { grade: 'A-', gpa: 3.5, passed: true, percentage };
  if (percentage >= 50) return { grade: 'B', gpa: 3.0, passed: true, percentage };
  if (percentage >= 40) return { grade: 'C', gpa: 2.0, passed: true, percentage };
  if (percentage >= 33) return { grade: 'D', gpa: 1.0, passed: true, percentage };
  return { grade: 'F', gpa: 0.0, passed: false, percentage };
}

export function gpaToLetterGrade(gpa, hasFailed) {
  if (hasFailed || gpa <= 0) return 'F';
  if (gpa >= 5.0) return 'A+';
  if (gpa >= 4.0) return 'A';
  if (gpa >= 3.5) return 'A-';
  if (gpa >= 3.0) return 'B';
  if (gpa >= 2.0) return 'C';
  if (gpa >= 1.0) return 'D';
  return 'F';
}

export function computeStudentExamSummary(subjectMarks) {
  if (!subjectMarks || subjectMarks.length === 0) {
    return {
      totalObtained: 0,
      totalFull: 0,
      gpa: 0.0,
      grade: 'N/A',
      passed: false,
      failedSubjects: 0,
    };
  }

  let totalObtained = 0;
  let totalFull = 0;
  let gpaSum = 0;
  let failedSubjects = 0;

  for (const m of subjectMarks) {
    const obtained = m.is_absent ? 0 : Number(m.total_marks || 0);
    const full = Number(m.full_marks || 100);
    totalObtained += obtained;
    totalFull += full;
    if (m.grade === 'F' || m.is_absent) {
      failedSubjects += 1;
    }
    gpaSum += Number(m.gpa || 0);
  }

  const hasFailed = failedSubjects > 0;
  const rawGpa = hasFailed ? 0.0 : Number((gpaSum / subjectMarks.length).toFixed(2));
  const grade = gpaToLetterGrade(rawGpa, hasFailed);

  return {
    totalObtained: Number(totalObtained.toFixed(2)),
    totalFull,
    gpa: rawGpa,
    grade,
    passed: !hasFailed,
    failedSubjects,
  };
}
