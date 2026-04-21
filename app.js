// ══════════════════════════════════════════════
//  SohCahToa Holdings – Loan Application JS
// ══════════════════════════════════════════════

// ── EmailJS Config — replace with your values
const EMAILJS_PUBLIC_KEY  = 'Cy1dc01hIWUDg05Yh';
const EMAILJS_SERVICE_ID  = 'service_no3de7v';
const EMAILJS_TEMPLATE_ID = 'template_hyonblk';
const HR_GROUP_EMAIL      = 'Anuoluwapo.fanegan@sohcahtoaholdings.com'; //Anuoluwapo.fanegan@sohcahtoaholdings.com 

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

// ── Repayment period months map
const PERIOD_MONTHS = {
  '1 month': 1, '3 months': 3,
  '4 months': 4, '5 months': 5, '6 months': 6
};

// ── Format number as comma-separated (no currency symbol, for inputs)
function formatNumberInput(value) {
  var num = value.replace(/,/g, '');
  if (!num || isNaN(num)) return '';
  return Number(num).toLocaleString('en-NG');
}

// ── Parse comma-separated number back to raw number
function parseFormattedNumber(value) {
  return parseFloat(value.replace(/,/g, '')) || 0;
}

// ── Format as ₦ currency for email
function fmt(raw) {
  var n = parseFormattedNumber(raw);
  return '\u20A6' + n.toLocaleString('en-NG');
}

// ── Apply comma formatting to amount inputs on input event
function attachNumberFormatter(id) {
  var el = document.getElementById(id);
  el.addEventListener('input', function () {
    var raw = this.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    if (raw === '') { this.value = ''; return; }
    var cursor = this.selectionStart;
    var oldLen = this.value.length;
    this.value = Number(raw).toLocaleString('en-NG');
    // Adjust cursor position for added commas
    var newLen = this.value.length;
    this.setSelectionRange(cursor + (newLen - oldLen), cursor + (newLen - oldLen));
  });
}

// ── Auto-calculate monthly repayment
// SohCahToa Finance: 2% monthly interest (amortisation formula)
// All other departments: zero interest (amount / months)
function recalcRepayment() {
  var amountRaw  = parseFormattedNumber(document.getElementById('loanAmount').value);
  var period     = document.getElementById('repaymentPeriod').value;
  var months     = PERIOD_MONTHS[period];
  var repayEl    = document.getElementById('monthlyRepayment');
  var dept       = document.getElementById('department').value;
  var isFinance  = dept === 'SohCahToa Finance';

  // Update label hint
  var labelEl = repayEl.closest('.field').querySelector('label');
  if (labelEl) {
    labelEl.innerHTML = isFinance
      ? 'Monthly Repayment Amount (&#8358;) <small style="color:var(--orange);font-weight:500">(2% monthly interest)</small>'
      : 'Monthly Repayment Amount (&#8358;)';
  }

  if (amountRaw > 0 && months) {
    var monthly;
    if (isFinance) {
      var r = 0.02;
      // Standard amortisation: PMT = P * r * (1+r)^n / ((1+r)^n - 1)
      var factor = Math.pow(1 + r, months);
      monthly = Math.ceil(amountRaw * r * factor / (factor - 1));
    } else {
      monthly = Math.ceil(amountRaw / months);
    }
    repayEl.value = monthly.toLocaleString('en-NG');
  } else {
    repayEl.value = '';
  }
}

// ── Eligibility check — only confirmed permanent staff can apply
function checkEligibility() {
  var isPermanent = document.getElementById('isPermanent').value;
  var alert       = document.getElementById('eligibilityAlert');
  var form        = document.getElementById('loanForm');
  var submitBtn   = document.getElementById('submitBtn');

  if (isPermanent === 'No') {
    alert.classList.add('show');
    submitBtn.disabled = true;
  } else {
    alert.classList.remove('show');
    submitBtn.disabled = false;
  }
}

// ── Toast notification
function showToast(type, title, msg) {
  var t = document.getElementById('toast');
  document.getElementById('toastIcon').textContent  = type === 'success' ? '\u2705' : '\u274C';
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent   = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(function () { t.classList.remove('show'); }, 6000);
}

// ── Field validation
function validate(el) {
  var ok = el.value.trim() !== '';
  el.classList.toggle('invalid', !ok);
  return ok;
}

function validateEmail(el) {
  var val = el.value.trim();
  var ok  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  el.classList.toggle('invalid', !ok);
  return ok;
}

// ── Get selected loan purposes (appends "Other: …" if Other is checked)
function getLoanPurposes() {
  var checked = document.querySelectorAll('#loanPurposeGroup input:checked');
  var values  = Array.prototype.map.call(checked, function (c) {
    if (c.value === 'Other') {
      var spec = document.getElementById('otherPurpose').value.trim();
      return spec ? 'Other (' + spec + ')' : 'Other';
    }
    return c.value;
  });
  return values.join(', ') || 'Not specified';
}

