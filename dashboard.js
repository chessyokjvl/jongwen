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
// View 1: หน้าจองเวรส่วนตัว (Calendar Grid View)
// ==========================================
function renderMyBookingView(year, month) {
    const gridContainer = document.getElementById('myBookingGrid');
    gridContainer.innerHTML = '';
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 (อาทิตย์) ถึง 6 (เสาร์)
    const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    let html = `<div class="calendar-grid w-100">`;
    
    // สร้างหัวตารางวัน (อา-ส)
    dayNames.forEach(d => html += `<div class="cal-header ${d==='อา'||d==='ส' ? 'text-danger' : ''}">${d}</div>`);

    // สร้างช่องว่างสำหรับวันก่อนเริ่มต้นเดือน
    for (let i = 0; i < firstDayOfWeek; i++) {
        html += `<div class="cal-cell empty"></div>`;
    }

    // สร้างช่องวันที่ 1 ถึงสิ้นเดือน
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        
        const isBlocked = blockedDatesList.find(b => b.date === dateStr);
        const shiftsToday = allShifts.filter(s => s.date.startsWith(dateStr));
        const myShiftsToday = shiftsToday.filter(s => s.uid === currentUser.uid);

        let cellContent = `<span class="cal-date-num ${isWeekend ? 'cal-weekend' : ''}">${day}</span>`;

        if (isBlocked) {
            cellContent += `<div class="cal-badge bg-danger text-white mt-1">🚫 งดจัด</div>`;
        } else if (myShiftsToday.length > 0) {
            myShiftsToday.forEach(s => {
                cellContent += `<div class="cal-badge bg-primary text-white">✅ ${s.period[0]}${s.line}</div>`;
            });
        } else {
            // เช็คว่ามีเวรว่างที่สิทธิ์เราจองได้ไหม
            const elig = checkEligibility(currentUser, dayOfWeek);
            const hasM1 = shiftsToday.find(s => s.period === 'เช้า' && s.line == '1');
            const hasM2 = shiftsToday.find(s => s.period === 'เช้า' && s.line == '2');
            const hasA1 = shiftsToday.find(s => s.period === 'บ่าย' && s.line == '1');
            const hasA2 = shiftsToday.find(s => s.period === 'บ่าย' && s.line == '2');

            let availableCount = 0;
            if (elig.canM1 && !hasM1) availableCount++;
            if (elig.canM2 && !hasM2) availableCount++;
            if (elig.canA1 && !hasA1) availableCount++;
            if (elig.canA2 && !hasA2) availableCount++;

            if (availableCount > 0) {
                cellContent += `<div class="cal-badge bg-success text-white">ว่าง ${availableCount} กะ</div>`;
            } else {
                cellContent += `<div class="cal-badge bg-secondary text-white opacity-50">เต็ม/ไม่มีสิทธิ์</div>`;
            }
        }

        // เมื่อกดที่ช่องวันที่ ให้เปิด Modal รายละเอียดการจอง
        html += `<div class="cal-cell" onclick="openDailyBookingModal('${dateStr}', ${dayOfWeek})">${cellContent}</div>`;
    }

    html += `</div>`;
    gridContainer.innerHTML = html;
}

