import { Calendar } from "react-multi-date-picker";
import DateObject from "react-date-object";
import { useEffect, useState, useMemo, useRef } from "react";

import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "./calendar-day.css";
import "./calendar-month-year.css";
import "./calendar-touch.css";
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

  // نوت‌هایی که فعلاً روی تقویم مخفی کردیم رو نگه داره
  const [moreNotes, setMoreNotes] = useState([]);
  // باز یا بسته بودن more مودال
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // مشخص می‌کند الان چه نوع درگی داریم
  const [dragMode, setDragMode] = useState(null);
  // نوتی که الان داریم جابه‌جایش می‌کنیم
  const [movingNote, setMovingNote] = useState(null);
  // تاریخی که کاربر نوت را از روی آن گرفته
  const [moveStartDate, setMoveStartDate] = useState(null);
  // پیش‌نمایش جای جدید نوت هنگام حرکت
  const [movePrewiew, setMovePrewiew] = useState([]);
  // آیا کاربر هنگام جابه‌جایی نوت، واقعاً موس/انگشت را حرکت داده؟
  const [hasDraggedNote, setHasDraggedNote] = useState(false);

  const [dragSource, setDragSource] = useState(null);

  const [hoveredNote, setHoveredNote] = useState(null);

  // تعداد لاین نوت قابل نمایش در هر روز (موبایل ۱، تبلت به بالا ۲)
  const [maxVisibleLanes, setMaxVisibleLanes] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 2,
  );

  // بعد از هر لمس، رویدادهای موسِ شبیه‌سازی‌شده را موقتاً نادیده می‌گیریم
  const lastTouchTimeRef = useRef(0);

  function isFromTouch() {
    return Date.now() - lastTouchTimeRef.current < 600;
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");

    function handleChange(event) {
      setMaxVisibleLanes(event.matches ? 2 : 1);
    }

    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

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

  // دوتاریخ بگیر و تاریخ های بینشون رو بساز و تحویل بده
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
  function movedNoteDates(note, fromDate, toDate) {
    const from = new DateObject({
      year: fromDate.year,
      month: fromDate.month,
      day: fromDate.day,
      calendar: persian,
    });
    const to = new DateObject({
      year: toDate.year,
      month: toDate.month,
      day: toDate.day,
      calendar: persian,
    });

    // toDays() اختلاف بین تاریخ ها با استفاده از
    const difference = to.toDays() - from.toDays();

    return note.dates.map((noteDate) => {
      const current = new DateObject({
        year: noteDate.year,
        month: noteDate.month,
        day: noteDate.day,
        calendar: persian,
      });

      const newDate = current.add(difference, "day");

      return {
        year: newDate.year,
        month: newDate.month.number,
        day: newDate.day,
      };
    });
  }

  // یک نوت مشخص را می‌گیرد و تاریخ‌های آن نوت را با تاریخ‌های جدید جایگزین می‌کند
  function updateMovedNote(note, newDates) {
    setNotes((prevNotes) => {
      return prevNotes.map((item) => {
        if (item.id === note.id) {
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
    // اگر صفحه‌ی روزها فعال نیست، هیچ عملی انجام نده
    if (pickerMode !== "day") {
      setIsDragging(false);
      return;
    }

    // آیا الان در حالت جابه‌جایی هستیم و یک نوت برای جابه‌جایی داریم؟
    if (dragMode === "move" && movingNote) {
      // آیا کاربر واقعاً موس را حرکت داده؟
      if (hasDraggedNote) {
        if (movePrewiew.length > 0) {
          updateMovedNote(movingNote, movePrewiew);
        }
      } else {
        setEditingNote(movingNote);
        setNoteTitle(movingNote.title);
        setNoteDescription(movingNote.description);
        setIsEditing(false);
        setIsNoteOpen(true);
      }

      // کار Move تمام شد، برگرد به حالت عادی.
      setDragMode(null);
      setMovingNote(null);
      setMoveStartDate(null);
      setMovePrewiew([]);
      setHasDraggedNote(false);
      setDragSource(null);

      return;
    }

    // اگه اصلا انتخابی نشده یا نقطه شروعی نداریم کاری نکن کلا
    if (!isDragging || !dragStart) {
      return;
    }

    // وقتی پنجره نوت باز شد، کاربر اجازه تایپ داشته باشد
    setIsEditing(true);
    // مودال نمایش داده بشه
    setIsNoteOpen(true);
    // دیگر موس را دنبال نکن.
    setIsDragging(false);
  }

  //  آیا برای این نوت روزی داریم؟
  function findNotesByDate(currentDate) {
    return notes.filter((note) => {
      return note.dates.some((noteDate) => {
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
    const dayPicker = document.querySelector(".rmdp-day-picker");

    if (!dayPicker) {
      return;
    }

    const isDayActive = dayPicker.getAttribute("data-active") === "true";

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

  // ==============================
  // هندلرهای مشترک موس و لمس
  // ==============================

  // شروع انتخاب بازه — هم موس هم لمس
  function handlePressStart(currentDate) {
    if (pickerMode !== "day") {
      return;
    }

    // وسط جابه‌جایی نوت نباید انتخاب جدید شروع شود
    if (dragMode === "move" && movingNote) {
      return;
    }

    setDragMode("select");
    setDragStart(currentDate);
    setDragEnd(currentDate);
    setHasMoved(false);
    setIsDragging(true);
    setSelectedRange([currentDate]);
  }

  // حرکت روی روزها — هم موس (mouseenter) هم لمس (touchmove)
  function handlePressMove(currentDate) {
    if (pickerMode !== "day") {
      return;
    }

    // حالت جابه‌جایی نوت
    if (dragMode === "move" && movingNote && moveStartDate) {
      setHasDraggedNote(true);
      setMovePrewiew(movedNoteDates(movingNote, moveStartDate, currentDate));
      return;
    }

    // حالت انتخاب بازه
    if (!isDragging || !dragStart) {
      return;
    }

    setHasMoved(true);
    setSelectedRange(createDateRange(dragStart, currentDate));
    setDragEnd(currentDate);
  }

  // گرفتن نوت از روی تقویم برای جابه‌جایی
  function startNoteMove(note, currentDate) {
    setHasDraggedNote(false);
    setDragMode("move");
    setDragSource("day");
    setMovingNote(note);
    setMoveStartDate(currentDate);
  }

  // گرفتن نوت از مودال more برای جابه‌جایی
  function pickNoteFromMore(note) {
    setIsMoreOpen(false);
    setHasDraggedNote(false);
    setDragSource("more");
    setMovingNote(note);
    setMoveStartDate(note.dates[0]);
    setDragMode("move");
  }

  // به تقویم میگه هر روزی که داری میسازی قبل از نمایش بیا این تابع رو اجرا کن
  function mapDays({ date }) {
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

    const isSelected = selectedIndex !== -1;
    const isSingleSelected = isSelected && selectedRange.length === 1;
    const isFirstSelected =
      isSelected && selectedRange.length > 1 && selectedIndex === 0;
    const isLastSelected =
      isSelected &&
      selectedRange.length > 1 &&
      selectedIndex === selectedRange.length - 1;
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

    // دادن روز به تابع پیدا کننده نوت روزها
    const savedNotes = findNotesByDate(currentDate);

    // هر نوت در هر روز چه وضعیتی داره + لِین ثابتش
    const MAX_VISIBLE_LANES = maxVisibleLanes;

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

    return {
      // برای پیدا کردن روز زیرِ انگشت هنگام درگ لمسی ضروری است
      "data-date": `${currentDate.year}-${currentDate.month}-${currentDate.day}`,

      children: (
        <>
          <div className="calendar-day-number pb-1">{date.day}</div>

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
                // برای پیدا کردن نوت زیرِ انگشت هنگام لمس لازم است
                data-note-id={note.id}
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
                  if (isFromTouch()) return;
                  startNoteMove(note, currentDate);
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
              // برای مدیریت لمسِ دکمه more در هندلر native لازم است
              data-more="true"
              data-overflow-ids={JSON.stringify(
                overflowNotePositions.map((position) => position.note.id),
              )}
              onMouseDown={(event) => {
                // این باعث میشه کلیک روی more اشتباهی وارد منطق onMouseDown روز نشه
                event.stopPropagation();
                if (isFromTouch()) return;
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
        if (isFromTouch()) return;

        handlePressStart(currentDate);
      },

      onMouseEnter: () => {
        if (isFromTouch()) return;
        handlePressMove(currentDate);
      },
    };
  }

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
    pickerMode,
    dragSource,
  ]);

  // ==============================
  // پشتیبانی از لمس (موبایل)
  // React از نسخه ۱۷ رویدادهای لمسی را passive ثبت می‌کند و
  // preventDefault داخل onTouchStart کار نمی‌کند؛
  // پس لمس را native و با passive:false مدیریت می‌کنیم.
  // ==============================
  useEffect(() => {
    function getDateFromElement(element) {
      if (!element) {
        return null;
      }

      const parts = element.getAttribute("data-date").split("-").map(Number);

      return { year: parts[0], month: parts[1], day: parts[2] };
    }

    function isDragActive() {
      return Boolean(isDragging || (dragMode === "move" && movingNote));
    }

    function handleTouchStart(event) {
      if (pickerMode !== "day") {
        return;
      }

      const target = event.target;
      if (!target || !target.closest) {
        return;
      }

      // ۱) دکمه‌ی more
      const moreElement = target.closest("[data-more]");
      if (moreElement) {
        event.preventDefault();

        let ids = [];
        try {
          ids = JSON.parse(
            moreElement.getAttribute("data-overflow-ids") || "[]",
          );
        } catch (error) {
          ids = [];
        }

        const positions = ids
          .map((id) => notes.find((note) => String(note.id) === String(id)))
          .filter(Boolean)
          .map((note) => ({ note }));

        setMoreNotes(positions);
        setIsMoreOpen(true);
        return;
      }

      // ۲) گرفتن نوت برای جابه‌جایی
      const noteElement = target.closest("[data-note-id]");
      if (noteElement) {
        event.preventDefault();

        // وسط یک جابه‌جاییِ در جریان، نوت جدیدی بردار
        if (dragMode === "move" && movingNote) {
          return;
        }

        const noteId = noteElement.getAttribute("data-note-id");
        const note = notes.find((item) => String(item.id) === String(noteId));
        const day = getDateFromElement(noteElement.closest("[data-date]"));

        if (note && day) {
          startNoteMove(note, day);
        }
        return;
      }

      // ۳) شروع انتخاب بازه روی روز
      const dayElement = target.closest("[data-date]");
      if (dayElement) {
        event.preventDefault();

        // وسط جابه‌جایی نوت، انتخاب جدید شروع نکن
        if (dragMode === "move" && movingNote) {
          return;
        }

        const day = getDateFromElement(dayElement);

        if (day) {
          handlePressStart(day);
        }
      }
    }

    function handleTouchMove(event) {
      if (pickerMode !== "day") {
        return;
      }
      if (!isDragActive()) {
        return;
      }

      // جلوی اسکرول صفحه حین درگ را بگیر
      event.preventDefault();

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      // پیدا کردن روزِ زیر انگشت
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const dayElement = element?.closest("[data-date]");
      const day = getDateFromElement(dayElement);

      if (day) {
        handlePressMove(day);
      }
    }

    function handleTouchEnd() {
      lastTouchTimeRef.current = Date.now();

      if (isDragActive()) {
        handleMouseUp();
      }
    }

    // passive: false اجباری است، وگرنه preventDefault کار نمی‌کند
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [
    isDragging,
    dragMode,
    movingNote,
    moveStartDate,
    dragStart,
    movePrewiew,
    hasDraggedNote,
    pickerMode,
    notes,
  ]);

  // این تابع مسئول ذخیره کردن نوت است
  function handleSaveNote() {
    if (editingNote) {
      const updatedNotes = notes.map((note) => {
        if (note.id === editingNote.id) {
          return {
            ...note,
            title: noteTitle,
            description: noteDescription,
          };
        }
        return note;
      });
      setNotes(updatedNotes);
    } else {
      const newNote = {
        id: Date.now(),
        title: noteTitle,
        description: noteDescription,
        // نوت به این روزها وصل شود
        dates: selectedRange,
      };
      setNotes([...notes, newNote]);
    }
    setIsNoteOpen(false);
    setIsEditing(false);
    setEditingNote(null);
    setSelectedRange([]);
    setNoteTitle("");
    setNoteDescription("");
  }

  // این تابع مسئول بستن مودال نوت بدون ذخیره کردن است
  function handleCloseNote() {
    setIsNoteOpen(false);
    setIsEditing(false);
    setEditingNote(null);
    setNoteTitle("");
    setNoteDescription("");
    setSelectedRange([]);
  }

  // این تابع مسئول حذف کردن یک نوت موجود است
  function handleDeleteNote() {
    const updatedNotes = notes.filter((note) => note.id !== editingNote.id);

    setNotes(updatedNotes);
    setIsNoteOpen(false);
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
                  className="rounded-lg cursor-pointer bg-blue-500  hover:bg-blue-600  font-medium  transition-all shadow-lg px-4 py-2  text-white"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>

                <button
                  onClick={() => {
                    setIsEditing(true);
                  }}
                  className=" cursor-pointer  bg-blue-500 hover:bg-blue-600  font-medium rounded-xl transition-all shadow-lg px-4 py-2 text-white shadow-primary-500/20 active:scale-95 "
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>

                <button
                  onClick={handleDeleteNote}
                  className=" cursor-pointer bg-blue-500 hover:bg-blue-600  font-medium rounded-xl transition-all shadow-lg px-4 py-2 text-white shadow-primary-500/20 active:scale-95 "
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
              <button
                onClick={handleSaveNote}
                className=" cursor-pointer bg-blue-500 hover:bg-blue-600  font-medium rounded-xl transition-all shadow-lg px-4 py-2 text-white shadow-primary-500/20 active:scale-95 "
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
                    if (isFromTouch()) return;
                    pickNoteFromMore(notePosition.note);
                  }}
                  onTouchStart={(event) => {
                    event.stopPropagation();
                    pickNoteFromMore(notePosition.note);
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