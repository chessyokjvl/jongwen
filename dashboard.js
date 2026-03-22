// ==========================================
// 1. ตั้งค่าพื้นฐานและตัวแปร
// ==========================================
// ** อย่าลืมเปลี่ยน API_URL เป็นของ Web App คุณ **
const API_URL = 'https://script.google.com/macros/s/AKfycbyaSbv7j6Bhu-jGGeE7ty9YgXE4YrpNw-13p6LPcbzkjNhyswLTuL5zcEni398qZGUU/exec'; 
let currentUser = null;
let currentYear = 2026;
let currentMonth = 3; // เดือนมีนาคม (1-12)
let allUsers = [];
let allShifts = [];

// ลำดับกลุ่มงานตามที่กำหนด
const departmentOrder = [
    'จิตวิทยา', 
    'สังคมสงเคราะห์', 
    'การพยาบาลผู้ป่วยนอก', 
    'การพยาบาลจิตเวชชุมชนและสารเสพติด', 
    'การพยาบาลผู้ป่วยพิเศษ/รักษาด้วยไฟฟ้า'
];

// ==========================================
// 2. เริ่มต้นระบบเมื่อโหลดหน้าเว็บ
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const userData = localStorage.getItem('user1323');
    
    if (!userData) {
        Swal.fire({ icon: 'warning', title: 'กรุณาเข้าสู่ระบบ', text: 'คุณไม่ได้รับสิทธิ์เข้าถึงหน้านี้' })
        .then(() => { window.location.href = 'index.html'; });
        return;
    }

    currentUser = JSON.parse(userData);
    document.getElementById('displayUserName').innerText = currentUser.fullName;
    document.getElementById('displayDepartment').innerText = currentUser.department;

    // สร้างตัวเลือกเดือน
    setupMonthSelector();

    // โหลดข้อมูลตารางเวร
    loadScheduleData(currentYear, currentMonth);
});

// ==========================================
// 3. ฟังก์ชันดึงข้อมูลจาก API
// ==========================================
async function loadScheduleData(year, month) {
    Swal.fire({ title: 'กำลังโหลดข้อมูลตารางเวร...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'get_schedule',
                data: { year: year, month: month }
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            allUsers = result.users;
            allShifts = result.shifts || [];
            
            // วาดตารางใหม่
            renderCalendarHeader(year, month);
            renderScheduleBody(year, month);
            
            Swal.close();
        } else {
            Swal.fire('ผิดพลาด', result.message, 'error');
        }
    } catch (error) {
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ' + error.message, 'error');
    }
}

// ==========================================
// 4. วาดหัวตาราง (วันที่และชื่อวัน)
// ==========================================
function renderCalendarHeader(year, month) {
    const headerRow1 = document.getElementById('headerRow1');
    const headerRow2 = document.getElementById('headerRow2');
    
    // JS Date ใช้เดือน 0-11 ดังนั้นต้องลบ 1
    const daysInMonth = new Date(year, month, 0).getDate(); 
    const dayNamesThai = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    // ล้างข้อมูลคอลัมน์วันที่เก่า (เก็บ 3 คอลัมน์แรกไว้)
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

// ==========================================
// 5. วาดข้อมูลบุคลากรและการจองเวร
// ==========================================
function renderScheduleBody(year, month) {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = ''; // ล้างข้อมูลเก่า
    const daysInMonth = new Date(year, month, 0).getDate();

    // จัดเรียงบุคลากรตามกลุ่มงาน
    allUsers.sort((a, b) => {
        let indexA = departmentOrder.indexOf(a.department);
        let indexB = departmentOrder.indexOf(b.department);
        // ถ้าไม่พบกลุ่มงาน ให้ไปอยู่ท้ายสุด
        if(indexA === -1) indexA = 99;
        if(indexB === -1) indexB = 99;
        return indexA - indexB;
    });

    let seq = 1;
    allUsers.forEach(user => {
        const tr = document.createElement('tr');

        // คอลัมน์ 1: ลำดับ
        const tdSeq = document.createElement('td');
        tdSeq.className = 'sticky-col-1 fw-bold text-center';
        tdSeq.innerText = seq++;
        tr.appendChild(tdSeq);

        // คอลัมน์ 2: ชื่อ-สกุล
        const tdName = document.createElement('td');
        tdName.className = 'sticky-col-2';
        tdName.innerText = user.fullName;
        tr.appendChild(tdName);

        // คอลัมน์ 3: ตำแหน่ง
        const tdPos = document.createElement('td');
        tdPos.className = 'sticky-col-3 text-muted';
        tdPos.style.fontSize = '0.8rem';
        tdPos.innerText = user.position;
        tr.appendChild(tdPos);

        // คอลัมน์ วันที่ 1 - 31
        for (let day = 1; day <= daysInMonth; day++) {
            const tdDay = document.createElement('td');
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            const dateObj = new Date(year, month - 1, day);
            const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);
            if (isWeekend) tdDay.classList.add('weekend-col');

            // หาว่าคนๆ นี้มีเวรในวันนี้หรือไม่
            const userShiftsToday = allShifts.filter(s => s.uid === user.uid && s.date.startsWith(dateStr));

            if (userShiftsToday.length > 0) {
                // ถ้ามีเวร ให้สร้าง Badge แสดงผล (ช1, ช2, บ1, บ2)
                userShiftsToday.forEach(shift => {
                    const badge = document.createElement('div');
                    let shiftLabel = '';
                    let shiftClass = '';

                    if (shift.period === 'เช้า' && shift.line == '1') { shiftLabel = 'ช1'; shiftClass = 'shift-m1'; }
                    else if (shift.period === 'เช้า' && shift.line == '2') { shiftLabel = 'ช2'; shiftClass = 'shift-m2'; }
                    else if (shift.period === 'บ่าย' && shift.line == '1') { shiftLabel = 'บ1'; shiftClass = 'shift-a1'; }
                    else if (shift.period === 'บ่าย' && shift.line == '2') { shiftLabel = 'บ2'; shiftClass = 'shift-a2'; }

                    badge.className = `badge ${shiftClass} m-1 p-2`;
                    badge.innerText = shiftLabel;
                    // เพิ่ม Event ให้คลิกเพื่อดูรายละเอียดหรือยกเลิกเวรได้
                    badge.onclick = () => viewShiftDetails(shift, user.fullName);
                    
                    tdDay.appendChild(badge);
                });
            } else {
                // ถ้าช่องว่าง ให้คลิกเพื่อเปิดหน้าต่างจองเวร
                tdDay.className += ' shift-empty';
                tdDay.onclick = () => openBookingModal(user, dateStr, dateObj.getDay());
            }

            tr.appendChild(tdDay);
        }

        tbody.appendChild(tr);
    });
}

