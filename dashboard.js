// ==========================================
// 1. ตั้งค่าพื้นฐานและตัวแปร
// ==========================================
const API_URL = 'https://script.google.com/macros/s/AKfycbyaSbv7j6Bhu-jGGeE7ty9YgXE4YrpNw-13p6LPcbzkjNhyswLTuL5zcEni398qZGUU/exec'; 
let currentUser = null;
let currentYear = 2026;
let currentMonth = 3; 
let allUsers = [];
let allShifts = [];
let blockedDatesList = []; // เพิ่มตัวแปรเก็บวันงดจัดเวร

const departmentOrder = ['จิตวิทยา', 'สังคมสงเคราะห์', 'การพยาบาลผู้ป่วยนอก', 'การพยาบาลจิตเวชชุมชนและสารเสพติด', 'การพยาบาลผู้ป่วยพิเศษ/รักษาด้วยไฟฟ้า'];

// ==========================================
// เริ่มต้นระบบ
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const userData = localStorage.getItem('user1323');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = JSON.parse(userData);
    document.getElementById('displayUserName').innerText = currentUser.fullName + (currentUser.role === 'Admin' ? ' (Admin)' : '');
    document.getElementById('displayDepartment').innerText = currentUser.department;

    setupMonthSelector();
    loadScheduleData(currentYear, currentMonth);
});

async function loadScheduleData(year, month) {
    Swal.fire({ title: 'กำลังโหลดข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_schedule', data: { year, month } }) });
        const result = await response.json();
        if (result.status === 'success') {
            allUsers = result.users;
            allShifts = result.shifts || [];
            blockedDatesList = result.blockedDates || []; // รับข้อมูลวันงดจัดเวร
            
            // Render ทั้ง 3 หน้าต่าง
            renderMasterSchedule(year, month);
            renderMyBookingView(year, month);
            if(document.getElementById('statsBody')) renderStatsTable(); // สร้างตารางสถิติ

            Swal.close();
        } else { Swal.fire('ผิดพลาด', result.message, 'error'); }
    } catch (error) { Swal.fire('ข้อผิดพลาด', error.message, 'error'); }
}

// ==========================================
// ลอจิกตรวจสอบสิทธิ์การจอง (Business Logic)
// ==========================================
function checkEligibility(user, dayOfWeek) {
    const isHoliday = (dayOfWeek === 0 || dayOfWeek === 6);
    const dept = user.department;
    const cond = user.conditions || "";
    let canM1 = false, canM2 = false, canA1 = true, canA2 = true; 

    if (!isHoliday) {
        if (dayOfWeek === 1 && dept === 'การพยาบาลผู้ป่วยนอก') canM1 = true;
        if (dayOfWeek === 2 && dept === 'จิตวิทยา') canM1 = true;
        if (dayOfWeek === 3 && dept === 'การพยาบาลจิตเวชชุมชนและสารเสพติด') canM1 = true;
        if (dayOfWeek === 4 && dept === 'การพยาบาลผู้ป่วยพิเศษ/รักษาด้วยไฟฟ้า') canM2 = true; 
        if (dayOfWeek === 5 && dept === 'สังคมสงเคราะห์') canM1 = true;
    } else {
        canM1 = true; canM2 = true;
    }

    if (cond.includes('งดรับเวรบ่าย')) { canA1 = false; canA2 = false; }
    if (cond.includes('งดรับเวรเช้าวันธรรมดา') && !isHoliday) { canM1 = false; canM2 = false; }
    if (cond.includes('รับเฉพาะเวรเช้าวันธรรมดา')) { canA1 = false; canA2 = false; if (isHoliday) { canM1 = false; canM2 = false; } }
    if (cond.includes('รับเฉพาะเวรสาย 2')) { canM1 = false; canA1 = false; }
    if (cond.includes('รับเฉพาะเวรเช้าวันพฤหัส')) {
        if (dayOfWeek !== 4) { canM1 = false; canM2 = false; canA1 = false; canA2 = false; }
        if (isHoliday && cond.includes('วันหยุดรับเดือนละ 1 เวรเช้า')) { canM1 = true; canM2 = true; }
    }
    return { canM1, canM2, canA1, canA2, isHoliday };
}