// ── Build formatted HTML snapshot for email body
function buildFormSnapshot(d) {
  function row(label, value) {
    return '<tr>'
      + '<td style="padding:9px 14px;font-size:13px;color:#6B6B6B;font-weight:600;'
      + 'text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;'
      + 'border-bottom:1px solid #F0EDE8;width:38%">' + label + '</td>'
      + '<td style="padding:9px 14px;font-size:14px;color:#1E1E1E;'
      + 'border-bottom:1px solid #F0EDE8;">' + value + '</td>'
      + '</tr>';
  }

  var debtRow = d.is_indebted === 'Yes' ? row('Debt Details', d.debt_details) : '';

  return ''
    + '<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #E0DBD6;">'

    // Header
    + '<div style="background:#1E1E1E;padding:24px 28px;border-bottom:3px solid #C8401A;">'
    +   '<p style="margin:0;font-size:11px;color:#C8401A;letter-spacing:2px;text-transform:uppercase;font-weight:600;">SohCahToa Holdings Limited</p>'
    +   '<h1 style="margin:6px 0 0;font-size:22px;color:#fff;font-weight:700;">New Loan Application</h1>'
    +   '<p style="margin:4px 0 0;font-size:12px;color:#888;">Submitted: ' + d.submitted_at + '</p>'
    + '</div>'

    // Section 1 — Employee Info
    + '<div style="padding:20px 28px 8px;background:#FFF5F2;">'
    +   '<p style="margin:0;font-size:11px;font-weight:700;color:#C8401A;letter-spacing:1.5px;text-transform:uppercase;">&#9679; Employee Information</p>'
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse;">'
    +   row('Full Name',       d.applicant_name)
    +   row('Email Address',   d.employee_email)
    +   row('Department',      d.department)
    +   row('Designation',     d.designation)
    +   row('Date Employed',   d.date_employed)
    +   row('Permanent Staff', d.is_permanent)
    + '</table>'

    // Section 2 — Loan Details
    + '<div style="padding:20px 28px 8px;background:#FFF5F2;margin-top:8px;">'
    +   '<p style="margin:0;font-size:11px;font-weight:700;color:#C8401A;letter-spacing:1.5px;text-transform:uppercase;">&#9679; Loan Details</p>'
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse;">'
    +   row('Loan Amount',         d.loan_amount)
    +   row('Monthly Salary',      d.monthly_salary)
    +   row('Loan Purpose',        d.loan_purpose)
    +   row('Repayment Period',    d.repayment_period)
    +   row('Monthly Repayment',   d.monthly_repayment)
    +   row('Indebted to Company', d.is_indebted)
    +   debtRow
    + '</table>'

    // Consent
    + '<div style="padding:16px 28px;background:#F7F5F2;margin-top:8px;border-top:1px solid #E0DBD6;">'
    +   '<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#C8401A;letter-spacing:1.5px;text-transform:uppercase;">&#9679; Consent</p>'
    +   '<p style="margin:0;font-size:13px;color:#555;">&#10003;&nbsp; Employee agreed to salary deduction and repayment terms.</p>'
    +   '<p style="margin:4px 0 0;font-size:13px;color:#555;">&#10003;&nbsp; Employee certified that all information is accurate and complete.</p>'
    + '</div>'

    // Footer
    + '<div style="padding:14px 28px;background:#1E1E1E;text-align:center;">'
    +   '<p style="margin:0;font-size:11px;color:#666;">This application was submitted via the SohCahToa HR Loan Portal &mdash; 196 Bishop Oluwole St, Victoria Island, Lagos</p>'
    + '</div>'

    + '</div>';
}

