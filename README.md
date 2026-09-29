🗓 تقویم شمسی — Persian Calendar
اپلیکیشن تقویم جلالی (شمسی) با رابطی تمیز و تعاملی — انتخاب تاریخ، انتخاب بازه، یادداشت‌گذاری برای روزها و مدیریت کامل آن‌ها.

🔗 دموی زنده: persian-calendar-178qc972p-nicksoltaninavid1.vercel.app

ReactTypeScriptTailwind CSSVite

✨ امکانات
✅ انتخاب تاریخ تکی و انتخاب بازه (Range Selection)
✅ یادداشت‌گذاری برای هر روز — با امکان ویرایش و حذف
✅ نمایش دقیق تاریخ شمسی با پشتیبانی کامل از تقویم جلالی
✅ ناوبری روان بین ماه‌ها
✅ کاملاً واکنش‌گرا — از موبایل تا دسکتاپ
✅ استایل سفارشی با Tailwind روی کامپوننت پیکر
🛠 تکنولوژی‌ها
ابزار	کاربرد
React	رابط کاربری کامپوننت‌محور
TypeScript	تایپ‌سیف بودن State و منطق تاریخ
react-multi-date-picker	هسته‌ی تقویم و تبدیل تاریخ جلالی
Tailwind CSS	استایل‌دهی یوتیلیتی-فرست
Vite	ابزار توسعه و بیلد
🚀 اجرای پروژه
# نصب وابستگی‌هاnpm install# اجرای محیط توسعهnpm run dev# بیلد نسخه پروداکشنnpm run build
📁 ساختار پروژه
text

src/
├── components/     # کامپوننت‌های تقویم، یادداشت و ...
├── hooks/          # هوک‌های سفارشی
├── utils/          # توابع کمکی (تاریخ، ارقام فارسی و ...)
├── App.tsx
└── main.tsx
💡 نکات فنی
برای دقت در محاسبات تاریخ شمسی از کتابخانه react-multi-date-picker استفاده شده و یک لایه سفارشی روی تم پیش‌فرض آن با Tailwind پیاده شده است.
یادداشت‌ها به‌صورت Immutable در State مدیریت می‌شوند تا رفتار کامپوننت‌ها همیشه قابل پیش‌بینی باشد.
🇬🇧 English TL;DR
A Persian (Jalali/Shamsi) calendar app built with React + TypeScript + Tailwind CSS.
Features: single-date & range selection, day notes with edit/delete, fully responsive layout,
custom Tailwind theming on top of react-multi-date-picker.

ساخته‌شده توسط نیک سلطانی 🚀