// ==========================================
// View 1: หน้าจองเวรส่วนตัว (Card View)
// ==========================================
function renderMyBookingView(year, month) {
    const grid = document.getElementById('myBookingGrid');
    grid.innerHTML = '';
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const elig = checkEligibility(currentUser, dayOfWeek);
        
        // เช็คว่าวันนี้เป็นวันงดจัดเวรหรือไม่
        const isBlocked = blockedDatesList.find(b => b.date === dateStr);
        
        const shiftsToday = allShifts.filter(s => s.date.startsWith(dateStr));
        const hasM1 = shiftsToday.find(s => s.period === 'เช้า' && s.line == '1');
        const hasM2 = shiftsToday.find(s => s.period === 'เช้า' && s.line == '2');
        const hasA1 = shiftsToday.find(s => s.period === 'บ่าย' && s.line == '1');
        const hasA2 = shiftsToday.find(s => s.period === 'บ่าย' && s.line == '2');
        const myShiftsToday = shiftsToday.filter(s => s.uid === currentUser.uid);

        const col = document.createElement('div');
        col.className = 'col-md-4 col-lg-3 mb-3';
        
        let cardBg = elig.isHoliday ? 'bg-danger text-white bg-opacity-10' : 'bg-white';
        let html = `
            <div class="card shadow-sm h-100 ${cardBg} border-0" style="border-radius: 12px;">
                <div class="card-body p-3">
                    <h6 class="card-title fw-bold border-bottom pb-2 mb-3">
                        ${dayNames[dayOfWeek]}ที่ ${day} <span class="text-muted" style="font-size:0.8rem">${dateStr}</span>
                    </h6>
                    <div class="d-grid gap-2">
        `;

        if (isBlocked) {
            // ถ้าเป็นวันงดจัดเวร จะแสดงกล่องข้อความสีแดงและไม่มีปุ่มให้กด
            html += `<div class="alert alert-danger p-3 text-center mb-0" style="border-radius: 8px;">
                        <span style="font-size: 2rem;">🚫</span><br>
                        <strong class="text-danger mt-2 d-block">งดจัดเวร</strong>
                        <span style="font-size: 0.85rem;">(${isBlocked.reason})</span>
                     </div>`;
        } else {
            // ถ้าไม่ใช่วันงดจัดเวร ให้แสดงปุ่มตามปกติ
            if (myShiftsToday.length > 0) {
                myShiftsToday.forEach(s => {
                    html += `<button class="btn btn-primary btn-sm disabled">✅ คุณมีเวร: ${s.period} สาย ${s.line}</button>`;
                });
            }

            if (elig.canM1) {
                if (hasM1) html += `<button class="btn btn-outline-secondary btn-sm disabled">❌ เช้า สาย 1 (เต็มแล้ว)</button>`;
                else html += `<button class="btn btn-outline-info btn-sm fw-bold" onclick="quickBook('${dateStr}', 'เช้า', '1', ${elig.isHoliday})">ว่าง: จองเช้า สาย 1</button>`;
            }
            if (elig.canM2) {
                if (hasM2) html += `<button class="btn btn-outline-secondary btn-sm disabled">❌ เช้า สาย 2 (เต็มแล้ว)</button>`;
                else html += `<button class="btn btn-outline-warning btn-sm fw-bold" onclick="quickBook('${dateStr}', 'เช้า', '2', ${elig.isHoliday})">ว่าง: จองเช้า สาย 2</button>`;
            }
            if (elig.canA1) {
                if (hasA1) html += `<button class="btn btn-outline-secondary btn-sm disabled">❌ บ่าย สาย 1 (เต็มแล้ว)</button>`;
                else html += `<button class="btn btn-outline-success btn-sm fw-bold" onclick="quickBook('${dateStr}', 'บ่าย', '1', ${elig.isHoliday})">ว่าง: จองบ่าย สาย 1</button>`;
            }
            if (elig.canA2) {
                if (hasA2) html += `<button class="btn btn-outline-secondary btn-sm disabled">❌ บ่าย สาย 2 (เต็มแล้ว)</button>`;
                else html += `<button class="btn btn-outline-danger btn-sm fw-bold" onclick="quickBook('${dateStr}', 'บ่าย', '2', ${elig.isHoliday})">ว่าง: จองบ่าย สาย 2</button>`;
            }
        }

        html += `</div></div></div>`;
        col.innerHTML = html;
        grid.appendChild(col);
    }
}

