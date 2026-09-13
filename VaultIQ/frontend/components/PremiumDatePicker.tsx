'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface PremiumDatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function PremiumDatePicker({ value, onChange, placeholder = 'Select date', name, required }: PremiumDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Local state for uncontrolled usage (in forms)
  const [localValue, setLocalValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = value !== undefined ? value : localValue;

  // Initialize from value
  useEffect(() => {
    if (displayValue) {
      const parsed = new Date(displayValue);
      if (!isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
      }
    }
  }, [displayValue]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDateClick = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    // Format to YYYY-MM-DD
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    
    setLocalValue(formatted);
    if (onChange) onChange(formatted);
    setIsOpen(false);
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
    }
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      const isSelected = displayValue && new Date(displayValue).getDate() === i && new Date(displayValue).getMonth() === month && new Date(displayValue).getFullYear() === year;
      const isToday = new Date().getDate() === i && new Date().getMonth() === month && new Date().getFullYear() === year;
      
      days.push(
        <button 
          key={i} 
          type="button"
          className={`cal-day ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''}`}
          onClick={(e) => { e.preventDefault(); handleDateClick(i); }}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  const formattedDisplay = displayValue ? new Date(displayValue).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  return (
    <div className="premium-datepicker" ref={containerRef}>
      {/* Hidden input for native form submission */}
      <input type="hidden" name={name} value={displayValue} required={required} />
      
      <div 
        className={`dp-trigger input ${isOpen ? 'active' : ''} ${!displayValue ? 'placeholder' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{formattedDisplay || placeholder}</span>
        <CalendarIcon size={16} className="dp-icon" />
      </div>

      {isOpen && (
        <div className="dp-popover glass animate-fade-in">
          <div className="dp-header">
            <button type="button" className="dp-nav-btn" onClick={handlePrevMonth}><ChevronLeft size={18} /></button>
            <div className="dp-month-year">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button type="button" className="dp-nav-btn" onClick={handleNextMonth}><ChevronRight size={18} /></button>
          </div>
          
          <div className="dp-weekdays">
            {DAYS.map(d => <div key={d}>{d}</div>)}
          </div>
          
          <div className="dp-days-grid">
            {renderCalendarDays()}
          </div>
        </div>
      )}

      <style jsx>{`
        .premium-datepicker {
          position: relative;
          width: 100%;
        }
        .dp-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        .dp-trigger.placeholder span {
          color: var(--text-muted);
        }
        .dp-trigger.active {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px rgba(88,166,255,0.2);
        }
        .dp-icon {
          color: var(--text-secondary);
        }
        
        .dp-popover {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          z-index: 50;
          padding: 16px;
          border-radius: 12px;
          width: 280px;
          box-shadow: var(--shadow-lg);
          background: rgba(13, 17, 23, 0.95);
        }

        .dp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .dp-month-year {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-primary);
        }
        .dp-nav-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
        }
        .dp-nav-btn:hover {
          background: rgba(255,255,255,0.1);
          color: var(--text-primary);
        }

        .dp-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .dp-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .cal-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .cal-day:hover:not(.empty) {
          background: rgba(255,255,255,0.1);
        }
        .cal-day.empty {
          cursor: default;
        }
        .cal-day.today {
          color: var(--accent-primary);
          font-weight: 700;
          background: rgba(88,166,255,0.1);
        }
        .cal-day.selected {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          color: white;
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(88,166,255,0.3);
        }
      `}</style>
    </div>
  );
}
