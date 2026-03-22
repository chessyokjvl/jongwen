// ตรวจสอบการ Login ทันทีที่โหลดหน้า
document.addEventListener("DOMContentLoaded", () => {
    const userData = localStorage.getItem('user1323');
    
    if (!userData) {
        // ถ้าไม่มีข้อมูลใน LocalStorage แปลว่ายังไม่ Login ให้เตะกลับไปหน้าแรก
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเข้าสู่ระบบ',
            text: 'คุณไม่ได้รับสิทธิ์เข้าถึงหน้านี้',
            confirmButtonText: 'ตกลง'
        }).then(() => {
            window.location.href = 'index.html'; 
        });
        return;
    }

    // แสดงข้อมูล User บน Navbar
    const user = JSON.parse(userData);
    document.getElementById('displayUserName').innerText = user.fullName;
    document.getElementById('displayDepartment').innerText = user.department;

    // สร้างตารางปฏิทิน
    generateCalendar(2026, 2); // ปี 2026, เดือน 2 (มีนาคม - อิงตาม Array 0-11 ของ JS)
});

// ฟังก์ชันออกจากระบบ
function logout() {
    localStorage.removeItem('user1323');
    window.location.href = 'index.html';
}

// ฟังก์ชันสร้างหัวตาราง (วันที่และวันในสัปดาห์)
function generateCalendar(year, monthIndex) {
    const headerRow1 = document.getElementById('headerRow1');
    const headerRow2 = document.getElementById('headerRow2');
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const dayNamesThai = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    // ล้างข้อมูลเก่า (เผื่อมีการเปลี่ยนเดือน)
    while (headerRow1.children.length > 3) { headerRow1.lastChild.remove(); }
    headerRow2.innerHTML = '';

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, monthIndex, day);
        const dayOfWeek = dateObj.getDay(); // 0 = อาทิตย์, 1 = จันทร์, ...
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        // แถวที่ 1: ตัวเลขวันที่
        const thDate = document.createElement('th');
        thDate.innerText = day;
        if (isWeekend) thDate.classList.add('weekend-col');
        headerRow1.appendChild(thDate);

        // แถวที่ 2: ชื่อวัน
        const thDayName = document.createElement('th');
        thDayName.innerText = dayNamesThai[dayOfWeek];
        if (isWeekend) thDayName.classList.add('weekend-col');
        headerRow2.appendChild(thDayName);
    }
}
