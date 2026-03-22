const API_URL = 'https://script.google.com/macros/s/AKfycbyaSbv7j6Bhu-jGGeE7ty9YgXE4YrpNw-13p6LPcbzkjNhyswLTuL5zcEni398qZGUU/exec';
let availablePersonnel = [];
let tomSelectInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    loadAvailablePersonnel();
});

async function loadAvailablePersonnel() {
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_available_personnel' }) });
        const result = await res.json();
        if (result.status === 'success') {
            availablePersonnel = result.data;
            const selectEl = document.getElementById('regFullNameSelect');
            selectEl.innerHTML = '<option value="">พิมพ์เพื่อค้นหาชื่อของคุณ...</option>';
            
            availablePersonnel.forEach((person, index) => {
                selectEl.innerHTML += `<option value="${index}">${person.fullName} (${person.department})</option>`;
            });

            // เปิดใช้งาน Tom Select
            if(tomSelectInstance) tomSelectInstance.destroy();
            tomSelectInstance = new TomSelect("#regFullNameSelect",{
                create: false,
                sortField: { field: "text", direction: "asc" }
            });
        }
    } catch (e) { console.error("โหลดรายชื่อไม่สำเร็จ", e); }
}

function toggleView(targetId) {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById(targetId).classList.remove('hidden');
    // อัปเดตรายชื่อใหม่เผื่อมีคนสมัครไปแล้วระหว่างหน้าเว็บเปิดอยู่
    if(targetId === 'registerSection') loadAvailablePersonnel();
}

let isLoggingIn = false;
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isLoggingIn) return; isLoggingIn = true;
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    submitBtn.disabled = true; 

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    Swal.fire({ title: 'กำลังตรวจสอบ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', data: { username, password } }) });
        const result = await response.json();

        if (result.status === 'success') {
            Swal.fire({ title: 'สำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false }).then(() => {
                localStorage.setItem('user1323', JSON.stringify(result.user));
                window.location.href = 'dashboard.html'; 
            });
        } else {
            Swal.fire('ผิดพลาด', result.message, 'error');
            isLoggingIn = false; submitBtn.disabled = false;
        }
    } catch (error) {
        Swal.fire('ระบบขัดข้อง', error.message, 'error');
        isLoggingIn = false; submitBtn.disabled = false;
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!document.getElementById('pdpaConsent').checked) { Swal.fire('แจ้งเตือน', 'กรุณายอมรับ PDPA', 'warning'); return; }

    const selectedIndex = document.getElementById('regFullNameSelect').value;
    if (selectedIndex === "") { Swal.fire('แจ้งเตือน', 'กรุณาเลือกชื่อของคุณ', 'warning'); return; }

    const person = availablePersonnel[selectedIndex]; // ดึงข้อมูลเต็มๆ จาก Array ตามชื่อที่เลือก

    const userData = {
        fullName: person.fullName,
        position: person.position,
        department: person.department,
        conditions: person.conditions,
        username: document.getElementById('regUsername').value,
        password: document.getElementById('regPassword').value,
        email: document.getElementById('regEmail').value,
        role: 'User' 
    };

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'register', data: userData }) });
        const result = await response.json();
        if (result.status === 'success') {
            Swal.fire('ลงทะเบียนสำเร็จ!', 'เข้าสู่ระบบได้ทันที', 'success').then(() => {
                document.getElementById('registerForm').reset();
                if(tomSelectInstance) tomSelectInstance.clear();
                toggleView('loginSection');
            });
        } else { Swal.fire('ผิดพลาด', result.message, 'error'); }
    } catch (error) { Swal.fire('ระบบขัดข้อง', error.message, 'error'); }
});

// ================= จัดการ Event ลืมรหัสผ่าน =================
async function handleForgotPassword() {
    const { value: email } = await Swal.fire({
        title: 'ลืมรหัสผ่าน?',
        text: 'กรุณากรอกอีเมลที่ลงทะเบียนไว้ ระบบจะส่งรหัสผ่านชั่วคราวไปให้',
        input: 'email',
        inputPlaceholder: 'กรอกอีเมลของคุณ',
        showCancelButton: true,
        confirmButtonText: 'ส่งอีเมล',
        cancelButtonText: 'ยกเลิก',
        inputValidator: (value) => {
            if (!value) return 'กรุณากรอกอีเมล!';
            // ตรวจสอบรูปแบบอีเมลเบื้องต้น
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'รูปแบบอีเมลไม่ถูกต้อง!';
        }
    });

    if (email) {
        Swal.fire({ title: 'กำลังดำเนินการ...', text: 'ระบบกำลังสร้างรหัสผ่านและส่งอีเมล', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'forgot_password',
                    data: { email }
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                Swal.fire('ส่งสำเร็จ!', result.message, 'success');
            } else {
                Swal.fire('ผิดพลาด', result.message, 'error');
            }
        } catch (error) {
            Swal.fire('ข้อผิดพลาดของระบบ', error.message, 'error');
        }
    }
}