// ══════════════════════════════════════════════
//  INIT — wire up all events after DOM ready
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {

  // Comma formatting on amount inputs
  attachNumberFormatter('loanAmount');
  attachNumberFormatter('monthlySalary');

  // Auto-recalculate repayment when amount, period, or department changes
  document.getElementById('loanAmount').addEventListener('input', recalcRepayment);
  document.getElementById('repaymentPeriod').addEventListener('change', recalcRepayment);
  document.getElementById('department').addEventListener('change', recalcRepayment);

  document.getElementById('employeeEmail').addEventListener('blur', function () {
    if (this.value.trim() !== '') {
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value.trim());
      this.classList.toggle('invalid', !ok);
      var errMsg = this.parentElement.querySelector('.err-msg');
      errMsg.style.display = ok ? 'none' : 'block';
    }
  });

  // Eligibility check on permanent staff selection
  document.getElementById('isPermanent').addEventListener('change', checkEligibility);

  // Show/hide "Other" purpose text box
  document.querySelectorAll('#loanPurposeGroup input[type=checkbox]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      var otherChecked = document.querySelector('#loanPurposeGroup input[value="Other"]').checked;
      var wrapper      = document.getElementById('otherPurposeWrapper');
      var otherInput   = document.getElementById('otherPurpose');
      wrapper.style.display = otherChecked ? 'block' : 'none';
      if (!otherChecked) otherInput.value = '';
      otherInput.classList.remove('invalid');
    });
  });

  // Show/hide debt details
  document.getElementById('isIndebted').addEventListener('change', function () {
    document.getElementById('debtDetailsWrapper').style.display =
      this.value === 'Yes' ? 'block' : 'none';
  });

  // ── FORM SUBMIT
  document.getElementById('loanForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    // Block ineligible staff
    if (document.getElementById('isPermanent').value === 'No') {
      showToast('error', 'Not Eligible', 'Only confirmed permanent staff can apply for a loan.');
      return;
    }

    var requiredFields = [
      'title', 'firstName', 'lastName', 'department',
      'designation', 'dateEmployed', 'isPermanent',
      'loanAmount', 'monthlySalary', 'repaymentPeriod', 'isIndebted'
    ];

    var valid = true;
    requiredFields.forEach(function (id) {
      if (!validate(document.getElementById(id))) valid = false;
    });

    if (!validateEmail(document.getElementById('employeeEmail'))) valid = false;

    // Validate "Other" purpose text if Other is checked
    var otherChecked = document.querySelector('#loanPurposeGroup input[value="Other"]').checked;
    if (otherChecked) {
      var otherEl = document.getElementById('otherPurpose');
      if (!validate(otherEl)) valid = false;
    }

    if (!document.getElementById('consent1').checked ||
        !document.getElementById('consent2').checked) {
      showToast('error', 'Consent Required', 'Please agree to both consent statements before submitting.');
      return;
    }

    if (!valid) {
      showToast('error', 'Missing Fields', 'Please complete all required fields highlighted in red.');
      return;
    }

    var btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.classList.add('loading');
    btn.childNodes[0].textContent = 'Sending\u2026 ';

    // Capture form screenshot before building data
    var screenshotDataUrl = '';
    try {
      var canvas = await html2canvas(document.getElementById('loanForm'), {
        scale: 0.6,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      // Resize to max 560px wide to keep base64 under EmailJS 50KB limit
      var maxW = 560;
      var ratio = Math.min(1, maxW / canvas.width);
      var resized = document.createElement('canvas');
      resized.width  = Math.round(canvas.width  * ratio);
      resized.height = Math.round(canvas.height * ratio);
      resized.getContext('2d').drawImage(canvas, 0, 0, resized.width, resized.height);
      screenshotDataUrl = resized.toDataURL('image/jpeg', 0.45);
    } catch (screenshotErr) {
      console.warn('Screenshot capture failed:', screenshotErr);
    }

    var loanAmountRaw    = parseFormattedNumber(document.getElementById('loanAmount').value);
    var salaryRaw        = parseFormattedNumber(document.getElementById('monthlySalary').value);
    var repaymentRaw     = parseFormattedNumber(document.getElementById('monthlyRepayment').value);

    var data = {
      hr_email:          HR_GROUP_EMAIL,
      cc_email:          document.getElementById('employeeEmail').value,
      applicant_name:    document.getElementById('title').value + ' '
                       + document.getElementById('firstName').value + ' '
                       + document.getElementById('lastName').value,
      employee_email:    document.getElementById('employeeEmail').value,
      department:        document.getElementById('department').value,
      designation:       document.getElementById('designation').value,
      date_employed:     document.getElementById('dateEmployed').value,
      is_permanent:      document.getElementById('isPermanent').value,
      loan_amount:       '\u20A6' + loanAmountRaw.toLocaleString('en-NG'),
      monthly_salary:    '\u20A6' + salaryRaw.toLocaleString('en-NG'),
      loan_purpose:      getLoanPurposes(),
      repayment_period:  document.getElementById('repaymentPeriod').value,
      monthly_repayment: '\u20A6' + repaymentRaw.toLocaleString('en-NG'),
      is_indebted:       document.getElementById('isIndebted').value,
      debt_details:      document.getElementById('isIndebted').value === 'Yes'
                           ? (document.getElementById('debtDetails').value || 'Not provided')
                           : 'N/A',
      submitted_at:      new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
    };

    data.form_snapshot = buildFormSnapshot(data);


    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, data);
      showToast('success', 'Application Submitted!', 'HR has been notified. You will be contacted shortly.');
      document.getElementById('loanForm').reset();
      document.getElementById('debtDetailsWrapper').style.display = 'none';
      document.getElementById('otherPurposeWrapper').style.display = 'none';
      document.getElementById('monthlyRepayment').value = '';
      document.getElementById('eligibilityAlert').classList.remove('show');
      document.querySelectorAll('.invalid').forEach(function (el) { el.classList.remove('invalid'); });
    } catch (err) {
      console.error('EmailJS error:', err);
      showToast('error', 'Submission Failed', 'Please try again or contact HR directly.');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.childNodes[0].textContent = 'Send Application ';
    }
  });

});