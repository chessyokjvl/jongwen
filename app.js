// นำ Web App URL ที่ได้จากขั้นตอน Deploy GAS มาวางที่นี่
const API_URL = 'https://script.google.com/macros/s/AKfycbyaSbv7j6Bhu-jGGeE7ty9YgXE4YrpNw-13p6LPcbzkjNhyswLTuL5zcEni398qZGUU/exec';

// ฟังก์ชันสลับหน้าต่างระหว่าง Login กับ Register
function toggleView(targetId) {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById(targetId).classList.remove('hidden');
}

// ================= จัดการ Event เข้าสู่ระบบ =================
let isLoggingIn = false; // ตัวแปรป้องกันการกดซ้ำ (Double Submit)

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ถ้ากำลังประมวลผลอยู่ ให้หยุดคำสั่งนี้เลยเพื่อป้องกันการยิง API ซ้ำ
    if (isLoggingIn) return; 
    isLoggingIn = true;
    
    // ปิดปุ่มล็อกอินชั่วคราวไม่ให้กดซ้ำได้
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    submitBtn.disabled = true; 

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    Swal.fire({ title: 'กำลังตรวจสอบ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login',
                data: { username, password }
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            // ปรับให้ Alert ปิดเองใน 1.5 วินาที ผู้ใช้ไม่ต้องกดอะไรเพิ่ม
            Swal.fire({
                title: 'เข้าสู่ระบบสำเร็จ!',
                text: 'กำลังพาท่านเข้าสู่ระบบจองเวร...',
                icon: 'success',
                timer: 1500, // เวลา 1500 มิลลิวินาที (1.5 วิ)
                showConfirmButton: false // ซ่อนปุ่ม OK ไปเลย ป้องกันคนกด Enter ซ้ำ
            }).then(() => {
                localStorage.setItem('user1323', JSON.stringify(result.user));
                window.location.href = 'dashboard.html'; 
            });
        } else {
            Swal.fire('ผิดพลาด', result.message, 'error');
            // ถ้าล็อกอินผิดพลาด คืนค่าให้กลับมากดใหม่ได้
            isLoggingIn = false;
            submitBtn.disabled = false;
        }
    } catch (error) {
        Swal.fire('ข้อผิดพลาดของระบบ', error.message, 'error');
        // ถ้าเซิร์ฟเวอร์มีปัญหา คืนค่าให้กลับมากดใหม่ได้
        isLoggingIn = false;
        submitBtn.disabled = false;
    }
});
// ================= จัดการ Event สมัครสมาชิก =================
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!document.getElementById('pdpaConsent').checked) {
        Swal.fire('แจ้งเตือน', 'กรุณากดยอมรับเงื่อนไข PDPA', 'warning');
        return;
    }

    const userData = {
        fullName: document.getElementById('regFullName').value,
        position: document.getElementById('regPosition').value,
        department: document.getElementById('regDepartment').value,
        conditions: document.getElementById('regConditions').value || '-',
        username: document.getElementById('regUsername').value,
        password: document.getElementById('regPassword').value,
        email: document.getElementById('regEmail').value,
        role: 'User' // Default role
    };

    Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'register',
                data: userData
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            Swal.fire('ลงทะเบียนสำเร็จ!', 'คุณสามารถเข้าสู่ระบบได้ทันที', 'success').then(() => {
                document.getElementById('registerForm').reset();
                toggleView('loginSection');
            });
        } else {
            Swal.fire('ผิดพลาด', result.message, 'error');
        }
    } catch (error) {
        Swal.fire('ข้อผิดพลาดของระบบ', error.message, 'error');
    }
});

// ================= จัดการ Event ลืมรหัสผ่าน =================
async function handleForgotPassword() {
    const { value: email } = await Swal.fire({
        title: 'ลืมรหัสผ่าน?',
        text: 'กรุณากรอกอีเมลที่ลงทะเบียนไว้ ระบบจะส่งรหัสผ่านชั่วคราวไปให้',
        input: 'email',
        inputPlaceholder: 'กรอกอีเมลของคุณ',
        showCancelButton: true,
        confirmButtonText: 'ส่งรหัสผ่าน',
        cancelButtonText: 'ยกเลิก'
    });

    if (email) {
        Swal.fire({ title: 'กำลังดำเนินการ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

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
