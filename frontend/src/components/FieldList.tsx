import { Field } from '../types/Field'
import { getFieldStatusLabel } from '../utils/fieldUtils'

interface FieldListProps {
  fields: Field[]
  loading: boolean
}

function FieldList({ fields, loading }: FieldListProps) {
  if (loading && fields.length === 0) {
    return (
      <div className="field-list">
        <div style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
          ⏳ Загрузка полей...
        </div>
      </div>
    )
  }

  if (fields.length === 0) {
    return (
      <div className="field-list">
        <div style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
          📭 Поля не найдены
          <br />
          <small>Создайте первое поле, выделив область на карте</small>
        </div>
      </div>
    )
  }

  return (
    <div className="field-list">
      <h3 style={{ padding: '1rem', margin: 0, borderBottom: '1px solid #f0f0f0' }}>
        📋 Список полей ({fields.length})
      </h3>
      
      {fields.map((field) => (
        <div key={field.id} className="field-item">
          <div className="field-name">
            🌾 {field.fieldName}
          </div>
          <div className="field-details">
            🌱 Культура: {field.crop_type || 'Не указана'}
            <br />
            📊 Статус: {getFieldStatusLabel(field.status)}
            <br />
            📏 Площадь: {field.areaHectares} га
            <br />
            📍 Точек: {field.coordinates.length}
          </div>
        </div>
      ))}
    </div>
  )
}

export default FieldList