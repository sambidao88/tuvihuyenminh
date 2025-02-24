// This file contains the JavaScript code for the frontend, handling interactivity and DOM manipulation.

document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra email hợp lệ
    document.getElementById('email').addEventListener('blur', function() {
        const email = this.value;
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
        const errorElement = document.getElementById('emailError');
        
        if (!emailRegex.test(email)) {
            errorElement.textContent = 'Email không hợp lệ! Vui lòng nhập đúng định dạng (VD: example@domain.com)';
            errorElement.classList.remove('hidden');
            this.closest('.input-field').classList.add('border-red-500');
        } else {
            errorElement.textContent = 'Email hợp lệ';
            errorElement.classList.remove('hidden', 'text-red-600');
            errorElement.classList.add('text-green-600');
            this.closest('.input-field').classList.remove('border-red-500');
            this.closest('.input-field').classList.add('border-green-500');
        }
    });

    // Kiểm tra số điện thoại hợp lệ
    document.getElementById('phone').addEventListener('blur', function() {
        const phone = this.value;
        const phoneRegex = /^0[0-9]{9}$/;
        const errorElement = document.getElementById('phoneError');
        
        if (!phoneRegex.test(phone)) {
            errorElement.textContent = 'Số điện thoại không hợp lệ! Phải bắt đầu bằng 0 và có 10 chữ số';
            errorElement.classList.remove('hidden');
            this.closest('.input-field').classList.add('border-red-500');
        } else {
            errorElement.textContent = 'Số điện thoại hợp lệ';
            errorElement.classList.remove('hidden', 'text-red-600');
            errorElement.classList.add('text-green-600');
            this.closest('.input-field').classList.remove('border-red-500');
            this.closest('.input-field').classList.add('border-green-500');
        }
    });

    // Kiểm tra tuổi >= 15
    document.getElementById('birthForm').addEventListener('submit', function(e) {
        const solarBirthdate = document.getElementById('solarBirthdate').value;
        const [day, month, year] = solarBirthdate.split('/').map(Number);
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear() - 
                   (today.getMonth() < birthDate.getMonth() || 
                   (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
        
        if (age < 15) {
            e.preventDefault();
            alert('Bạn phải từ 15 tuổi trở lên để xem tử vi!');
        }
    });
});