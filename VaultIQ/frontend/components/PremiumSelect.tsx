'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface PremiumSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  name?: string;
  required?: boolean;
}

export default function PremiumSelect({ value, onChange, options, placeholder = 'Select an option', name, required }: PremiumSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = value !== undefined ? value : localValue;
  const selectedOption = options.find(o => o.value === displayValue);

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

  const handleSelect = (optionValue: string) => {
    setLocalValue(optionValue);
    if (onChange) onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="premium-select" ref={containerRef}>
      {/* Hidden input for native form submission */}
      <input type="hidden" name={name} value={displayValue} required={required} />
      
      <div 
        className={`ps-trigger input ${isOpen ? 'active' : ''} ${!displayValue ? 'placeholder' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className={`ps-icon ${isOpen ? 'rotated' : ''}`} />
      </div>

      {isOpen && (
        <div className="ps-dropdown glass animate-fade-in">
          {options.map((option) => {
            const isSelected = displayValue === option.value;
            return (
              <div 
                key={option.value}
                className={`ps-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={16} className="ps-check" />}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .premium-select {
          position: relative;
          width: 100%;
        }
        .ps-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
          min-height: 42px; /* standard input height */
        }
        .ps-trigger.placeholder span {
          color: var(--text-muted);
        }
        .ps-trigger.active {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px rgba(88,166,255,0.2);
        }
        .ps-icon {
          color: var(--text-secondary);
          transition: transform 0.2s ease;
        }
        .ps-icon.rotated {
          transform: rotate(180deg);
        }
        
        .ps-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          z-index: 50;
          padding: 8px;
          border-radius: 12px;
          box-shadow: var(--shadow-lg);
          background: rgba(13, 17, 23, 0.95);
          max-height: 250px;
          overflow-y: auto;
        }
        /* Custom scrollbar for dropdown */
        .ps-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .ps-dropdown::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
        }

        .ps-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text-primary);
          transition: background 0.2s;
          font-size: 0.95rem;
        }
        .ps-option:hover {
          background: rgba(255,255,255,0.1);
        }
        .ps-option.selected {
          background: rgba(88,166,255,0.15);
          color: var(--accent-primary);
          font-weight: 600;
        }
        .ps-check {
          color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
}
