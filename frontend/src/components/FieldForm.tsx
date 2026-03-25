import { useState } from "react"

interface FieldFormProps {
  onCreateField: (name: string, cropType: string, status: string) => void
  onStartDrawing: () => void
  onCancelDrawing: () => void
  isDrawing: boolean
  hasPolygon: boolean
  currentArea?: number
  loading: boolean
  onStartCreatingHole?: () => void
  onFinishCreatingHole?: () => void
  onCancelCreatingHole?: () => void
  isCreatingHole?: boolean
  hasHole?: boolean
  holesCount?: number
}

function FieldForm({ 
  onCreateField, 
  onStartDrawing, 
  onCancelDrawing, 
  isDrawing, 
  hasPolygon,
  currentArea = 0,
  loading,
  onStartCreatingHole,
  onFinishCreatingHole,
  onCancelCreatingHole,
  isCreatingHole = false,
  hasHole = false,
  holesCount = 0
}: FieldFormProps) {
  const [fieldName, setFieldName] = useState("")
  const [cropType, setCropType] = useState("")
  const [status, setStatus] = useState("ACTIVE")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fieldName.trim()) {
      alert("Введите название поля")
      return
    }
    
    onCreateField(
      fieldName.trim(),
      cropType.trim() || "Не указана",
      status.trim() || "ACTIVE"
    )
    setFieldName("")
    setCropType("")
    setStatus("ACTIVE")
  }

  const getStatusMessage = () => {
    if (isCreatingHole) {
      if (hasHole) return `Отверстие готово! 📍 Площадь поля: ${currentArea.toFixed(2)} га`
      return "Отмечайте границы отверстия (озеро, постройка)"
    }
    if (!isDrawing) return "Начните с выделения основного поля"
    if (hasPolygon) return `Поле готово! 📍 Площадь: ${currentArea.toFixed(2)} га. Можно добавить отверстия`
    if (currentArea > 0) return `Отмечайте углы поля. 📍 Площадь: ${currentArea.toFixed(2)} га`
    return "Отмечайте углы поля на карте"
  }

  return (
    <div className="field-form">
      <div className="status-indicator">
        <p>{getStatusMessage()}</p>
      </div>

      {!isDrawing && (
        <div className="action-section">
          <button 
            onClick={onStartDrawing}
            className="btn btn-primary"
            style={{ width: "100%", padding: "1rem" }}
          >
            🖌️ Начать выделение поля
          </button>
        </div>
      )}

      {isDrawing && (
        <div className="drawing-controls">
          {currentArea > 0 && (
            <div style={{ padding: "0.75rem", backgroundColor: "#e8f5e8", borderRadius: "6px", marginBottom: "1rem", border: "1px solid #c3e6cb" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.2rem" }}>📍</span>
                <strong style={{ color: "#155724", fontSize: "1.1rem" }}>
                  Площадь: {currentArea.toFixed(2)} га
                </strong>
                {holesCount > 0 && (
                  <span style={{ color: "#856404", fontSize: "0.9rem" }}>
                    (с учетом {holesCount} отверст.)
                  </span>
                )}
              </div>
            </div>
          )}
          
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button 
              type="button" 
              onClick={onCancelDrawing}
              className="btn"
              style={{ backgroundColor: "#e74c3c", color: "white", flex: 1 }}
            >
              ❌ Отменить
            </button>
          </div>
          
          {hasPolygon && !isCreatingHole && onStartCreatingHole && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "#f8f9fa", borderRadius: "8px" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", color: "#2c3e50" }}>🕳️ Отверстия:</h4>
              {holesCount > 0 && (
                <p style={{ margin: "0 0 0.5rem 0", color: "#27ae60", fontSize: "0.9rem" }}>
                  ✅ Отверстий: {holesCount}
                </p>
              )}
              <button 
                type="button" 
                onClick={onStartCreatingHole}
                className="btn"
                style={{ backgroundColor: "#f39c12", color: "white", width: "100%" }}
              >
                ➕ Добавить отверстие
              </button>
            </div>
          )}
          
          {isCreatingHole && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "#fff3cd", borderRadius: "8px" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", color: "#856404" }}>🕳️ Создание отверстия:</h4>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {hasHole && onFinishCreatingHole && (
                  <button 
                    type="button" 
                    onClick={onFinishCreatingHole}
                    className="btn"
                    style={{ backgroundColor: "#27ae60", color: "white", flex: 1 }}
                  >
                    ✅ Готово
                  </button>
                )}
                {onCancelCreatingHole && (
                  <button 
                    type="button" 
                    onClick={onCancelCreatingHole}
                    className="btn"
                    style={{ backgroundColor: "#e74c3c", color: "white", flex: 1 }}
                  >
                    ❌ Отмена
                  </button>
                )}
              </div>
            </div>
          )}

          {hasPolygon && !isCreatingHole && (
            <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
              <h3>📋 Данные поля</h3>
              
              <div className="form-group">
                <label htmlFor="fieldName">🏷️ Название:</label>
                <input
                  type="text"
                  id="fieldName"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="Например: Южное поле"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cropType">🌱 Тип культуры:</label>
                <input
                  type="text"
                  id="cropType"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder="Например: Пшеница"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">📊 Статус:</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                >
                  <option value="ACTIVE">Активное</option>
                  <option value="INACTIVE">Неактивное</option>
                  <option value="FALLOW">Под паром</option>
                  <option value="PENDING">На обработке</option>
                </select>
              </div>

              <div style={{ padding: "0.75rem", backgroundColor: "#f8f9fa", borderRadius: "6px", marginBottom: "1rem" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#6c757d", textAlign: "center" }}>
                  📏 Площадь будет вычислена автоматически
                </p>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading || !fieldName.trim()}
              >
                {loading ? "⏳ Сохранение..." : "💾 Сохранить поле"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

export default FieldForm
