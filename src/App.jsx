import { Calendar } from "react-multi-date-picker";
import DateObject from "react-date-object";
import { useEffect, useState, useMemo } from "react";

import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "./calendar-day.css";
import "./calendar-month-year.css";
import {
  faXmark,
  faPen,
  faTrash,
  faFloppyDisk,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function App() {
  const [date, setDate] = useState(null);

  // «الان کاربر توی کدوم نمای تقویمه؟»
  const [pickerMode, setPickerMode] = useState("day");

  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRange, setSelectedRange] = useState([]);

  // باز و بسته بودن مودال
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [notes, setNotes] = useState(() => {
  try {
    const saved = localStorage.getItem("calendar-notes");
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to load notes from localStorage:", error);
    return [];
  }
});
  // الان داریم کدام نوت را ادیت میکنیم
  const [editingNote, setEditingNote] = useState(null);
  // این مشخص میکنه اینپوت ها قابل ویرایش باشن یا نباشن
  const [isEditing, setIsEditing] = useState(false);
  // کاربر فقط کلیک کرده یا واقعاً درگ کرده؟
  const [hasMoved, setHasMoved] = useState(false);

  // وت‌هایی که فعلاً روی تقویم مخفی کردیم رو نگه داره
  const [moreNotes, setMoreNotes] = useState([]);
  // بازه یا بسته more مودال
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  // دوتاریخ بگیر و تاریخ های بینشون رو بساز و تحویل بده

  // مشخص می‌کند الان چه نوع درگی داریم
  const [dragMode, setDragMode] = useState(null);
  // نوتی که الان داریم جابه‌جایش می‌کنیم
  const [movingNote, setMovingNote] = useState(null);
  // تاریخی که کاربر نوت را از روی آن گرفته
  const [moveStartDate, setMoveStartDate] = useState(null);
  // پیش‌نمایش جای جدید نوت هنگام حرکت
  const [movePrewiew, setMovePrewiew] = useState([]);
  // آیا کاربر هنگام جابه‌جایی نوت، واقعاً موس را حرکت داده؟
  const [hasDraggedNote, setHasDraggedNote] = useState(false);

  const [dragSource, setDragSource] = useState(null);

  const [hoveredNote, setHoveredNote] = useState(null);

  const noteLanes = useMemo(() => {
    const items = notes.map((note) => {
      const start = note.dates[0];
      const end = note.dates[note.dates.length - 1];

      const startObj = new DateObject({
        year: start.year,
        month: start.month,
        day: start.day,
        calendar: persian,
      });
      const endObj = new DateObject({
        year: end.year,
        month: end.month,
        day: end.day,
        calendar: persian,
      });

      const startDays = startObj.toDays();
      const endDays = endObj.toDays();

      return { note, startDays, endDays, length: endDays - startDays };
    });

    // اول طولانی‌ترین نوت‌ها، بین نوت‌های هم‌طول، زودتر شروع‌شده‌ها اول
    items.sort((a, b) => b.length - a.length || a.startDays - b.startDays);

    const laneEnds = []; // laneEnds[i] = آخرین روزی که لِین i اشغاله
    const lanes = {};

    items.forEach(({ note, startDays, endDays }) => {
      let laneIndex = laneEnds.findIndex((end) => end < startDays);
      if (laneIndex === -1) laneIndex = laneEnds.length;

      laneEnds[laneIndex] = endDays;
      lanes[note.id] = laneIndex;
    });

    return lanes;
  }, [notes]);

  useEffect(() => {
  try {
    localStorage.setItem("calendar-notes", JSON.stringify(notes));
  } catch (error) {
    console.error("Failed to save notes to localStorage:", error);
  }
}, [notes]);
  function createDateRange(start, end) {
    const range = [];

    const startDate = new DateObject({
      year: start.year,
      month: start.month,
      day: start.day,
      calendar: persian,
    });
    const endDate = new DateObject({
      year: end.year,
      month: end.month,
      day: end.day,
      calendar: persian,
    });

    // میریزیم توی این متغیر ها بخاطر انتخاب برعکس
    let first = startDate;
    let last = endDate;

    if (first > last) {
      first = endDate;
      last = startDate;
    }

    // میریزیم توی این متغیر که از روز اول شروع کنیم و بریم روزای بعد برای اینکه بدونیم تو کدوم روزیم
    let current = first;
    while (current <= last) {
      range.push({
        year: current.year,
        month: current.month.number,
        day: current.day,
      });
      current = current.add(1, "day");
    }
    return range;
  }

  // این تابع کار اصلی محاسبه جابه‌جایی را انجام می‌دهد
  // تابع سه تا ورودی داره 1 نوتی که میخوایم حرکت بدیم 2 جایی که کاربر نوت رو گرفته 3 جایی که موس الان رسیده
  function movedNoteDates(note, fromDate, toDate) {
    // جایی که کاربر نوت رو کلیک کرده رو تبدیل میکنیم به ابجکت برای محاسبات
    const from = new DateObject({
      year: fromDate.year,
      month: fromDate.month,
      day: fromDate.day,
      calendar: persian,
    });
    //  همون برای جایی که ول میکنه
    const to = new DateObject({
      year: toDate.year,
      month: toDate.month,
      day: toDate.day,
      calendar: persian,
    });

    //toDays() اختلاف بین تاریخ ها با استفاده از
    const difference = to.toDays() - from.toDays();

    // بیا روی تک‌ تک تاریخ‌های این نوت حرکت کن
    return note.dates.map((noteDate) => {
      // یکی یکی به ابجکت تبدیلشون کن
      const current = new DateObject({
        year: noteDate.year,
        month: noteDate.month,
        day: noteDate.day,
        calendar: persian,
      });

      // تاریخ فعلی را به اندازه دیفرنس روز جابه‌جا کن.
      const newDate = current.add(difference, "day");

      // از ابجکت درش میاریم و اطلاعاتی که میخوایم رو فقط میگیریم
      return {
        year: newDate.year,
        month: newDate.month.number,
        day: newDate.day,
      };
    });
  }

  // یک نوت مشخص را می‌گیرد و تاریخ‌های آن نوت را با تاریخ‌های جدید جایگزین می‌کند، بدون اینکه بقیه اطلاعات نوت یا بقیه نوت‌ها تغییر کنند.
  // دوتا ورودی داره 1 نوتی که میخواد جا به جا بشه 2 تاریخ های جدید همین نوت
  function updateMovedNote(note, newDates) {
    // اخرین نسخه نوت رو میریزیم تو استیت
    setNotes((prevNotes) => {
      return prevNotes.map((item) => {
        // اگه این همون نوتیه که کاربر جا به جاش کرده
        if (item.id === note.id) {
          // تاریخش رو عوض می‌کنیم و اطلاعات قبلی رو نگهمیداریم
          return {
            ...item,
            dates: newDates,
          };
        }

        return item;
      });
    });
  }

  // وقتی موس رها می‌شود
  function handleMouseUp() {
    console.log("MOUSE UP", {
      dragMode,
      hasDraggedNote,
      movingNote,
      movePrewiew,
    });
    // اگر صفحه‌ی روزها فعال نیست، هیچ عملی انجام نده
    if (pickerMode !== "day") {
      setIsDragging(false);
      return;
    }

    // آیا الان در حالت جابه‌جایی هستیم و یک نوت برای جابه‌جایی داریم؟
    if (dragMode === "move" && movingNote) {
      // آیا کاربر واقعاً موس را حرکت داده؟
      if (hasDraggedNote) {
        // اگر پیش‌نمایش تاریخ‌های جدید وجود داشته باشد، نوت را واقعاً جابه‌جا می‌کنیم.
        if (movePrewiew.length > 0) {
          updateMovedNote(movingNote, movePrewiew);
        }
      } else {
        setEditingNote(movingNote);
        setNoteTitle(movingNote.title);
        setNoteDescription(movingNote.description);
        // مودال را باز کن ولی فعلاً حالت ویرایش خاموش باشد.
        setIsEditing(false);
        setIsNoteOpen(true);
      }

      // کار Move تمام شد، برگرد به حالت عادی.
      setDragMode(null);
      setMovingNote(null);
      setMoveStartDate(null);
      setMovePrewiew([]);
      setHasDraggedNote(false);

      return;
    }

    // اگه اصلا انتخابی نشده یا نقطه شروعی نداریم کاری نکن کلا
    if (!isDragging || !dragStart) {
      return;
    }
    // اگر کلیک انجام شده ولی حرکتی نداریم اینو اجراع کن
    // if (!hasMoved) {
    //   setSelectedRange([dragStart]);
    // }

    // وقتی پنجره نوت باز شد، کاربر اجازه تایپ داشته باشد
    setIsEditing(true);
    // مودال نمایش داده بشه
    setIsNoteOpen(true);
    // دیگر موس را دنبال نکن.
    setIsDragging(false);
  }
  //  آیا برای این نوت روزی داریم؟
  function findNotesByDate(currentDate) {
    // از بین همه نوت‌ها، فقط آن‌هایی را نگه دار که شرط را پاس می‌کنند.
    return notes.filter((note) => {
      // "آیا حداقل یکی از اعضای این آرایه شرط را دارد؟"
      return note.dates.some((noteDate) => {
        // آیا این تاریخ دقیقاً برابر روزی است که الان داریم نمایش می‌دهیم؟
        return (
          noteDate.year === currentDate.year &&
          noteDate.month === currentDate.month &&
          noteDate.day === currentDate.day
        );
      });
    });
  }

  // یررسی فعال بودن صفحه روز های تقویم
  function chekPickerMode() {
    // عنصر مربوط به صفحه‌ی روزهای تقویم را پیدا می‌کنیم
    const dayPicker = document.querySelector(".rmdp-day-picker");

    // اگر عنصر پیدا نشد، ادامه نمی‌دهیم
    if (!dayPicker) {
      return;
    }

    // بررسی می‌کنیم آیا نمای روزها فعال است یا نه
    const isDayActive = dayPicker.getAttribute("data-active") === "true";

    // نتیجه را برای بررسی داخل کنسول نمایش می‌دهیم
    console.log("DAY ACTIVE:", isDayActive);

    // حالت تقویم را ذخیره می‌کنیم
    setPickerMode(isDayActive ? "day" : "other");
  }

  useEffect(() => {
    const handleCalendarClick = () => {
      chekPickerMode();
    };

    document.addEventListener("click", handleCalendarClick);

    return () => {
      document.removeEventListener("click", handleCalendarClick);
    };
  }, []);

  // به تقویم میگه هر روزی که داری میسازی قبل از نمایش بیا این تابع رو اجرا کن
  function mapDays({ date }) {
    console.log("MAP DAYS:", pickerMode);
    // اگر صفحه‌ی روزها فعال نیست، هیچ استایل یا محتوای سفارشی برای روز ایجاد نکن
    // if (pickerMode !== "day") {
    //   return {};
    // }
    // کتابخانه خیلی اطلاعات دارد و ما فقط به این سه تا نیاز داریم
    const currentDate = {
      year: date.year,
      month: date.month.number,
      day: date.day,
    };

    const isMovePreview = movePrewiew.some((previwDate) => {
      return (
        previwDate.year === currentDate.year &&
        previwDate.month === currentDate.month &&
        previwDate.day === currentDate.day
      );
    });

    const previewIndex = movePrewiew.findIndex((previwDate) => {
      return (
        previwDate.year === currentDate.year &&
        previwDate.month === currentDate.month &&
        previwDate.day === currentDate.day
      );
    });
    const isPreviewStart = previewIndex === 0;
    const isPreviewEnd =
      previewIndex !== -1 && previewIndex === movePrewiew.length - 1;
    // selectedRange شماره ایندکس فلان روز در
    const selectedIndex = selectedRange.findIndex((selectedDate) => {
      return (
        selectedDate.year === currentDate.year &&
        selectedDate.month === currentDate.month &&
        selectedDate.day === currentDate.day
      );
    });

    //  هست selectedRange اگر روز انتخابی برابر با -1 نباشه پس داخل
    const isSelected = selectedIndex !== -1;
    // این یک انتخاب تکی است، نه بازه
    const isSingleSelected = isSelected && selectedRange.length === 1;
    // این اولین روز بازه است
    const isFirstSelected =
      isSelected && selectedRange.length > 1 && selectedIndex === 0;
    // این اخرین روز بازست
    const isLastSelected =
      isSelected &&
      selectedRange.length > 1 &&
      selectedIndex === selectedRange.length - 1;
    // این روز وسط بازه است
    const isMiddleSelected =
      isSelected &&
      selectedRange.length > 2 &&
      selectedIndex > 0 &&
      selectedIndex < selectedRange.length - 1;

    let selectionClass = "";

    if (isSingleSelected) {
      selectionClass = "calendar-note-single";
    } else if (isFirstSelected) {
      selectionClass = "calendar-note-start";
    } else if (isLastSelected) {
      selectionClass = "calendar-note-end";
    } else if (isMiddleSelected) {
      selectionClass = "calendar-note-middle";
    }

    // if (isMovePreview) {
    //   selectionClass = "move-preview";
    // }
    // دادن روز به تابع پیدا کننده نوت روزها
    const savedNotes = findNotesByDate(currentDate);

    // هر نوت در هر روز چه وضعیتی داره
    // تک‌تک نوت‌هایی که روی این روز هستند رو بررسی کن
    // هر نوت در هر روز چه وضعیتی داره + لِین ثابتش
    const MAX_VISIBLE_LANES = 2;

    const notePositions = savedNotes.map((note) => {
      const { start, end } = getNoteStartEnd(note);
      const isStart =
        start.year === currentDate.year &&
        start.month === currentDate.month &&
        start.day === currentDate.day;
      const isEnd =
        end.year === currentDate.year &&
        end.month === currentDate.month &&
        end.day === currentDate.day;
      const lane = noteLanes[note.id] ?? 0;
      return { note, isStart, isEnd, lane };
    });

    const lastVisibleLane = MAX_VISIBLE_LANES - 1;

    // نوت‌هایی که لِینشون از حد مجاز بیشتره، همیشه میرن More (فارغ از سلکشن)
    const overflowByLane = notePositions.filter(
      (position) => position.lane > lastVisibleLane,
    );

    // اگر سلکشن فعال است، نوتی که دقیقاً روی آخرین لِین مجاز نشسته هم باید موقتاً برود More
    const bumpedBySelection = selectionClass
      ? notePositions.find((position) => position.lane === lastVisibleLane)
      : null;

    const overflowNotePositions = bumpedBySelection
      ? [...overflowByLane, bumpedBySelection]
      : overflowByLane;

    const moreCount = overflowNotePositions.length;

    // const isPreviewStart =
    //   isMovePreview &&
    //   movingNote &&
    //   movePrewiew[0].year === currentDate.year &&
    //   movePrewiew[0].month === currentDate.month &&
    //   movePrewiew[0].day === currentDate.day;

    return {
      // className: selectionClass,

      // چیزهایی که می‌خوام داخل خانه‌ی این روز قرار بگیره، از اینجا شروع میشه
      children: (
        // جمع کردن چند عنصر کنار هم بدون دیو اضافه دورشون
        <>
          <div className="calendar-day-number pb-1 ">{date.day}</div>

          {/* رو بردار isEnd و isStartو note از هر نوت یک  */}
          {Array.from({ length: MAX_VISIBLE_LANES }).map((_, laneIndex) => {
            // آخرین لِین، وقتی سلکشن فعال است، مخصوص نوار سلکشن می‌شود
            const isSelectionSlot =
              selectionClass && laneIndex === lastVisibleLane;

            if (isSelectionSlot) {
              return (
                <div
                  key="selection-slot"
                  className={`calendar-note-line ${selectionClass}`}
                />
              );
            }

            // نوت واقعی این لِین را (اگر وجود دارد) پیدا کن
            const position = notePositions.find((p) => p.lane === laneIndex);

            if (!position) {
              return (
                <div
                  key={`empty-lane-${laneIndex}`}
                  className="calendar-note-line-empty"
                />
              );
            }

            const { note, isStart, isEnd } = position;

            let noteClass = "calendar-note-middle";
            if (isStart && isEnd) {
              noteClass = "calendar-note-single";
            } else if (isStart) {
              noteClass = "calendar-note-start";
            } else if (isEnd) {
              noteClass = "calendar-note-end";
            }

            return (
              <div
                key={note.id}
                className={`calendar-note-line ${noteClass} ${
                  hoveredNote === note.id ? "note-hovered" : ""
                }`}
                onMouseEnter={() => {
                  setHoveredNote(note.id);
                }}
                onMouseLeave={() => {
                  setHoveredNote(null);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setHasDraggedNote(false);
                  setDragMode("move");
                  setMovingNote(note);
                  setMoveStartDate(currentDate);
                }}
              >
                {isStart && note.title}
              </div>
            );
          })}

          {isMovePreview && (
            <div
              className={`calendar-note-line move-note-preview ${
                isPreviewStart
                  ? "calendar-note-start"
                  : isPreviewEnd
                    ? "calendar-note-end"
                    : "calendar-note-middle"
              }`}
            >
              {isPreviewStart && movingNote.title}
            </div>
          )}
          {moreCount > 0 && (
            <div
              className="calendar-more"
              onMouseDown={(event) => {
                // این باعث میشه کلیک روی more اشتباهی وارد منطق onMouseDown روز نشه و مثلاً درگ جدید شروع نشه.
                event.stopPropagation();
                // از آیتم شماره ۱ به بعد رو بردار
                setMoreNotes(overflowNotePositions);
                setIsMoreOpen(true);
              }}
            >
              {moreCount} more
            </div>
          )}
        </>
      ),
      // وقتی اجرا میشه که کاربر دکمه موس رو روی یک روز فشار بده.
      onMouseDown: (event) => {
        if (pickerMode !== "day") {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        // ا داریم یک بازه جدید انتخاب می‌کنیم
        setDragMode("select");
        // تاریخ شروع روزی که روش کلیک شده
        setDragStart(currentDate);
        // تاریخ پایان هم روزی که روش کلیک شده چون درگی نداریم
        setDragEnd(currentDate);
        // هنوز حرکتی انجام نشده
        setHasMoved(false);
        // حالت انتخاب فعال شد
        setIsDragging(true);

        // فعلاً انتخاب شده‌ها فقط همین یک روز هستند.
        setSelectedRange([currentDate]);
      },
      onMouseEnter: () => {
        if (pickerMode !== "day") {
          return;
        }

        // آیا الان در حالت حرکت هستیم و نوت و تاریخ شروع حرکت را داریم؟
        if (dragMode === "move" && movingNote && moveStartDate) {
          console.log("MOVE ENTER", currentDate);

          // چون وارد یک روز دیگه شدیم پس درگ داشتیم
          setHasDraggedNote(true);
          // تابع زیر سه چیز میخواد 1نوتی که باید حرکت کند 2جایی که کاربر ان را گرفته 3جایی که موس الان قرار دارد
          const newDates = movedNoteDates(
            // بازه نوتی مثلا 10 تا 15
            movingNote,
            // کاربر روی 12 موس را فشار داده.
            moveStartDate,
            // بعد موس را حرکت داده و وارد روز 20 شده
            currentDate,
          );
          console.log("NEW DATES:", newDates);

          // این تاریخ‌های جدید را به عنوان پیش‌نمایش حرکت نوت ذخیره کن
          setMovePrewiew(newDates);

          return;
        }

        if (!isDragging || !dragStart) {
          return;
        }

        // کاربر دیگر فقط کلیک نکرده، حرکت هم داده.
        setHasMoved(true);
        // ساخت بازه تاریخ
        const range = createDateRange(dragStart, currentDate);
        // این بازه را به عنوان انتخاب فعلی ذخیره کن
        setSelectedRange(range);
        // آخرین جایی که موس رفته را ذخیره کن
        setDragEnd(currentDate);
      },
    };
  }

  // وقتی موس روی یک روز حرکت کرد
  // این قسمت مسئول تشخیص لحظه‌ایه که کاربر موس را رها می‌کند
  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    dragStart,
    dragMode,
    movingNote,
    movePrewiew,
    hasDraggedNote,
  ]);

  // این تابع مسئول ذخیره کردن نوت است
  function handleSaveNote() {
    // آیا داریم یک نوت قدیمی را ویرایش می‌کنیم یا یک نوت جدید می‌سازیم؟
    if (editingNote) {
      // می‌خواهیم کل آرایه نوت‌ها را بگردیم
      const updatedNotes = notes.map((note) => {
        // اگر این نوت همان نوتی است که کاربر باز کرده
        if (note.id === editingNote.id) {
          // پس تغییرش بده
          return {
            // همه اطلاعات قبلی رو نگهدار
            ...note,
            // فقط این دو تا را عوض کن
            title: noteTitle,
            description: noteDescription,
          };
        }
        return note;
      });
      setNotes(updatedNotes);
    } else {
      // اگر نوتی برای ویرایش وجود ندارد، یک نوت جدید بساز
      const newNote = {
        id: Date.now(),
        title: noteTitle,
        description: noteDescription,
        // نوت به این روزها وصل شود
        dates: selectedRange,
      };
      // نوت جدید را به قبلی‌ها اضافه کن
      setNotes([...notes, newNote]);
    }
    // مودال بسته شود
    setIsNoteOpen(false);
    // حالت ویرایش خاموش شود
    setIsEditing(false);
    // یادداشت در حال ویرایش پاک شود
    setEditingNote(null);
    // انتخاب تاریخ پاک شود
    setSelectedRange([]);
    setNoteTitle("");
    setNoteDescription("");
  }

  // این تابع مسئول بستن مودال نوت بدون ذخیره کردن است
  function handleCloseNote() {
    // مودال رو ببند
    setIsNoteOpen(false);
    // اگر کاربر در حالت ویرایش بود، آن حالت را خاموش کن
    setIsEditing(false);
    // نوت در حال ویرایش را پاک کن
    setEditingNote(null);
    setNoteTitle("");
    setNoteDescription("");
    setSelectedRange([]);
  }
  // این تابع مسئول حذف کردن یک نوت موجود است
  function handleDeleteNote() {
    // کل ارایه نوتارو بگرد این نوتی که الان باز کردیم تو شیم رو  در بیار و پاک کن
    const updatedNotes = notes.filter((note) => note.id !== editingNote.id);

    // آرایه جدید را جایگزین کن.
    setNotes(updatedNotes);
    // مودال رو ببند
    setIsNoteOpen(false);
    // دیگر نوتی برای ویرایش انتخاب نشده
    setEditingNote(null);
    setNoteTitle("");
    setNoteDescription("");
  }

  // از یک Note، روز شروع و روز پایان نوت رو پیدا می‌کنه
  function getNoteStartEnd(note) {
    const start = note.dates[0];
    const end = note.dates[note.dates.length - 1];

    return {
      start,
      end,
    };
  }

  const weekDays = [
    "شنبه",
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه",
  ];
  return (
    <div>
      <Calendar
        value={date}
        onChange={setDate}
        calendar={persian}
        locale={persian_fa}
        weekDays={weekDays}
        mapDays={pickerMode === "day" ? mapDays : undefined}
        className={pickerMode === "day" ? "calendar-large" : "calendar-other"}
        onMonthChange={() => {
          console.log("MONTH CHANGE");
        }}
        onYearChange={() => {
          console.log("YEAR CHANGED");
        }}
      />
      {isNoteOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-9999 flex items-center justify-center bg-[#0f2335]/20 backdrop-blur-md"
        >
          <div className="w-100 rounded-2xl border border-white/10!  p-6 space-y-1  bg-[#0f2335]/60  text-white">
            <h2 className="mb-4 text-2xl font-bold">یادداشت</h2>
            <input
              type="text"
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
              placeholder="عنوان یادداشت"
              disabled={!isEditing}
              className="w-full mb-4 hover:bg-white/5 hover:text-white rounded-2xl p-2 bg-transparent border border-transparent text-white placeholder:text-white/50 focus:outline-none focus:border-white/20"
            />{" "}
            <br />
            <textarea
              value={noteDescription}
              onChange={(event) => setNoteDescription(event.target.value)}
              placeholder="توضیحات یادداشت"
              disabled={!isEditing}
              className="w-full mb-4  hover:bg-white/5 hover:text-white rounded-2xl p-2 bg-transparent border border-transparent text-white placeholder:text-white/50 focus:outline-none focus:border-white/20"
            />
            <br />
            <div dir="ltr" className="flex justify-between text-sm">
              <div className="flex gap-2">
                <button
                  onClick={handleCloseNote}
                  className="rounded-lg cursor-pointer bg-blue-500  hover:bg-blue-600 text-white font-medium rounded-xl transition-all shadow-lg px-4 py-2 text-white px-4 py-2 text-white"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>

                <button
                  onClick={() => {
                    setIsEditing(true);
                  }}
                  className="rounded-lg cursor-pointer  bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all shadow-lg px-4 py-2 text-white shadow-primary-500/20 active:scale-95 "
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>

                <button
                  onClick={handleDeleteNote}
                  className="rounded-lg cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all shadow-lg px-4 py-2 text-white shadow-primary-500/20 active:scale-95 "
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
              <button
                onClick={handleSaveNote}
                className="rounded-lg cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all shadow-lg px-4 py-2 text-white shadow-primary-500/20 active:scale-95 "
              >
                <FontAwesomeIcon icon={faFloppyDisk} />
              </button>
            </div>
          </div>
        </div>
      )}
      {isMoreOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-9999 flex items-center justify-center bg-[#0f2335]/20 backdrop-blur-md"
        >
          <div className="w-100 max-h-[70vh] flex flex-col rounded-2xl border border-white/10! p-6 bg-[#0f2335]/60 text-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">یادداشت‌ها</h2>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="rounded-lg cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 transition-all"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto">
              {moreNotes.map((notePosition) => (
                <div
                  key={notePosition.note.id}
                  className="more-note-line"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    const note = notePosition.note;

                    setIsMoreOpen(false);
                    setHasDraggedNote(false);
                    setDragSource("more");
                    setMovingNote(note);
                    setMoveStartDate(note.dates[0]);
                    setDragMode("move");

                    console.log("MORE NOTE MOUSE DOWN", {
                      note,
                      moveStartDate: note.dates[0],
                      dragSource: "more",
                    });
                  }}
                >
                  <h3>{notePosition.note.title}</h3>
                  {notePosition.note.description && (
                    <p>{notePosition.note.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteEvent({ note }) {
  return <div className="note-event">{note.title}</div>;
}

export default App;