// ==========================================
// View 2: หน้าตารางรวม (Table View)
// ==========================================
function renderMasterSchedule(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    renderCalendarHeader(year, month); 

    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = ''; 

    allUsers.sort((a, b) => {
        let indexA = departmentOrder.indexOf(a.department);
        let indexB = departmentOrder.indexOf(b.department);
        if(indexA === -1) indexA = 99; if(indexB === -1) indexB = 99;
        return indexA - indexB;
    });

    let seq = 1;
    allUsers.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="sticky-col-1 fw-bold text-center">${seq++}</td>
                        <td class="sticky-col-2">${user.fullName}</td>
                        <td class="sticky-col-3 text-muted" style="font-size:0.8rem">${user.position}</td>`;

        for (let day = 1; day <= daysInMonth; day++) {
            const tdDay = document.createElement('td');
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(year, month - 1, day);
            if (dateObj.getDay() === 0 || dateObj.getDay() === 6) tdDay.classList.add('weekend-col');

            const isBlocked = blockedDatesList.find(b => b.date === dateStr);
            const userShiftsToday = allShifts.filter(s => s.uid === user.uid && s.date.startsWith(dateStr));

            if (isBlocked) {
                // ถ้าเป็นวันงดจัดเวร ให้ช่องตารางเป็นสีเทาแดง และเขียนว่า งดเวร
                tdDay.className += ' bg-danger bg-opacity-10 text-danger text-center align-middle';
                tdDay.innerHTML = `<span style="font-size: 0.7rem; font-weight: bold; opacity: 0.7;">🚫</span>`;
                tdDay.title = isBlocked.reason; // เอาเมาส์ชี้จะเห็นเหตุผล
            } else if (userShiftsToday.length > 0) {
                userShiftsToday.forEach(shift => {
                    const badge = document.createElement('div');
                    let lbl = '', cls = '';
                    if (shift.period === 'เช้า' && shift.line == '1') { lbl = 'ช1'; cls = 'shift-m1'; }
                    else if (shift.period === 'เช้า' && shift.line == '2') { lbl = 'ช2'; cls = 'shift-m2'; }
                    else if (shift.period === 'บ่าย' && shift.line == '1') { lbl = 'บ1'; cls = 'shift-a1'; }
                    else if (shift.period === 'บ่าย' && shift.line == '2') { lbl = 'บ2'; cls = 'shift-a2'; }
                    badge.className = `badge ${cls} m-1 p-2`;
                    badge.innerText = lbl;
                    tdDay.appendChild(badge);
                });
            } else {
                tdDay.className += ' shift-empty';
                if (currentUser.role === 'Admin' || currentUser.uid === user.uid) {
                    tdDay.onclick = () => openAdminBookingModal(user, dateStr, dateObj.getDay());
                }
            }
            tr.appendChild(tdDay);
        }
        tbody.appendChild(tr);
    });
}

// ==========================================
// View 3: หน้าสถิติและค่าตอบแทน (Stats & OT)
// ==========================================
function renderStatsTable() {
    const tbody = document.getElementById('statsBody');
    if (!tbody) return; 
    tbody.innerHTML = '';

    allUsers.forEach(user => {
        const userShifts = allShifts.filter(s => s.uid === user.uid);
        
        let countMorning = 0, countAfternoon = 0, countHoliday = 0, countPaidThisMonth = 0;

        userShifts.forEach(shift => {
            if (shift.period === 'เช้า') countMorning++;
            if (shift.period === 'บ่าย') countAfternoon++;
            if (shift.dayType === 'วันหยุด') countHoliday++;

            // เงื่อนไขได้ OT: เวรบ่าย (ทุกวัน) OR เวรเช้า (เฉพาะวันหยุด)
            if (shift.period === 'บ่าย' || (shift.period === 'เช้า' && shift.dayType === 'วันหยุด')) {
                countPaidThisMonth++;
            }
        });

        // ดึงยอดยกมา (ถ้าไม่มีให้เป็น 0)
        const bfPaid = parseInt(user.bfPaid) || 0;
        const totalCumulativePaid = bfPaid + countPaidThisMonth;
        const estimatedPay = countPaidThisMonth * 650;

        const tr = document.createElement('tr');
        tr.className = "text-center align-middle";
        tr.innerHTML = `
            <td class="text-start">
                <span class="fw-bold">${user.fullName}</span><br>
                <span class="text-muted" style="font-size: 0.75rem;">${user.department}</span>
            </td>
            <td>${countMorning}</td>
            <td>${countAfternoon}</td>
            <td class="text-warning fw-bold">${countHoliday}</td>
            <td class="text-success fw-bold" style="font-size: 1.1rem;">${countPaidThisMonth}</td>
            <td class="text-primary fw-bold">${totalCumulativePaid}</td>
            <td class="text-danger fw-bold" style="font-size: 1.1rem;">${estimatedPay.toLocaleString()} ฿</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// Helpers & Booking Functions
// ==========================================
function renderCalendarHeader(year, month) {
    const headerRow1 = document.getElementById('headerRow1');
    const headerRow2 = document.getElementById('headerRow2');
    const daysInMonth = new Date(year, month, 0).getDate(); 
    const dayNamesThai = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    while (headerRow1.children.length > 3) { headerRow1.lastChild.remove(); }
    headerRow2.innerHTML = '';

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay(); 
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        const thDate = document.createElement('th');
        thDate.innerText = day;
        if (isWeekend) thDate.classList.add('weekend-col', 'text-danger');
        headerRow1.appendChild(thDate);

        const thDayName = document.createElement('th');
        thDayName.innerText = dayNamesThai[dayOfWeek];
        if (isWeekend) thDayName.classList.add('weekend-col', 'text-danger');
        headerRow2.appendChild(thDayName);
    }
}

