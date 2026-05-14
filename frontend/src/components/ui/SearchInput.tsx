import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Поиск...', className = '' }: SearchInputProps) {
  return (
    <div className={`search-input-wrapper ${className}`}>
      <Search size={14} className="search-input-icon" />
      <input
        type="text"
        className="form-control search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-input-clear" onClick={() => onChange('')}>
          <X size={12} />
        </button>
      )}
    </div>
  )
}