// ==========================================
// ฟังก์ชันเปิด Modal จองเวรรายวัน (แทนที่ระบบ Card เก่า)
// ==========================================
function openDailyBookingModal(dateStr, dayOfWeek) {
    const isBlocked = blockedDatesList.find(b => b.date === dateStr);
    if (isBlocked) {
        Swal.fire('งดจัดเวร', `วันที่ ${dateStr} งดจัดเวรเนื่องจาก: ${isBlocked.reason}`, 'info');
        return;
    }

    const elig = checkEligibility(currentUser, dayOfWeek);
    const shiftsToday = allShifts.filter(s => s.date.startsWith(dateStr));
    const myShiftsToday = shiftsToday.filter(s => s.uid === currentUser.uid);

    let html = `<div class="text-start mb-3">
                    <p class="mb-2 fw-bold text-primary">สิทธิ์ของคุณในวันนี้:</p>`;

    // แสดงเวรที่ตัวเองมีแล้ว
    if (myShiftsToday.length > 0) {
        myShiftsToday.forEach(s => {
            html += `<button class="btn btn-primary btn-sm w-100 mb-2 disabled">✅ คุณมีเวร: ${s.period} สาย ${s.line}</button>`;
        });
        html += `<hr>`;
    }

    // สร้างปุ่มจองสำหรับกะที่ว่าง
    const renderBtn = (canBook, shiftData, period, line, btnClass) => {
        if (!canBook) return '';
        if (shiftData) return `<button class="btn btn-outline-secondary btn-sm w-100 mb-2 disabled">❌ ${period} สาย ${line} (เต็มแล้ว)</button>`;
        return `<button class="btn ${btnClass} btn-sm w-100 mb-2 fw-bold" onclick="Swal.close(); quickBook('${dateStr}', '${period}', '${line}', ${elig.isHoliday})">👉 จองเวร: ${period} สาย ${line}</button>`;
    };

    html += renderBtn(elig.canM1, shiftsToday.find(s => s.period === 'เช้า' && s.line == '1'), 'เช้า', '1', 'btn-outline-info');
    html += renderBtn(elig.canM2, shiftsToday.find(s => s.period === 'เช้า' && s.line == '2'), 'เช้า', '2', 'btn-outline-warning');
    html += renderBtn(elig.canA1, shiftsToday.find(s => s.period === 'บ่าย' && s.line == '1'), 'บ่าย', '1', 'btn-outline-success');
    html += renderBtn(elig.canA2, shiftsToday.find(s => s.period === 'บ่าย' && s.line == '2'), 'บ่าย', '2', 'btn-outline-danger');
    
    html += `</div>`;

    // เช็คว่ามีปุ่มให้กดไหม
    if (!html.includes('👉 จองเวร')) {
        html += `<div class="alert alert-secondary p-2 text-center">ไม่มีกะว่างที่คุณสามารถจองได้ในวันนี้</div>`;
    }

    Swal.fire({
        title: `เวรประจำวันที่ ${dateStr}`,
        html: html,
        showConfirmButton: false,
        showCloseButton: true
    });
}
// ==========================================
// View 2: หน้าตารางรวม (Master Schedule - สำหรับ Admin)
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
                tdDay.className += ' bg-danger bg-opacity-10 text-danger text-center align-middle';
                tdDay.innerHTML = `<span style="font-size: 0.7rem; font-weight: bold; opacity: 0.7;">🚫</span>`;
                tdDay.title = isBlocked.reason; 
            } else {
                // วาด Badge ถ้ามีเวรอยู่แล้ว
                if (userShiftsToday.length > 0) {
                    userShiftsToday.forEach(shift => {
                        const badge = document.createElement('div');
                        let lbl = '', cls = '';
                        if (shift.period === 'เช้า' && shift.line == '1') { lbl = 'ช1'; cls = 'shift-m1'; }
                        else if (shift.period === 'เช้า' && shift.line == '2') { lbl = 'ช2'; cls = 'shift-m2'; }
                        else if (shift.period === 'บ่าย' && shift.line == '1') { lbl = 'บ1'; cls = 'shift-a1'; }
                        else if (shift.period === 'บ่าย' && shift.line == '2') { lbl = 'บ2'; cls = 'shift-a2'; }
                        badge.className = `badge ${cls} m-1 p-2 w-100`;
                        badge.innerText = lbl;
                        tdDay.appendChild(badge);
                    });
                } else {
                    tdDay.className += ' shift-empty';
                }

                // =====================================
                // เปิดให้ Admin (หรือตัวเอง) คลิกจัดการได้ทุกช่อง
                // =====================================
                if (currentUser.role === 'Admin' || currentUser.uid === user.uid) {
                    tdDay.style.cursor = 'pointer';
                    // เพิ่ม hover effect ให้รู้ว่าคลิกได้
                    tdDay.onmouseover = () => tdDay.style.backgroundColor = '#e2e6ea';
                    tdDay.onmouseout = () => tdDay.style.backgroundColor = '';
                    
                    tdDay.onclick = () => manageShiftModal(user, dateStr, dateObj.getDay(), userShiftsToday);
                }
            }
            tr.appendChild(tdDay);
        }
        tbody.appendChild(tr);
    });
}

