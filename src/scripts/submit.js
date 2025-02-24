const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  try {
    // Parse dữ liệu từ form
    const body = JSON.parse(event.body);
    const { name, email, phone, solarBirthdate, hourdate } = body;

    // Kiểm tra trùng email/phone trong 30 ngày
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: existingRecords } = await supabase
      .from('horoscope_records')
      .select('*')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (existingRecords.length > 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <main class="max-w-lg mx-auto p-4 md:p-6 rounded-lg shadow-md bg-gradient-to-b from-amber-200 to-amber-300" id="main-content">
            <h2 class="text-2xl md:text-3xl font-semibold text-red-700 mb-4 text-center">Thông báo</h2>
            <p class="text-gray-800 text-center">Bạn đã xem tử vi trong vòng 30 ngày trước. Vui lòng thử lại sau!</p>
            <button class="w-1/3 mt-6 mx-auto p-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-300" hx-get="/" hx-target="#main-content" hx-swap="outerHTML">Quay lại form</button>
          </main>
        `,
      };
    }

    // Tạo ID duy nhất
    const id = `${new Date().toISOString().replace(/[-T:.Z]/g, '')}${Math.floor(Math.random() * 1000)}`;

    // Chuyển đổi ngày âm lịch
    const lunarBirthdate = await convertToLunarDate(solarBirthdate);

    // Tạo prompt và gọi Gemini API
    const prompt = generatePrompt(lunarBirthdate, hourdate);
    const geminiResponse = await callGoogleGemini(prompt);
    const resultJson = JSON.parse(geminiResponse);

    // Lưu vào Supabase
    const { error } = await supabase.from('horoscope_records').insert({
      id,
      name,
      email,
      phone,
      solar_birthdate: solarBirthdate,
      hourdate,
      lunar_birthdate: lunarBirthdate,
      result: resultJson,
    });

    if (error) throw new Error(error.message);

    // Trả về HTML kết quả
    const htmlOutput = generateResultHtml(resultJson);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: htmlOutput,
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <main class="max-w-lg mx-auto p-4 md:p-6 rounded-lg shadow-md bg-gradient-to-b from-amber-200 to-amber-300" id="main-content">
          <h2 class="text-2xl md:text-3xl font-semibold text-red-700 mb-4 text-center">Lỗi</h2>
          <p class="text-gray-800 text-center">Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại!</p>
          <button class="w-1/3 mt-6 mx-auto p-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-300" hx-get="/" hx-target="#main-content" hx-swap="outerHTML">Quay lại form</button>
        </main>
      `,
    };
  }
};

// Hàm chuyển đổi ngày âm lịch
async function convertToLunarDate(solarDate) {
  const [day, month, year] = solarDate.split('/').map(Number);
  const response = await axios.post('https://open.oapi.vn/date/convert-to-lunar', {
    day,
    month,
    year,
  });
  const { data } = response.data;
  return `${data.day} tháng ${data.month} năm ${data.sexagenaryCycle}`;
}