// ==========================================
// 6. UI และ Utilities
// ==========================================
function setupMonthSelector() {
    const selector = document.getElementById('monthSelector');
    const monthsThai = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    
    monthsThai.forEach((m, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.innerText = `${m} ${currentYear + 543}`; // แปลงเป็น พ.ศ.
        if (index + 1 === currentMonth) option.selected = true;
        selector.appendChild(option);
    });

    selector.addEventListener('change', (e) => {
        currentMonth = parseInt(e.target.value);
        loadScheduleData(currentYear, currentMonth);
    });
}

function logout() {
    localStorage.removeItem('user1323');
    window.location.href = 'index.html';
}

// ==========================================
// 7. ฟังก์ชันสำหรับการจอง (Business Logic)
// ==========================================
function openBookingModal(targetUser, dateStr, dayOfWeek) {
    // 1. เช็คสิทธิ์: จองได้เฉพาะชื่อตัวเอง (ยกเว้น Admin)
    if (currentUser.role !== 'Admin' && currentUser.uid !== targetUser.uid) {
        Swal.fire('ไม่อนุญาต', 'คุณสามารถจองเวรได้เฉพาะในชื่อของคุณเองเท่านั้น', 'warning');
        return;
    }

    const isHoliday = (dayOfWeek === 0 || dayOfWeek === 6); // 0=อาทิตย์, 6=เสาร์
    const dept = targetUser.department;
    const cond = targetUser.conditions || "";

    // ตัวแปรเก็บสิทธิ์การจองในแต่ละกะ
    let canM1 = false, canM2 = false, canA1 = true, canA2 = true; 

    // 2. ลอจิกระดับกลุ่มงานและวัน (Rule 1-8)
    if (!isHoliday) {
        // วันธรรมดา (จันทร์ - ศุกร์)
        if (dayOfWeek === 1 && dept === 'การพยาบาลผู้ป่วยนอก') canM1 = true;
        if (dayOfWeek === 2 && dept === 'จิตวิทยา') canM1 = true;
        if (dayOfWeek === 3 && dept === 'การพยาบาลจิตเวชชุมชนและสารเสพติด') canM1 = true;
        if (dayOfWeek === 4 && dept === 'การพยาบาลผู้ป่วยพิเศษ/รักษาด้วยไฟฟ้า') canM2 = true; // พฤหัสบดี
        if (dayOfWeek === 5 && dept === 'สังคมสงเคราะห์') canM1 = true;
    } else {
        // วันหยุด (เสาร์ - อาทิตย์)
        canM1 = true; // เวรเช้าสาย 1 วันหยุด บังคับมีคนขึ้น (เปิดให้ทุกคน)
        canM2 = true; // เวรเช้าสาย 2 วันหยุด (สมัครใจ)
    }

    // 3. ลอจิกระดับบุคคล (กรองตามข้อความเงื่อนไขส่วนตัว)
    if (cond.includes('งดรับเวรบ่าย')) { canA1 = false; canA2 = false; }
    if (cond.includes('งดรับเวรเช้าวันธรรมดา') && !isHoliday) { canM1 = false; canM2 = false; }
    if (cond.includes('รับเฉพาะเวรเช้าวันธรรมดา')) { 
        canA1 = false; canA2 = false; 
        if (isHoliday) { canM1 = false; canM2 = false; } 
    }
    if (cond.includes('รับเฉพาะเวรสาย 2')) { canM1 = false; canA1 = false; }
    if (cond.includes('รับเฉพาะเวรเช้าวันพฤหัส')) {
        if (dayOfWeek !== 4) { canM1 = false; canM2 = false; canA1 = false; canA2 = false; }
        // อนุโลมถ้ามีเงื่อนไขวันหยุดพ่วงมา
        if (isHoliday && cond.includes('วันหยุดรับเดือนละ 1 เวรเช้า')) { canM1 = true; canM2 = true; }
    }

    // 4. สร้างตัวเลือกให้ผู้ใช้
    let optionsHTML = '';
    if (canM1) optionsHTML += `<div class="form-check text-start"><input class="form-check-input" type="radio" name="shiftOption" value="เช้า|1" id="m1"><label class="form-check-label text-primary fw-bold" for="m1">เวรเช้า (08:00-16:00) - สาย 1</label></div>`;
    if (canM2) optionsHTML += `<div class="form-check text-start"><input class="form-check-input" type="radio" name="shiftOption" value="เช้า|2" id="m2"><label class="form-check-label text-warning fw-bold" for="m2">เวรเช้า (08:00-16:00) - สาย 2</label></div>`;
    if (canA1) optionsHTML += `<div class="form-check text-start"><input class="form-check-input" type="radio" name="shiftOption" value="บ่าย|1" id="a1"><label class="form-check-label text-success fw-bold" for="a1">เวรบ่าย (16:00-24:00) - สาย 1</label></div>`;
    if (canA2) optionsHTML += `<div class="form-check text-start"><input class="form-check-input" type="radio" name="shiftOption" value="บ่าย|2" id="a2"><label class="form-check-label text-danger fw-bold" for="a2">เวรบ่าย (16:00-24:00) - สาย 2</label></div>`;

    if (optionsHTML === '') {
        Swal.fire('ไม่มีสิทธิ์จอง', `คุณไม่มีสิทธิ์ขึ้นเวรในวันที่ ${dateStr} ตามเงื่อนไขที่กำหนดไว้`, 'error');
        return;
    }

    // 5. แสดง Pop-up ให้เลือกจอง
    Swal.fire({
        title: 'ยืนยันการจองเวร',
        html: `<p>เลือกกะการทำงานสำหรับวันที่ <b>${dateStr}</b></p>
               <div class="p-3 border rounded bg-light">${optionsHTML}</div>
               <p class="text-danger mt-2" style="font-size:0.8rem;">*ระบบจองก่อนได้ก่อน (First-come, first-served)</p>`,
        showCancelButton: true,
        confirmButtonText: 'บันทึกการจอง',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const selected = document.querySelector('input[name="shiftOption"]:checked');
            if (!selected) { Swal.showValidationMessage('กรุณาเลือกกะการทำงาน'); return false; }
            return selected.value;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const [period, line] = result.value.split('|');
            submitShiftBooking(targetUser.uid, dateStr, isHoliday ? 'วันหยุด' : 'วันธรรมดา', period, line);
        }
    });
}

// ==========================================
// 8. ยิง API บันทึกการจองเวร
// ==========================================
async function submitShiftBooking(uid, date, dayType, period, line) {
    Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'book_shift',
                data: { uid, date, dayType, period, line }
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            Swal.fire('จองเวรสำเร็จ!', '', 'success').then(() => {
                loadScheduleData(currentYear, currentMonth); // โหลดตารางใหม่เพื่อแสดงผล
            });
        } else {
            Swal.fire('ไม่สามารถจองได้', result.message, 'error');
        }
    } catch (error) {
        Swal.fire('ข้อผิดพลาด', error.message, 'error');
    }
}

function viewShiftDetails(shift, fullName) {
    Swal.fire({
        title: 'รายละเอียดเวร',
        html: `ผู้ปฏิบัติงาน: <b>${fullName}</b><br>วันที่: <b>${shift.date}</b><br>กะ: <b>${shift.period} สาย ${shift.line}</b>`,
        icon: 'info'
    });
}
