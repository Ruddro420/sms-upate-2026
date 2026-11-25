# Bangladesh School Management Software (Full-Stack)

A complete, ready-to-run School Management Platform designed for Bangladeshi schools (Bangla + English bilingual support & official printable A4 documents).

## Features Included
- **Free & Unlimited Database**: Uses Node.js built-in local **SQLite** (`backend/data/school.db`) — **zero cloud limits, zero monthly fee, zero row caps**, with one-click `.db` and `.json` backup downloads in Settings.
- **Public Student & Guardian Portal**:
  - **Student ID Lookup** (e.g. `202606001`) to view student profile, attendance, published results, Marksheet, Admit Card, Vorti Slip, and Prosongsa Pottro.
  - **Online Vorti Form (ভর্তি ফর্ম)** submission & instant **Vorti Slip (ভর্তি স্লিপ)** download.
  - **Public Notice Board**.
- **Admission Management**: Approve & enroll applicants with auto-generated Student ID & Roll Number, fee tracking, printable **Vorti Form** & **Vorti Slip**.
- **Exams, Mark Entry & Result Publish**:
  - Bangladesh Education Board **5.00 GPA** grading (`A+` 80+, `A` 70-79, `A-` 60-69, `B` 50-59, `C` 40-49, `D` 33-39, `F` <33).
  - Subject-wise **CQ / Written, MCQ, Practical** mark entry & Absent toggle.
  - **Publish / Unpublish** results per exam & class, **Tabulation Sheet** with merit rank, and printable **Academic Transcript / Marksheet**.
- **Class-to-Class Promotion**: Promote passed students to the next class/session (or Graduate), with merit-based/sequential/custom roll assignment while preserving historical results.
- **Printable Certificates & Cards**:
  - **Admit Card (প্রবেশপত্র)** — individual by Student ID or bulk entire class, including exam routine dates.
  - **Prosongsa Pottro (প্রশংসাপত্র / Testimonial)** — switchable **বাংলা** and **English** layouts.
  - **Student ID Card**.
- **User Details & Task-Based Access Control (RBAC)**:
  - Admin can create staff users and toggle granular permissions per user (Admission, Mark Entry, Result Publish, Promotion, Admit Cards, Testimonials, Fees, Attendance, Settings, Users).

## Demo Login Credentials
| Role | Username | Password |
| :--- | :--- | :--- |
| Headmaster / Super Admin | `admin` | `admin123` |
| Admission Officer | `admission` | `staff123` |
| Exam Controller | `exam` | `staff123` |
| Accounts Officer | `accounts` | `staff123` |

## How to Run
Double-click `start.bat` or run:
```powershell
cd backend
node src/index.js
```
Then open `http://localhost:5000` in your browser!
