import React from 'react';

function SchoolHeader({ settings, subtitle, subtitleBn }) {
  const s = settings || {};
  return (
    <div className="border-b-2 border-emerald-800 pb-3 mb-4 text-center relative">
      <div className="flex items-center justify-center gap-4">
        {s.logo_data ? (
          <img src={s.logo_data} alt="Logo" className="h-16 w-16 object-contain rounded-lg" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xl shrink-0">
            {(s.school_name || 'S')[0]}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-emerald-900 tracking-tight uppercase">
            {s.school_name || 'Shapla Ideal High School'}
          </h1>
          <p className="text-lg font-bold text-emerald-700 font-bangla">
            {s.school_name_bn || 'শাপলা আদর্শ উচ্চ বিদ্যালয়'}
          </p>
          <p className="text-xs text-slate-600">
            {s.address || 'Mirpur-10, Dhaka-1216'} | EIIN: <span className="font-bold">{s.eiin || '108452'}</span> | Phone: {s.phone}
          </p>
        </div>
      </div>
      {(subtitle || subtitleBn) && (
        <div className="mt-3 inline-block rounded-full border border-emerald-700 bg-emerald-50 px-6 py-1">
          <span className="text-sm font-bold uppercase tracking-wider text-emerald-900">
            {subtitle} {subtitleBn ? ` / ${subtitleBn}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// 1. VORTI FORM (ভর্তি ফর্ম)
export function VortiFormDoc({ admission, settings }) {
  if (!admission) return null;
  return (
    <div className="bg-white p-6 border-2 border-slate-300 rounded-xl text-slate-900 text-sm">
      <SchoolHeader settings={settings} subtitle="Admission Form" subtitleBn="ভর্তি ফর্ম" />

      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div><span className="text-slate-500">Application No:</span> <strong className="text-emerald-800">{admission.application_no}</strong></div>
          <div><span className="text-slate-500">Session / শিক্ষাবর্ষ:</span> <strong>{admission.session_name}</strong></div>
          <div><span className="text-slate-500">Applying Class / শ্রেণি:</span> <strong>{admission.class_name}</strong></div>
          <div><span className="text-slate-500">Group / বিভাগ:</span> <strong>{admission.group_name || 'General'}</strong></div>
          <div><span className="text-slate-500">Status:</span> <strong>{admission.status}</strong></div>
          <div><span className="text-slate-500">Date:</span> <strong>{(admission.created_at || '').slice(0, 10)}</strong></div>
        </div>
        <div className="w-28 h-32 border-2 border-dashed border-slate-400 rounded-lg flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
          {admission.photo_data ? (
            <img src={admission.photo_data} alt="Student" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] text-slate-400 text-center px-2">Passport Photo<br />ছবি</span>
          )}
        </div>
      </div>

      <table className="w-full border-collapse border border-slate-300 text-sm mb-6">
        <tbody>
          <tr className="border-b border-slate-300">
            <td className="p-2.5 bg-slate-50 font-semibold w-1/3 border-r border-slate-300">Student's Name (English)</td>
            <td className="p-2.5 font-bold uppercase">{admission.full_name}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="p-2.5 bg-slate-50 font-semibold border-r border-slate-300 font-bangla">শিক্ষার্থীর নাম (বাংলায়)</td>
            <td className="p-2.5 font-bangla">{admission.full_name_bn || '—'}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="p-2.5 bg-slate-50 font-semibold border-r border-slate-300">Father's Name / পিতার নাম</td>
            <td className="p-2.5">{admission.father_name} {admission.father_name_bn ? `(${admission.father_name_bn})` : ''}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="p-2.5 bg-slate-50 font-semibold border-r border-slate-300">Mother's Name / মাতার নাম</td>
            <td className="p-2.5">{admission.mother_name} {admission.mother_name_bn ? `(${admission.mother_name_bn})` : ''}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="p-2.5 bg-slate-50 font-semibold border-r border-slate-300">Date of Birth / জন্ম তারিখ</td>
            <td className="p-2.5">{admission.dob}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="p-2.5 bg-slate-50 font-semibold border-r border-slate-300">Birth Reg. No / জন্ম নিবন্ধন নং</td>
            <td className="p-2.5">{admission.birth_reg_no || '—'}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="p-2.5 bg-slate-50 font-semibold border-r border-slate-300">Gender / Religion / Blood Group</td>
            <td className="p-2.5">{admission.gender} | {admission.religion} | Blood: {admission.blood_group || 'N/A'}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="p-2.5 bg-slate-50 font-semibold border-r border-slate-300">Guardian Phone / অভিভাবকের মোবাইল</td>
            <td className="p-2.5 font-semibold">{admission.guardian_phone}</td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="p-2.5 bg-slate-50 font-semibold border-r border-slate-300">Present Address / বর্তমান ঠিকানা</td>
            <td className="p-2.5">{admission.present_address}</td>
          </tr>
          <tr>
            <td className="p-2.5 bg-slate-50 font-semibold border-r border-slate-300">Previous School / পূর্ববর্তী বিদ্যালয়</td>
            <td className="p-2.5">{admission.previous_school || '—'}</td>
          </tr>
        </tbody>
      </table>

      <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-xs text-slate-700 mb-12 font-bangla">
        <strong>অঙ্গীকারনামা / Declaration:</strong> আমি অঙ্গীকার করছি যে, উপরে বর্ণিত সকল তথ্য সম্পূর্ণ সত্য এবং আমি ও আমার সন্তান বিদ্যালয়ের সকল নিয়ম-শৃঙ্খলা মেনে চলতে বাধ্য থাকিব।
      </div>

      <div className="flex justify-between items-end pt-6 text-xs">
        <div className="text-center border-t border-slate-500 pt-1.5 w-44">
          Guardian Signature<br />অভিভাবকের স্বাক্ষর
        </div>
        <div className="text-center border-t border-slate-500 pt-1.5 w-44">
          Admission Officer<br />ভর্তি কর্মকর্তা
        </div>
        <div className="text-center border-t border-slate-500 pt-1.5 w-44">
          Headmaster<br />প্রধান শিক্ষক
        </div>
      </div>
    </div>
  );
}

// 2. VORTI SLIP (ভর্তি স্লিপ / রসিদ)
export function VortiSlipDoc({ admission, settings }) {
  if (!admission) return null;
  return (
    <div className="bg-white p-6 border-2 border-emerald-700 rounded-xl text-slate-900 text-sm">
      <SchoolHeader settings={settings} subtitle="Admission Confirmation & Fee Slip" subtitleBn="ভর্তি স্লিপ ও রসিদ" />

      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4">
        <div>
          <p className="text-xs text-emerald-700 font-semibold">Application / Tracking ID</p>
          <p className="text-xl font-extrabold text-emerald-900">{admission.application_no}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            admission.fee_paid ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
          }`}>
            {admission.fee_paid ? 'FEE PAID / পরিশোধিত' : 'PAYMENT PENDING / বকেয়া'}
          </span>
          <p className="text-xs text-slate-500 mt-1">Admission Status: <strong>{admission.status}</strong></p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5 border border-slate-200 rounded-lg p-4">
        <div><span className="text-slate-500 text-xs block">Student Name / নাম</span><strong>{admission.full_name}</strong></div>
        <div><span className="text-slate-500 text-xs block">Father's Name / পিতা</span><strong>{admission.father_name}</strong></div>
        <div><span className="text-slate-500 text-xs block">Class & Session / শ্রেণি ও শিক্ষাবর্ষ</span><strong>{admission.class_name} ({admission.session_name})</strong></div>
        <div><span className="text-slate-500 text-xs block">Guardian Mobile</span><strong>{admission.guardian_phone}</strong></div>
        {admission.enrolled_student_uid && (
          <>
            <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
              <span className="text-emerald-700 text-xs block">Assigned Student ID</span>
              <strong className="text-base text-emerald-900">{admission.enrolled_student_uid}</strong>
            </div>
            <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
              <span className="text-emerald-700 text-xs block">Assigned Roll / রোল নং</span>
              <strong className="text-base text-emerald-900">{admission.assigned_roll}</strong>
            </div>
          </>
        )}
      </div>

      <table className="w-full border border-slate-300 text-sm mb-8">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-2 text-left border-b border-slate-300">Fee Description / বিবরণ</th>
            <th className="p-2 text-left border-b border-slate-300">Payment Ref</th>
            <th className="p-2 text-right border-b border-slate-300">Amount (BDT)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2.5">Admission & Form Processing Fee (ভর্তি ফি)</td>
            <td className="p-2.5">{admission.payment_ref || 'Cash Counter'}</td>
            <td className="p-2.5 text-right font-bold">৳ {Number(admission.admission_fee || 1500).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between items-end pt-6 text-xs">
        <div className="text-slate-500">
          Printed on: {new Date().toLocaleDateString('en-GB')}<br />
          Please preserve this slip for ID card & book collection.
        </div>
        <div className="text-center border-t border-slate-500 pt-1.5 w-48">
          Authorized Signature & Seal<br />আদায়কারী ও অফিস সিল
        </div>
      </div>
    </div>
  );
}

// 3. ADMIT CARD (প্রবেশপত্র)
export function AdmitCardDoc({ student, exam, routine, settings }) {
  if (!student || !exam) return null;
  return (
    <div className="bg-white p-6 border-2 border-slate-800 rounded-xl text-slate-900 text-sm mb-6">
      <SchoolHeader settings={settings} subtitle="Admit Card" subtitleBn="প্রবেশপত্র" />

      <div className="text-center mb-4">
        <h2 className="text-base font-bold text-slate-800">{exam.name} {exam.name_bn ? `(${exam.name_bn})` : ''}</h2>
        <p className="text-xs text-slate-500">Academic Session: {exam.session_name}</p>
      </div>

      <div className="flex justify-between items-start gap-4 mb-5 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1">
          <div><span className="text-slate-500 text-xs block">Student ID Number</span><strong className="text-emerald-800 text-base">{student.student_uid}</strong></div>
          <div><span className="text-slate-500 text-xs block">Class Roll / রোল নং</span><strong className="text-base">{student.roll_number}</strong></div>
          <div><span className="text-slate-500 text-xs block">Student Name</span><strong className="uppercase">{student.full_name}</strong></div>
          <div><span className="text-slate-500 text-xs block">Class & Section</span><strong>{student.class_name} {student.section_name ? `(${student.section_name})` : ''}</strong></div>
          <div><span className="text-slate-500 text-xs block">Father's Name</span><span>{student.father_name}</span></div>
          <div><span className="text-slate-500 text-xs block">Mother's Name</span><span>{student.mother_name}</span></div>
        </div>
        <div className="w-24 h-28 border border-slate-400 rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
          {student.photo_data ? (
            <img src={student.photo_data} alt={student.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-slate-400 text-center">Student Photo</span>
          )}
        </div>
      </div>

      {routine && routine.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase text-slate-600 mb-1.5">Exam Schedule / পরীক্ষার সময়সূচি</p>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 p-1.5 text-left">Code</th>
                <th className="border border-slate-300 p-1.5 text-left">Subject</th>
                <th className="border border-slate-300 p-1.5 text-center">Date</th>
                <th className="border border-slate-300 p-1.5 text-center">Time</th>
                <th className="border border-slate-300 p-1.5 text-center">Room</th>
              </tr>
            </thead>
            <tbody>
              {routine.map((r, i) => (
                <tr key={i}>
                  <td className="border border-slate-300 p-1.5">{r.code}</td>
                  <td className="border border-slate-300 p-1.5 font-medium">{r.subject_name} {r.subject_name_bn ? `(${r.subject_name_bn})` : ''}</td>
                  <td className="border border-slate-300 p-1.5 text-center">{r.exam_date || 'TBA'}</td>
                  <td className="border border-slate-300 p-1.5 text-center">{r.start_time} - {r.end_time}</td>
                  <td className="border border-slate-300 p-1.5 text-center">{r.room_no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-[11px] text-slate-600 mb-10 font-bangla">
        <strong>নির্দেশাবলি:</strong> পরীক্ষা শুরুর ৩০ মিনিট পূর্বে আসন গ্রহণ করতে হবে। প্রবেশপত্র ব্যতীত পরীক্ষায় অংশগ্রহণ করা যাবে না। মোবাইল ফোন বা ইলেকট্রনিক ডিভাইস আনা সম্পূর্ণ নিষিদ্ধ।
      </div>

      <div className="flex justify-between items-end pt-4 text-xs">
        <div className="text-center border-t border-slate-500 pt-1 w-40">Class Teacher</div>
        <div className="text-center border-t border-slate-500 pt-1 w-40">Exam Controller</div>
        <div className="text-center border-t border-slate-500 pt-1 w-40">Headmaster / প্রধান শিক্ষক</div>
      </div>
    </div>
  );
}

// 4. MARKSHEET / ACADEMIC TRANSCRIPT (একাডেমিক ট্রান্সক্রিপ্ট)
export function MarksheetDoc({ student, exam, marks, summary, settings }) {
  if (!student || !exam) return null;
  return (
    <div className="bg-white p-6 border-4 border-double border-emerald-900 rounded-xl text-slate-900 text-sm">
      <SchoolHeader settings={settings} subtitle="Academic Transcript / Marksheet" subtitleBn="একাডেমিক ট্রান্সক্রিপ্ট" />

      <div className="text-center mb-4">
        <h2 className="text-base font-bold text-slate-800">{exam.name}</h2>
        <p className="text-xs text-slate-500">Session: {exam.session_name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 text-xs">
        <div><span className="text-slate-500">Student Name:</span> <strong className="block text-sm">{student.full_name}</strong></div>
        <div><span className="text-slate-500">Student ID:</span> <strong className="block text-sm text-emerald-800">{student.student_uid}</strong></div>
        <div><span className="text-slate-500">Roll Number:</span> <strong className="block text-sm">{student.roll_number}</strong></div>
        <div><span className="text-slate-500">Father's Name:</span> <strong className="block">{student.father_name}</strong></div>
        <div><span className="text-slate-500">Mother's Name:</span> <strong className="block">{student.mother_name}</strong></div>
        <div><span className="text-slate-500">Class / Section:</span> <strong className="block">{student.class_name} {student.section_name ? `(${student.section_name})` : ''}</strong></div>
      </div>

      <table className="w-full border-collapse border border-slate-400 text-xs mb-5">
        <thead className="bg-emerald-900 text-white">
          <tr>
            <th className="border border-slate-400 p-2 text-left">Code</th>
            <th className="border border-slate-400 p-2 text-left">Subject Name</th>
            <th className="border border-slate-400 p-2 text-center">Full Marks</th>
            <th className="border border-slate-400 p-2 text-center">CQ / Written</th>
            <th className="border border-slate-400 p-2 text-center">MCQ</th>
            <th className="border border-slate-400 p-2 text-center">Practical</th>
            <th className="border border-slate-400 p-2 text-center">Total</th>
            <th className="border border-slate-400 p-2 text-center">Letter Grade</th>
            <th className="border border-slate-400 p-2 text-center">GP</th>
          </tr>
        </thead>
        <tbody>
          {marks.map((m) => (
            <tr key={m.id} className={m.grade === 'F' ? 'bg-red-50' : ''}>
              <td className="border border-slate-300 p-2">{m.subject_code}</td>
              <td className="border border-slate-300 p-2 font-medium">{m.subject_name} {m.subject_name_bn ? `(${m.subject_name_bn})` : ''}</td>
              <td className="border border-slate-300 p-2 text-center">{m.full_marks}</td>
              <td className="border border-slate-300 p-2 text-center">{m.is_absent ? 'ABS' : m.cq_marks}</td>
              <td className="border border-slate-300 p-2 text-center">{m.is_absent ? '-' : m.mcq_marks}</td>
              <td className="border border-slate-300 p-2 text-center">{m.is_absent ? '-' : m.practical_marks}</td>
              <td className="border border-slate-300 p-2 text-center font-bold">{m.is_absent ? 'Absent' : m.total_marks}</td>
              <td className={`border border-slate-300 p-2 text-center font-bold ${m.grade === 'F' ? 'text-red-600' : 'text-emerald-800'}`}>
                {m.grade}
              </td>
              <td className="border border-slate-300 p-2 text-center font-semibold">{Number(m.gpa).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-4 gap-3 mb-8 text-center">
        <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
          <div className="text-xs text-slate-500">Total Marks</div>
          <div className="text-lg font-extrabold">{summary.totalObtained} / {summary.totalFull}</div>
        </div>
        <div className="border border-slate-300 rounded-lg p-3 bg-emerald-50">
          <div className="text-xs text-emerald-700">GPA (Scale 5.00)</div>
          <div className="text-lg font-extrabold text-emerald-900">{Number(summary.gpa).toFixed(2)}</div>
        </div>
        <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
          <div className="text-xs text-slate-500">Final Grade</div>
          <div className="text-lg font-extrabold">{summary.grade}</div>
        </div>
        <div className={`border rounded-lg p-3 ${summary.passed ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-red-600 text-white border-red-700'}`}>
          <div className="text-xs opacity-90">Result Status</div>
          <div className="text-lg font-extrabold">{summary.passed ? 'PASSED' : 'FAILED'}</div>
        </div>
      </div>

      <div className="flex justify-between items-end pt-8 text-xs">
        <div className="text-center border-t border-slate-500 pt-1 w-40">Guardian Signature</div>
        <div className="text-center border-t border-slate-500 pt-1 w-40">Class Teacher</div>
        <div className="text-center border-t border-slate-500 pt-1 w-40">Headmaster / প্রধান শিক্ষক</div>
      </div>
    </div>
  );
}

// 5. PROSONGSA POTTRO / TESTIMONIAL (প্রশংসাপত্র)
export function ProsongsaPottroDoc({ testimonial, settings, lang = 'bn' }) {
  if (!testimonial) return null;
  const s = settings || {};
  return (
    <div className="bg-amber-50/30 p-8 border-8 border-double border-emerald-900 rounded-xl text-slate-900 relative">
      <SchoolHeader
        settings={settings}
        subtitle="TESTIMONIAL"
        subtitleBn="প্রশংসাপত্র"
      />

      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-6">
        <span>Serial No / ক্রমিক নং: <strong className="text-slate-900">{testimonial.serial_no}</strong></span>
        <span>Student ID: <strong className="text-emerald-800">{testimonial.student_uid}</strong></span>
        <span>Issue Date / তারিখ: <strong className="text-slate-900">{testimonial.issue_date}</strong></span>
      </div>

      {lang === 'bn' ? (
        <div className="font-bangla text-base leading-8 text-justify px-2 mb-12">
          <p>
            এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, <strong>{testimonial.full_name_bn || testimonial.full_name}</strong>,
            পিতা: <strong>{testimonial.father_name_bn || testimonial.father_name}</strong>,
            মাতা: <strong>{testimonial.mother_name_bn || testimonial.mother_name}</strong>,
            ঠিকানা: <strong>{testimonial.present_address}</strong>, অত্র বিদ্যালয়ের একজন নিয়মিত শিক্ষার্থী ছিল/আছে।
            বিদ্যালয়ের ভর্তি রেজিস্টার অনুযায়ী তাহার জন্ম তারিখ <strong>{testimonial.dob}</strong>।
          </p>
          <p className="mt-4">
            সে অত্র বিদ্যালয় হতে <strong>{testimonial.passing_year}</strong> সালের <strong>{testimonial.exam_name}</strong> পরীক্ষায়
            ({testimonial.class_name_bn || testimonial.class_name}, রোল নং: <strong>{testimonial.roll_number}</strong>) অংশগ্রহণ করে
            {testimonial.gpa_obtained ? <> জিপিএ <strong>{testimonial.gpa_obtained}</strong> অর্জন করে </> : ' '}
            কৃতিত্বের সাথে উত্তীর্ণ হয়েছে।
          </p>
          <p className="mt-4">
            আমার জানামতে {testimonial.character_note_bn}। আমি তাহার জীবনের সর্বাঙ্গীণ উন্নতি ও উজ্জ্বল ভবিষ্যৎ কামনা করি।
          </p>
        </div>
      ) : (
        <div className="text-base leading-8 text-justify px-2 mb-12">
          <p>
            This is to certify that <strong className="uppercase">{testimonial.full_name}</strong>,
            son/daughter of <strong>{testimonial.father_name}</strong> and <strong>{testimonial.mother_name}</strong>,
            residing at <strong>{testimonial.present_address}</strong>, has been a bonafide student of this institution
            bearing Student ID <strong>{testimonial.student_uid}</strong>. According to our school admission register,
            his/her date of birth is <strong>{testimonial.dob}</strong>.
          </p>
          <p className="mt-4">
            He/She appeared at the <strong>{testimonial.exam_name}</strong> in <strong>{testimonial.passing_year}</strong> from{' '}
            <strong>{testimonial.class_name}</strong> (Roll No: <strong>{testimonial.roll_number}</strong>) and passed successfully
            {testimonial.gpa_obtained ? <> securing GPA <strong>{testimonial.gpa_obtained}</strong></> : ''}.
          </p>
          <p className="mt-4">
            To the best of my knowledge, he/she {testimonial.character_note}. I wish him/her every success in life.
          </p>
        </div>
      )}

      <div className="flex justify-between items-end pt-10 text-xs">
        <div className="text-center border-t border-slate-600 pt-1.5 w-44">
          Prepared By / অফিস সহকারী
        </div>
        <div className="text-center text-slate-400 text-[11px]">
          [ Official School Seal ]
        </div>
        <div className="text-center border-t border-slate-600 pt-1.5 w-52">
          <strong>{s.headmaster_name || 'Headmaster'}</strong><br />
          Headmaster / প্রধান শিক্ষক<br />
          {s.school_name}
        </div>
      </div>
    </div>
  );
}

// 6. STUDENT ID CARD
export function StudentIdCardDoc({ student, settings }) {
  if (!student) return null;
  const s = settings || {};
  return (
    <div className="max-w-sm mx-auto bg-white border-2 border-emerald-800 rounded-2xl overflow-hidden shadow-lg text-slate-900">
      <div className="bg-emerald-800 text-white p-3 text-center">
        <h3 className="font-bold text-sm uppercase">{s.school_name || 'Shapla Ideal High School'}</h3>
        <p className="text-[11px] opacity-90 font-bangla">{s.school_name_bn} | EIIN: {s.eiin}</p>
        <div className="mt-1 inline-block bg-amber-400 text-emerald-950 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase">
          Student Identity Card
        </div>
      </div>
      <div className="p-4 text-center">
        <div className="w-24 h-24 mx-auto rounded-xl border-2 border-emerald-600 overflow-hidden bg-slate-100 mb-3 flex items-center justify-center">
          {student.photo_data ? (
            <img src={student.photo_data} alt={student.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-emerald-800">{student.full_name[0]}</span>
          )}
        </div>
        <h4 className="font-extrabold text-base uppercase text-slate-900">{student.full_name}</h4>
        {student.full_name_bn && <p className="text-xs text-slate-600 font-bangla">{student.full_name_bn}</p>}
        <div className="mt-1 inline-block bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full text-xs font-bold text-emerald-800">
          ID: {student.student_uid}
        </div>

        <div className="mt-4 text-left text-xs space-y-1.5 border-t border-slate-200 pt-3">
          <div className="flex justify-between"><span className="text-slate-500">Class:</span><strong>{student.class_name} ({student.section_name || 'A'})</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">Roll No:</span><strong>{student.roll_number}</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">Session:</span><strong>{student.session_name}</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">Blood Group:</span><strong className="text-red-600">{student.blood_group || 'N/A'}</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">Emergency Phone:</span><strong>{student.guardian_phone}</strong></div>
        </div>
      </div>
      <div className="bg-slate-100 px-4 py-2 flex justify-between items-center text-[10px] text-slate-600 border-t border-slate-200">
        <span>{s.phone}</span>
        <span className="font-semibold">Principal Signature</span>
      </div>
    </div>
  );
}