function setupMonthSelector() {
    const selector = document.getElementById('monthSelector');
    const monthsThai = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    monthsThai.forEach((m, index) => {
        const option = document.createElement('option');
        option.value = index + 1; option.innerText = `${m} ${currentYear + 543}`;
        if (index + 1 === currentMonth) option.selected = true;
        selector.appendChild(option);
    });
    selector.addEventListener('change', (e) => { currentMonth = parseInt(e.target.value); loadScheduleData(currentYear, currentMonth); });
}

function logout() { localStorage.removeItem('user1323'); window.location.href = 'index.html'; }

function quickBook(dateStr, period, line, isHoliday) {
    Swal.fire({
        title: 'ยืนยันการจองเวร',
        text: `คุณต้องการจองเวร ${period} สาย ${line} วันที่ ${dateStr} ใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ใช่, จองเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) submitShiftBooking(currentUser.uid, dateStr, isHoliday ? 'วันหยุด' : 'วันธรรมดา', period, line);
    });
}

function openAdminBookingModal(targetUser, dateStr, dayOfWeek) {
    const elig = checkEligibility(targetUser, dayOfWeek);
    let optionsHTML = '';
    
    const shiftsToday = allShifts.filter(s => s.date.startsWith(dateStr));
    const hasM1 = shiftsToday.find(s => s.period === 'เช้า' && s.line == '1');
    const hasM2 = shiftsToday.find(s => s.period === 'เช้า' && s.line == '2');
    const hasA1 = shiftsToday.find(s => s.period === 'บ่าย' && s.line == '1');
    const hasA2 = shiftsToday.find(s => s.period === 'บ่าย' && s.line == '2');

    if (elig.canM1 && !hasM1) optionsHTML += `<div class="form-check text-start"><input class="form-check-input" type="radio" name="shiftOption" value="เช้า|1" id="m1"><label class="form-check-label text-primary fw-bold" for="m1">เวรเช้า - สาย 1</label></div>`;
    if (elig.canM2 && !hasM2) optionsHTML += `<div class="form-check text-start"><input class="form-check-input" type="radio" name="shiftOption" value="เช้า|2" id="m2"><label class="form-check-label text-warning fw-bold" for="m2">เวรเช้า - สาย 2</label></div>`;
    if (elig.canA1 && !hasA1) optionsHTML += `<div class="form-check text-start"><input class="form-check-input" type="radio" name="shiftOption" value="บ่าย|1" id="a1"><label class="form-check-label text-success fw-bold" for="a1">เวรบ่าย - สาย 1</label></div>`;
    if (elig.canA2 && !hasA2) optionsHTML += `<div class="form-check text-start"><input class="form-check-input" type="radio" name="shiftOption" value="บ่าย|2" id="a2"><label class="form-check-label text-danger fw-bold" for="a2">เวรบ่าย - สาย 2</label></div>`;

    if (optionsHTML === '') {
        Swal.fire('ไม่มีคิวว่าง', `ไม่มีกะว่างที่คุณสามารถจองได้ในวันที่ ${dateStr}`, 'error'); return;
    }

    Swal.fire({
        title: `จัดเวรให้ ${targetUser.fullName}`,
        html: `<div class="p-3 border rounded bg-light">${optionsHTML}</div>`,
        showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const selected = document.querySelector('input[name="shiftOption"]:checked');
            if (!selected) { Swal.showValidationMessage('กรุณาเลือกกะการทำงาน'); return false; }
            return selected.value;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const [period, line] = result.value.split('|');
            submitShiftBooking(targetUser.uid, dateStr, elig.isHoliday ? 'วันหยุด' : 'วันธรรมดา', period, line);
        }
    });
}

async function submitShiftBooking(uid, date, dayType, period, line) {
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'book_shift', data: { uid, date, dayType, period, line } }) });
        const result = await res.json();
        if (result.status === 'success') {
            Swal.fire('สำเร็จ!', '', 'success').then(() => loadScheduleData(currentYear, currentMonth));
        } else { Swal.fire('ผิดพลาด', result.message, 'error'); }
    } catch (error) { Swal.fire('ข้อผิดพลาด', error.message, 'error'); }
}

function exportExcel() {
    Swal.fire({ title: 'กำลังสร้างไฟล์ Excel...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
    try {
        const table = document.getElementById("scheduleTable");
        const wb = XLSX.utils.table_to_book(table, { sheet: "ตารางเวร 1323", raw: true });
        const monthSelector = document.getElementById("monthSelector");
        const monthName = monthSelector.options[monthSelector.selectedIndex].text;
        XLSX.writeFile(wb, `ตารางเวร_1323_${monthName.replace(' ', '_')}.xlsx`);
        Swal.close();
    } catch (error) { Swal.fire('ข้อผิดพลาด', 'ไม่สามารถ Export ไฟล์ได้: ' + error.message, 'error'); }
}