// Hàm tạo prompt cho AI
function generatePrompt(lunarDate, hourdate) {
  return `Bạn là một chuyên gia tử vi phương Đông. Hãy phân tích vận mệnh của một người sinh vào ngày âm lịch ${lunarDate}, giờ sinh ${hourdate} theo định dạng JSON sau, viết chi tiết, hấp dẫn, và bí ẩn:\n\n` +
         `{\n` +
         `  "lunarDate": "${lunarDate}",\n` +
         `  "hourdate": "${hourdate}",\n` +
         `  "result": {\n` +
         `    "cungMenh": "Cung mệnh của bạn thuộc [Ngũ hành – Tên cung], mang năng lượng [mô tả ngắn, bí ẩn]. [Chi tiết ngũ hành, Thiên Can, Địa Chi, và ảnh hưởng của giờ sinh].",\n` +
         `    "tinhCach": "Bạn là người [mô tả tính cách], với [ảnh hưởng của giờ sinh]. AI nhận thấy bạn có [điểm nổi bật, ví dụ nghề nghiệp phù hợp].",\n` +
         `    "suNghiepTaiLoc": "Sự nghiệp: [Luận đoán sự nghiệp 2025, cơ hội, lời khuyên], Tài lộc: [Luận đoán tài lộc 2025, thời điểm may mắn, lời cảnh báo].",\n` +
         `    "tinhDuynGiaDao": "Tình duyên: [Luận đoán tình duyên 2025, cơ hội, thử thách], Gia đạo: [Luận đoán gia đạo 2025, lời khuyên].",\n` +
         `    "loiKhuyen": "1. [Lời khuyên 1]. 2. [Lời khuyên 2]. 3. [Lời khuyên 3].",\n` +
         `    "vanHan2025": "[Luận đoán vận hạn chi tiết, thử thách, và cách vượt qua trong năm 2025]."\n` +
         `  }\n` +
         `}\n\n` +
         `🎯 Viết sinh động, bí ẩn, và chuyên nghiệp, nhấn mạnh sự chính xác của AI.`;
}

// Hàm gọi Gemini API
async function callGoogleGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${geminiApiKey}`;
  const response = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  return response.data.candidates[0].content.parts[0].text;
}

// Hàm tạo HTML kết quả
function generateResultHtml(resultJson) {
  const { lunarDate, hourdate, result } = resultJson;
  return `
    <main class="max-w-lg mx-auto p-4 md:p-6 rounded-lg shadow-md bg-gradient-to-b from-amber-200 to-amber-300" id="main-content">
      <h2 class="text-2xl md:text-3xl font-semibold text-red-700 mb-4 text-center">Kết quả tử vi của bạn</h2>
      <div class="space-y-6">
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h3 class="text-lg md:text-xl font-bold text-red-600 mb-2">Thông tin cơ bản</h3>
          <p class="text-gray-800">Ngày sinh âm lịch: <span class="font-semibold text-red-700">${lunarDate}</span></p>
          <p class="text-gray-800">Giờ sinh: <span class="font-semibold text-red-700">${hourdate}</span></p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h3 class="text-lg md:text-xl font-bold text-red-600 mb-2">1. Cung mệnh</h3>
          <p class="text-gray-800">${result.cungMenh}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h3 class="text-lg md:text-xl font-bold text-red-600 mb-2">2. Tính cách</h3>
          <p class="text-gray-800">${result.tinhCach}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h3 class="text-lg md:text-xl font-bold text-red-600 mb-2">3. Sự nghiệp & Tài lộc</h3>
          <p class="text-gray-800"><strong>Sự nghiệp:</strong> ${result.suNghiepTaiLoc.split(',')[0]}</p>
          <p class="text-gray-800"><strong>Tài lộc:</strong> ${result.suNghiepTaiLoc.split(',')[1]}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h3 class="text-lg md:text-xl font-bold text-red-600 mb-2">4. Tình duyên & Gia đạo</h3>
          <p class="text-gray-800"><strong>Tình duyên:</strong> ${result.tinhDuynGiaDao.split(',')[0]}</p>
          <p class="text-gray-800"><strong>Gia đạo:</strong> ${result.tinhDuynGiaDao.split(',')[1]}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h3 class="text-lg md:text-xl font-bold text-red-600 mb-2">5. Lời khuyên</h3>
          <ul class="list-disc list-inside text-gray-800">
            ${result.loiKhuyen.split('.').map(item => item.trim() ? `<li>${item}</li>` : '').join('')}
          </ul>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h3 class="text-lg md:text-xl font-bold text-red-600 mb-2">6. Vận hạn năm 2025</h3>
          <p class="text-gray-800">${result.vanHan2025}</p>
        </div>
        <button class="w-1/3 mt-6 mx-auto p-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-300" hx-get="/" hx-target="#main-content" hx-swap="outerHTML">Quay lại form</button>
      </div>
    </main>
  `;
}