// ==========================================
// ฟังก์ชันจัดการเวร (เพิ่ม/ลบ) ในตารางรวม
// ==========================================
function manageShiftModal(targetUser, dateStr, dayOfWeek, existingShifts) {
    const elig = checkEligibility(targetUser, dayOfWeek);
    const shiftsToday = allShifts.filter(s => s.date.startsWith(dateStr));
    
    let html = `<div class="text-start">`;

    // 1. ส่วนลบเวร: โชว์เวรที่คนนี้มีอยู่ พร้อมปุ่มกดยกเลิก
    if (existingShifts.length > 0) {
        html += `<p class="fw-bold text-danger mb-2">เวรที่จัดไว้แล้ว (คลิกเพื่อยกเลิก):</p>`;
        existingShifts.forEach(s => {
            html += `<button class="btn btn-outline-danger btn-sm w-100 mb-2" onclick="Swal.close(); deleteShiftBooking('${s.shiftId}')">
                        🗑️ ยกเลิกเวร ${s.period} สาย ${s.line}
                     </button>`;
        });
        html += `<hr>`;
    }

    // 2. ส่วนเพิ่มเวร: โชว์เฉพาะกะที่ยังว่างและมีสิทธิ์
    const hasM1 = shiftsToday.find(s => s.period === 'เช้า' && s.line == '1');
    const hasM2 = shiftsToday.find(s => s.period === 'เช้า' && s.line == '2');
    const hasA1 = shiftsToday.find(s => s.period === 'บ่าย' && s.line == '1');
    const hasA2 = shiftsToday.find(s => s.period === 'บ่าย' && s.line == '2');

    let optionsHTML = '';
    if (elig.canM1 && !hasM1) optionsHTML += `<div class="form-check"><input class="form-check-input" type="radio" name="shiftOption" value="เช้า|1" id="m1"><label class="form-check-label text-primary fw-bold" for="m1">เพิ่มเวรเช้า - สาย 1</label></div>`;
    if (elig.canM2 && !hasM2) optionsHTML += `<div class="form-check"><input class="form-check-input" type="radio" name="shiftOption" value="เช้า|2" id="m2"><label class="form-check-label text-warning fw-bold" for="m2">เพิ่มเวรเช้า - สาย 2</label></div>`;
    if (elig.canA1 && !hasA1) optionsHTML += `<div class="form-check"><input class="form-check-input" type="radio" name="shiftOption" value="บ่าย|1" id="a1"><label class="form-check-label text-success fw-bold" for="a1">เพิ่มเวรบ่าย - สาย 1</label></div>`;
    if (elig.canA2 && !hasA2) optionsHTML += `<div class="form-check"><input class="form-check-input" type="radio" name="shiftOption" value="บ่าย|2" id="a2"><label class="form-check-label text-danger fw-bold" for="a2">เพิ่มเวรบ่าย - สาย 2</label></div>`;

    if (optionsHTML !== '') {
        html += `<p class="fw-bold text-success mb-2">จัดเวรเพิ่ม:</p>`;
        html += `<div class="p-3 border rounded bg-light">${optionsHTML}</div>`;
    } else {
        html += `<div class="alert alert-secondary p-2 mt-2 text-center">ไม่มีกะว่างให้เพิ่ม หรือถูกจำกัดสิทธิ์ในวันนี้</div>`;
    }

    html += `</div>`;

    Swal.fire({
        title: `จัดการเวร: ${targetUser.fullName}`,
        html: html,
        showCancelButton: true,
        showConfirmButton: optionsHTML !== '', // ซ่อนปุ่ม Confirm ถ้าไม่มีอะไรให้เพิ่ม
        confirmButtonText: 'บันทึกเวรใหม่',
        cancelButtonText: 'ปิด',
        preConfirm: () => {
            const selected = document.querySelector('input[name="shiftOption"]:checked');
            if (!selected) { Swal.showValidationMessage('กรุณาเลือกกะที่ต้องการเพิ่ม หรือกดปิด'); return false; }
            return selected.value;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const [period, line] = result.value.split('|');
            submitShiftBooking(targetUser.uid, dateStr, elig.isHoliday ? 'วันหยุด' : 'วันธรรมดา', period, line);
        }
    });
}

// ==========================================
// ฟังก์ชันเรียก API สำหรับลบเวร
// ==========================================
async function deleteShiftBooking(shiftId) {
    Swal.fire({
        title: 'ยืนยันการยกเลิก?',
        text: "คุณต้องการยกเลิกเวรนี้ใช่หรือไม่ (ไม่สามารถกู้คืนได้)",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete_shift', data: { shiftId } }) });
                const resultData = await res.json();
                if (resultData.status === 'success') {
                    Swal.fire('ลบสำเร็จ!', '', 'success').then(() => loadScheduleData(currentYear, currentMonth));
                } else { Swal.fire('ผิดพลาด', resultData.message, 'error'); }
            } catch (error) { Swal.fire('ข้อผิดพลาด', error.message, 'error'); }
        }
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
