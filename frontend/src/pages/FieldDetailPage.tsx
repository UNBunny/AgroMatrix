import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts'
import { MapContainer, TileLayer, Polygon as LeafletPolygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  ArrowLeft, BarChart2, Wheat, MapPin, RefreshCw, ExternalLink,
  Satellite, Plus, X, Save, FlaskConical, Download, Pencil, TrendingUp,
  Beaker, ShieldCheck, Leaf, Bug, Loader2, AlertTriangle, Activity,
  Thermometer, Droplets, CloudRain, Sprout, Calendar, ClipboardList,
} from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { ndviService, getNdviColor, getNdviLabel } from '../services/ndviService'
import { cropHistoryService, cropTypeService } from '../services/cropService'
import { Field, NdviRecord, NdviImageResponse } from '../types/Field'
import { CropHistory, CropHistoryRequest, CropType, PlantingStatus } from '../types/CropTypes'
import { getNdviBadge } from '../components/ui/Badge'
import { soilService, SoilData, SoilDataRequest } from '../services/soilService'
import { getFieldStatusLabel, getSoilTextureLabel } from '../utils/fieldUtils'
import { LoadingOverlay } from '../components/ui/LoadingOverlay'
import WeatherWidget from '../components/weather/WeatherWidget'
import { phenologyService } from '../services/phenologyService'
import { fertilizerApplicationService } from '../services/fertilizerApplicationService'
import { plantProtectionService } from '../services/plantProtectionService'
import {
  PhenologicalObservation, PhenologicalObservationRequest, ObservationMethod,
  FertilizerApplication, FertilizerApplicationRequest, ApplicationMethod,
  PlantProtectionOperation, PlantProtectionRequest,
  ProtectionOperationType, InfestationLevel,
} from '../types/AgronomicTypes'
import { diseaseMLService, DiseasePredictResponse } from '../services/mlService'
import { weatherService, WeatherDay, weatherIcon } from '../services/weatherService'
import { diseaseProductService, DiseaseProductRecommendationDto, DiseaseProductItemDto } from '../services/diseaseProductService'
import 'leaflet/dist/leaflet.css'

function FitBoundsField({ field }: { field: Field }) {
  const map = useMap()
  useEffect(() => {
    const lls = field.coordinates.map(c => L.latLng(c[1], c[0]))
    map.fitBounds(L.latLngBounds(lls), { padding: [30, 30] })
  }, [field, map])
  return null
}

function NdviImageLayer({ imageUrl, bbox }: { imageUrl: string; bbox: number[] }) {
  const map = useMap()
  useEffect(() => {
    const [west, south, east, north] = bbox
    const bounds = L.latLngBounds(L.latLng(south, west), L.latLng(north, east))
    const overlay = L.imageOverlay(imageUrl, bounds, { opacity: 0.88, zIndex: 400 })
    overlay.addTo(map)
    return () => { map.removeLayer(overlay) }
  }, [imageUrl, bbox, map])
  return null
}

function monthsAgoStr(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().split('T')[0]
}
function todayStr() { return new Date().toISOString().split('T')[0] }
function fmtDate(ds: string) {
  return new Date(ds).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

type FieldTab = 'overview' | 'operations' | 'diseases' | 'phenology'

const TAB_LABELS: Record<FieldTab, string> = {
  overview:   'Обзор',
  operations: 'Операции',
  diseases:   'Болезни (ML)',
  phenology:  'Фенология',
}

const STATUS_LABELS: Record<PlantingStatus, string> = {
  [PlantingStatus.PLANNED]: 'Запланировано',
  [PlantingStatus.PLANTED]: 'Посажено',
  [PlantingStatus.GROWING]: 'Растёт',
  [PlantingStatus.HARVESTED]: 'Собрано',
}
const STATUS_COLORS: Record<PlantingStatus, string> = {
  [PlantingStatus.PLANNED]: 'var(--color-info)',
  [PlantingStatus.PLANTED]: 'var(--color-primary)',
  [PlantingStatus.GROWING]: 'var(--color-accent)',
  [PlantingStatus.HARVESTED]: 'var(--color-warning)',
}

const METHOD_LABELS_FERT: Record<ApplicationMethod, string> = {
  [ApplicationMethod.BROADCAST]:  'Поверхностное',
  [ApplicationMethod.FERTIGATION]: 'Фертигация',
  [ApplicationMethod.FOLIAR]:     'Листовая',
  [ApplicationMethod.LOCALIZED]:  'Локальное',
}

const PROT_TYPE_LABELS: Record<ProtectionOperationType, string> = {
  [ProtectionOperationType.HERBICIDE]:  '🌿 Гербицид',
  [ProtectionOperationType.FUNGICIDE]:  '🍄 Фунгицид',
  [ProtectionOperationType.INSECTICIDE]:'🐛 Инсектицид',
  [ProtectionOperationType.DESICCANT]:  '🌵 Десикант',
}
const PROT_TYPE_COLORS: Record<ProtectionOperationType, string> = {
  [ProtectionOperationType.HERBICIDE]:  'var(--color-success)',
  [ProtectionOperationType.FUNGICIDE]:  '#a855f7',
  [ProtectionOperationType.INSECTICIDE]:'var(--color-warning)',
  [ProtectionOperationType.DESICCANT]:  'var(--color-danger)',
}
const INFESTATION_LABELS: Record<InfestationLevel, string> = {
  [InfestationLevel.LOW]:               'Низкая',
  [InfestationLevel.MEDIUM]:            'Средняя',
  [InfestationLevel.HIGH]:              'Высокая',
  [InfestationLevel.ECONOMIC_THRESHOLD]:'Экономический порог',
}

const BBCH_PRESETS = [
  { code: 0, label: '00 — Сухое семя' },
  { code: 10, label: '10 — Всходы' },
  { code: 13, label: '13 — 3 листа' },
  { code: 21, label: '21 — 1 побег' },
  { code: 30, label: '30 — Начало стеблевания' },
  { code: 37, label: '37 — Флаговый лист' },
  { code: 49, label: '49 — Колошение' },
  { code: 61, label: '61 — Цветение' },
  { code: 71, label: '71 — Налив зерна' },
  { code: 85, label: '85 — Молочная спелость' },
  { code: 87, label: '87 — Восковая спелость' },
  { code: 89, label: '89 — Полная спелость' },
]
const BBCH_METHOD_LABELS: Record<ObservationMethod, string> = {
  [ObservationMethod.VISUAL]: 'Визуальный',
  [ObservationMethod.TACTILE]: 'Тактильный',
  [ObservationMethod.LAB_ANALYSIS]: 'Лабораторный',
}

const DISEASE_CROPS = [
  { value: 'spring_wheat',  label: 'Пшеница яровая' },
  { value: 'winter_wheat',  label: 'Пшеница озимая' },
  { value: 'spring_barley', label: 'Ячмень яровой' },
  { value: 'corn',          label: 'Кукуруза' },
  { value: 'sunflower',     label: 'Подсолнечник' },
  { value: 'soybean',       label: 'Соя' },
  { value: 'rapeseed',      label: 'Рапс' },
  { value: 'peas',          label: 'Горох' },
  { value: 'buckwheat',     label: 'Гречиха' },
  { value: 'flax',          label: 'Лён' },
]
const DISEASE_STAGES = [
  { value: 'seedling',   label: 'Всходы' },
  { value: 'vegetative', label: 'Вегетация' },
  { value: 'flowering',  label: 'Цветение' },
  { value: 'ripening',   label: 'Созревание' },
]
const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'Высокий',  color: '#e74c3c', bg: '#fdecea' },
  medium: { label: 'Средний',  color: '#f39c12', bg: '#fef9e7' },
  low:    { label: 'Низкий',   color: '#27ae60', bg: '#eafaf1' },
}

const NdviChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as NdviRecord
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{fmtDate(d.date)}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: getNdviColor(d.mean) }}>
        NDVI: {d.mean.toFixed(3)}
      </div>
      {d.min != null && d.max != null && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
          {Number(d.min).toFixed(3)} – {Number(d.max).toFixed(3)}
        </div>
      )}
      <div style={{ fontSize: 10, marginTop: 4, color: 'var(--color-text-muted)' }}>
        {d.source === 'GEE_SENTINEL2' ? '🛰️ Sentinel-2' : '📡 AgroMonitoring'}
      </div>
    </div>
  )
}

export default function FieldDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const fieldId = Number(id)

  const tabParam = searchParams.get('tab') as FieldTab | null
  const activeTab: FieldTab = tabParam && ['overview','operations','diseases','phenology'].includes(tabParam)
    ? tabParam
    : 'overview'
  const setTab = (t: FieldTab) => setSearchParams(t === 'overview' ? {} : { tab: t }, { replace: true })

  const [field, setField] = useState<Field | null>(null)
  const [ndviHistory, setNdviHistory] = useState<NdviRecord[]>([])
  const [currentNdvi, setCurrentNdvi] = useState<NdviRecord | null>(null)
  const [cropHistories, setCropHistories] = useState<CropHistory[]>([])
  const [loadingField, setLoadingField] = useState(true)
  const [loadingNdvi, setLoadingNdvi] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [ndviError, setNdviError] = useState<string | null>(null)
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<Partial<CropHistoryRequest>>({})
  const [savingHistory, setSavingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [editingField, setEditingField] = useState(false)
  const [editForm, setEditForm] = useState({ fieldName: '', crop_type: '', status: '' })
  const [savingField, setSavingField] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSaveField = async () => {
    if (!field || !editForm.fieldName.trim()) { setFieldError('Название обязательно'); return }
    setSavingField(true); setFieldError(null)
    try {
      const updated = await fieldService.updateField(field.id, {
        fieldName: editForm.fieldName,
        crop_type: editForm.crop_type,
        status: editForm.status,
        coordinates: field.coordinates,
        holes: field.holes,
        areaHectares: field.areaHectares,
        regionCode: field.regionCode,
        regionName: field.regionName,
      })
      setField(updated)
      setEditingField(false)
    } catch {
      setFieldError('Ошибка сохранения')
    } finally { setSavingField(false) }
  }

  const [soilData, setSoilData] = useState<SoilData | null>(null)
  const [loadingSoil, setLoadingSoil] = useState(false)
  const [fetchingSoil, setFetchingSoil] = useState(false)
  const [soilError, setSoilError] = useState<string | null>(null)
  const [showSoilEdit, setShowSoilEdit] = useState(false)
  const [soilForm, setSoilForm] = useState<SoilDataRequest>({})
  const [savingSoil, setSavingSoil] = useState(false)

  const [ndviImage, setNdviImage] = useState<NdviImageResponse | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [selectedNdviRecord, setSelectedNdviRecord] = useState<NdviRecord | null>(null)

  // ── Operations tab state ────────────────────────────────────────────────────
  const [opsTab, setOpsTab] = useState<'fertilizer' | 'protection'>('fertilizer')
  const [fertItems, setFertItems] = useState<FertilizerApplication[]>([])
  const [fertLoading, setFertLoading] = useState(false)
  const [showFertForm, setShowFertForm] = useState(false)
  const [editFertId, setEditFertId] = useState<number | null>(null)
  const [fertForm, setFertForm] = useState<FertilizerApplicationRequest>({ cropHistoryId: 0, applicationDate: todayStr(), fertilizerType: '' })
  const [savingFert, setSavingFert] = useState(false)
  const [fertError, setFertError] = useState<string | null>(null)
  const [protItems, setProtItems] = useState<PlantProtectionOperation[]>([])
  const [protLoading, setProtLoading] = useState(false)
  const [showProtForm, setShowProtForm] = useState(false)
  const [editProtId, setEditProtId] = useState<number | null>(null)
  const [protForm, setProtForm] = useState<PlantProtectionRequest>({ cropHistoryId: 0, operationDate: todayStr(), operationType: ProtectionOperationType.HERBICIDE, productName: '' })
  const [savingProt, setSavingProt] = useState(false)
  const [protError, setProtError] = useState<string | null>(null)
  const [selectedCropHistoryId, setSelectedCropHistoryId] = useState<number | null>(null)

  // ── Disease ML tab state ────────────────────────────────────────────────────
  const [diseaseCrop, setDiseaseCrop] = useState('spring_wheat')
  const [diseaseStage, setDiseaseStage] = useState<'seedling' | 'vegetative' | 'flowering' | 'ripening'>('vegetative')
  const [diseaseTemp, setDiseaseTemp] = useState(20)
  const [diseaseHumidity, setDiseaseHumidity] = useState(70)
  const [diseaseRainfall, setDiseaseRainfall] = useState(60)
  const [diseaseResult, setDiseaseResult] = useState<DiseasePredictResponse | null>(null)
  const [diseaseLoading, setDiseaseLoading] = useState(false)
  const [diseaseError, setDiseaseError] = useState<string | null>(null)
  const [diseaseForecastDays, setDiseaseForecastDays] = useState<WeatherDay[]>([])
  const [diseaseDayIdx, setDiseaseDayIdx] = useState(0)
  const [diseaseWeatherLoading, setDiseaseWeatherLoading] = useState(false)
  const [diseaseWeatherSource, setDiseaseWeatherSource] = useState<string | null>(null)
  const [diseaseNdvi, setDiseaseNdvi] = useState<number | null>(null)
  const [diseaseRecData, setDiseaseRecData] = useState<DiseaseProductRecommendationDto | null>(null)
  const [diseaseRecLoading, setDiseaseRecLoading] = useState(false)

  // ── Phenology tab state ─────────────────────────────────────────────────────
  const [phenoHistoryId, setPhenoHistoryId] = useState<number | null>(null)
  const [phenoObservations, setPhenoObservations] = useState<PhenologicalObservation[]>([])
  const [phenoLoading, setPhenoLoading] = useState(false)
  const [showPhenoForm, setShowPhenoForm] = useState(false)
  const [editPhenoId, setEditPhenoId] = useState<number | null>(null)
  const [phenoForm, setPhenoForm] = useState<PhenologicalObservationRequest>({
    cropHistoryId: 0, observationDate: todayStr(), bbchScale: 0,
    bbchDescription: '', observationMethod: ObservationMethod.VISUAL, notes: '', weatherConditions: '',
  })
  const [savingPheno, setSavingPheno] = useState(false)
  const [phenoError, setPhenoError] = useState<string | null>(null)

  const loadNdvi = useCallback(async (coords: number[][]) => {
    if (!fieldId) return
    setLoadingNdvi(true); setNdviError(null)
    try {
      const res = await ndviService.getNdviHistory(fieldId, monthsAgoStr(12), todayStr())
      setNdviHistory(res.history)
      setCurrentNdvi(res.current ?? (res.history.length ? res.history[res.history.length - 1] : null))

      // Автозагрузка NDVI-карты на последнюю доступную дату
      const datesRes = await ndviService.fetchAvailableDates(fieldId, monthsAgoStr(6), todayStr(), coords)
      let autoDate: string | null = null
      if (datesRes.dates?.length) {
        setAvailableDates(datesRes.dates)
        autoDate = datesRes.dates[datesRes.dates.length - 1]
        setSelectedDate(autoDate)
      } else if (res.history.length > 0) {
        autoDate = res.history[res.history.length - 1].date
        setSelectedDate(autoDate)
      }
      if (autoDate) {
        setLoadingImage(true)
        try {
          const imgRes = await ndviService.fetchNdviImage(fieldId, autoDate, coords)
          if (imgRes.imageUrl) setNdviImage(imgRes)
        } catch { /* тихо */ }
        finally { setLoadingImage(false) }
      }
    } catch {
      setNdviError('Нет данных NDVI')
    } finally { setLoadingNdvi(false) }
  }, [fieldId])

  const loadImageForDate = async (date: string) => {
    if (!field) return
    setLoadingImage(true); setNdviImage(null)
    try {
      const res = await ndviService.fetchNdviImage(fieldId, date, field.coordinates)
      setNdviImage(res)
    } catch { /* тихо */ }
    finally { setLoadingImage(false) }
  }

  useEffect(() => {
    if (!fieldId) return
    fieldService.getFieldById(fieldId)
      .then(f => { setField(f); setLoadingField(false); loadNdvi(f.coordinates) })
      .catch(() => setLoadingField(false))
  }, [fieldId])

  useEffect(() => {
    cropTypeService.getAll().then(setCropTypes).catch(() => {})
  }, [])

  useEffect(() => {
    if (!fieldId) return
    setLoadingSoil(true)
    soilService.get(fieldId)
      .then(d => { setSoilData(d); setLoadingSoil(false) })
      .catch(() => { setSoilData(null); setLoadingSoil(false) })
  }, [fieldId])

  const handleFetchSoilGrids = async () => {
    setFetchingSoil(true); setSoilError(null)
    try {
      const d = await soilService.fetchFromSoilGrids(fieldId)
      setSoilData(d)
    } catch {
      setSoilError('Не удалось загрузить данные из SoilGrids')
    } finally { setFetchingSoil(false) }
  }

  const handleSaveSoil = async () => {
    setSavingSoil(true); setSoilError(null)
    try {
      const d = soilData?.id
        ? await soilService.update(fieldId, soilForm)
        : await soilService.create(fieldId, soilForm)
      setSoilData(d); setShowSoilEdit(false)
    } catch {
      setSoilError('Ошибка сохранения данных почвы')
    } finally { setSavingSoil(false) }
  }

  const reloadCropHistories = () => {
    cropHistoryService.getAll().then(all => {
      setCropHistories(all.filter(h => h.fieldId === fieldId).sort(
        (a, b) => new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime()
      ))
    }).catch(() => {})
  }

  useEffect(() => {
    if (!fieldId) return
    cropHistoryService.getAll().then(all => {
      setCropHistories(all.filter(h => h.fieldId === fieldId).sort(
        (a, b) => new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime()
      ))
      setLoadingHistory(false)
    }).catch(() => setLoadingHistory(false))
  }, [fieldId])

  const handleSaveHistory = async () => {
    if (!addForm.cropTypeId || !addForm.plantingDate) {
      setHistoryError('Выберите культуру и дату посева')
      return
    }
    setSavingHistory(true); setHistoryError(null)
    try {
      await cropHistoryService.create({
        fieldId,
        cropTypeId: addForm.cropTypeId!,
        plantingDate: addForm.plantingDate!,
        actualHarvestDate: addForm.actualHarvestDate || undefined,
        expectedHarvestDate: addForm.expectedHarvestDate || undefined,
        actualYieldKg: addForm.actualYieldKg || undefined,
        expectedYieldKg: addForm.expectedYieldKg || undefined,
        plantingStatus: addForm.plantingStatus ?? PlantingStatus.HARVESTED,
        seedAmountKgPerHa: addForm.seedAmountKgPerHa ?? 0,
        notes: addForm.notes || undefined,
      })
      setShowAddForm(false)
      setAddForm({})
      reloadCropHistories()
    } catch {
      setHistoryError('Ошибка сохранения')
    } finally {
      setSavingHistory(false)
    }
  }

  // ── Auto-select first crop history for operations/phenology ────────────────
  useEffect(() => {
    if (cropHistories.length > 0 && !selectedCropHistoryId) {
      const current = cropHistories.find(h =>
        h.plantingStatus === PlantingStatus.GROWING || h.plantingStatus === PlantingStatus.PLANTED
      ) ?? cropHistories[0]
      setSelectedCropHistoryId(current.id)
      setPhenoHistoryId(current.id)
    }
  }, [cropHistories])

  // ── Load operations when crop history selected ───────────────────────────
  useEffect(() => {
    if (!selectedCropHistoryId) return
    setFertLoading(true)
    fertilizerApplicationService.getByCropHistory(selectedCropHistoryId)
      .then(setFertItems).catch(() => {}).finally(() => setFertLoading(false))
    setProtLoading(true)
    plantProtectionService.getByCropHistory(selectedCropHistoryId)
      .then(setProtItems).catch(() => {}).finally(() => setProtLoading(false))
  }, [selectedCropHistoryId])

  // ── Load phenology observations ──────────────────────────────────────────
  useEffect(() => {
    if (!phenoHistoryId) return
    setPhenoLoading(true)
    phenologyService.getByCropHistory(phenoHistoryId)
      .then(setPhenoObservations).catch(() => {}).finally(() => setPhenoLoading(false))
  }, [phenoHistoryId])

  // ── Disease ML: load weather + NDVI when field loaded ────────────────────
  useEffect(() => {
    if (!field) return
    const [lat, lon] = [
      field.coordinates.reduce((s, c) => s + c[1], 0) / field.coordinates.length,
      field.coordinates.reduce((s, c) => s + c[0], 0) / field.coordinates.length,
    ]
    setDiseaseWeatherLoading(true)
    weatherService.getForecast(lat, lon, 7).then(r => {
      setDiseaseForecastDays(r.days)
      setDiseaseDayIdx(0)
      const day = r.days[0]
      if (day) {
        if (day.tempMean != null) setDiseaseTemp(Math.round(day.tempMean * 10) / 10)
        if (day.humidity != null) setDiseaseHumidity(Math.round(day.humidity))
        const weekRain = r.days.reduce((s, d) => s + (d.precipitation ?? 0), 0)
        if (weekRain > 0) setDiseaseRainfall(Math.round(weekRain * 10) / 10)
      }
      setDiseaseWeatherSource(field.fieldName)
    }).catch(() => {}).finally(() => setDiseaseWeatherLoading(false))

    ndviService.getCurrentNdvi(fieldId).then(r => setDiseaseNdvi(r.mean)).catch(() => {})
  }, [field?.id])

  useEffect(() => {
    if (!diseaseResult) return
    setDiseaseRecLoading(true)
    diseaseProductService.getByDiseaseName(diseaseResult.disease)
      .then(setDiseaseRecData).catch(() => setDiseaseRecData(null))
      .finally(() => setDiseaseRecLoading(false))
  }, [diseaseResult?.disease])

  // ── Operations handlers ──────────────────────────────────────────────────
  const reloadFert = () => {
    if (!selectedCropHistoryId) return
    setFertLoading(true)
    fertilizerApplicationService.getByCropHistory(selectedCropHistoryId)
      .then(setFertItems).catch(() => {}).finally(() => setFertLoading(false))
  }
  const reloadProt = () => {
    if (!selectedCropHistoryId) return
    setProtLoading(true)
    plantProtectionService.getByCropHistory(selectedCropHistoryId)
      .then(setProtItems).catch(() => {}).finally(() => setProtLoading(false))
  }
  const handleSaveFert = async () => {
    if (!fertForm.fertilizerType) { setFertError('Укажите тип удобрения'); return }
    setSavingFert(true); setFertError(null)
    try {
      const data = { ...fertForm, cropHistoryId: selectedCropHistoryId ?? 0 }
      editFertId ? await fertilizerApplicationService.update(editFertId, data) : await fertilizerApplicationService.create(data)
      setShowFertForm(false); reloadFert()
    } catch (e: any) { setFertError(e?.response?.data?.message ?? 'Ошибка') }
    finally { setSavingFert(false) }
  }
  const handleSaveProt = async () => {
    if (!protForm.productName) { setProtError('Укажите препарат'); return }
    setSavingProt(true); setProtError(null)
    try {
      const data = { ...protForm, cropHistoryId: selectedCropHistoryId ?? 0 }
      editProtId ? await plantProtectionService.update(editProtId, data) : await plantProtectionService.create(data)
      setShowProtForm(false); reloadProt()
    } catch (e: any) { setProtError(e?.response?.data?.message ?? 'Ошибка') }
    finally { setSavingProt(false) }
  }

  // ── Disease ML handlers ──────────────────────────────────────────────────
  const handleDiseasePredict = async () => {
    setDiseaseLoading(true); setDiseaseError(null); setDiseaseResult(null)
    try {
      const data = await diseaseMLService.predict({
        crop: diseaseCrop, temperature: diseaseTemp, humidity: diseaseHumidity,
        rainfall: diseaseRainfall, growth_stage: diseaseStage,
      })
      setDiseaseResult(data)
    } catch (e: any) { setDiseaseError(e?.response?.data?.detail || 'Ошибка прогноза') }
    finally { setDiseaseLoading(false) }
  }
  const applyDiseaseDay = (days: WeatherDay[], idx: number) => {
    const day = days[idx]; if (!day) return
    if (day.tempMean != null) setDiseaseTemp(Math.round(day.tempMean * 10) / 10)
    if (day.humidity != null) setDiseaseHumidity(Math.round(day.humidity))
    const weekRain = days.reduce((s, d) => s + (d.precipitation ?? 0), 0)
    if (weekRain > 0) setDiseaseRainfall(Math.round(weekRain * 10) / 10)
  }
  const handleScheduleFromDisease = (p: DiseaseProductItemDto, rec: DiseaseProductRecommendationDto) => {
    if (!diseaseResult) return
    const cropLabel = DISEASE_CROPS.find(c => c.value === diseaseCrop)?.label ?? diseaseCrop
    const stageLabel = DISEASE_STAGES.find(s => s.value === diseaseStage)?.label ?? diseaseStage
    const params = new URLSearchParams({
      tab: 'protection',
      productName: p.name, operationType: rec.opType, targetPest: diseaseResult.disease,
      doseLPerHa: String(p.doseValue), activeIngredient: p.activeIngredient,
      mechanismOfAction: p.mechanism, phiDays: String(p.phiDays),
      notes: `ML-прогноз: ${diseaseResult.disease}. Риск: ${diseaseResult.risk_level}. ${cropLabel}. ${stageLabel}.`,
    })
    navigate(`/operations?${params.toString()}`)
  }

  // ── Phenology handlers ───────────────────────────────────────────────────
  const reloadPheno = () => {
    if (!phenoHistoryId) return
    setPhenoLoading(true)
    phenologyService.getByCropHistory(phenoHistoryId)
      .then(setPhenoObservations).catch(() => {}).finally(() => setPhenoLoading(false))
  }
  const handleSavePheno = async () => {
    setSavingPheno(true); setPhenoError(null)
    try {
      const data = { ...phenoForm, cropHistoryId: phenoHistoryId ?? 0 }
      if (editPhenoId) await phenologyService.update(editPhenoId, data)
      else await phenologyService.create(data)
      setShowPhenoForm(false); reloadPheno()
    } catch (e: any) { setPhenoError(e?.response?.data?.message ?? 'Ошибка') }
    finally { setSavingPheno(false) }
  }
  const handleDeletePheno = async (id: number) => {
    if (!confirm('Удалить наблюдение?')) return
    await phenologyService.delete(id); reloadPheno()
  }

  const lat = field ? field.coordinates.reduce((s, c) => s + c[1], 0) / field.coordinates.length : 0
  const lon = field ? field.coordinates.reduce((s, c) => s + c[0], 0) / field.coordinates.length : 0

  if (loadingField) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <div className="spinner" style={{ marginBottom: 12 }} />
        Загрузка...
      </div>
    )
  }

  if (!field) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🌾</div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Поле не найдено</div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/fields')}>
          ← К списку полей
        </button>
      </div>
    )
  }

  const maxNdvi = ndviHistory.length ? Math.max(...ndviHistory.map(r => r.mean)) : null
  const minNdvi = ndviHistory.length ? Math.min(...ndviHistory.map(r => r.mean)) : null
  const diseaseRisk = diseaseResult ? RISK_CONFIG[diseaseResult.risk_level] : null
  const diseaseCropLabel = DISEASE_CROPS.find(c => c.value === diseaseCrop)?.label ?? diseaseCrop
  const diseaseStageLabel = DISEASE_STAGES.find(s => s.value === diseaseStage)?.label ?? diseaseStage

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Шапка ── */}
      <div className="page-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-icon" onClick={() => navigate(-1)} data-tooltip="Назад">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>🌾 {field.fieldName}</h1>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', gap: 16 }}>
              <span><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{field.areaHectares} га</span>
              {field.crop_type && <span><Wheat size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{field.crop_type}</span>}
              {field.status && <span>Статус: {field.status}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/recommendations?fieldId=${field.id}`)}
          >
            <TrendingUp size={14} /> Советник
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/map')}
          >
            <ExternalLink size={14} /> На карте
          </button>
        </div>
      </div>

      {/* ── Таб-бар ── */}
      <div className="tabs-bar" style={{ marginBottom: 0 }}>
        {(['overview', 'operations', 'diseases', 'phenology'] as FieldTab[]).map(tab => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            onClick={() => setTab(tab)}
          >
            {tab === 'overview'   && <Satellite size={14} />}
            {tab === 'operations' && <Beaker size={14} />}
            {tab === 'diseases'   && <Bug size={14} />}
            {tab === 'phenology'  && <Leaf size={14} />}
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ── TAB: ОБЗОР ──
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && <>

      {/* ── Верхняя строка: инфо + текущий NDVI ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="card card-padding">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Информация о поле</div>
            {!editingField && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={() => {
                  setEditForm({ fieldName: field.fieldName, crop_type: field.crop_type || '', status: field.status || '' })
                  setFieldError(null)
                  setEditingField(true)
                }}
              >
                <Pencil size={11} /> Изменить
              </button>
            )}
          </div>

          {editingField ? (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Название *</div>
                  <input
                    className="form-control"
                    value={editForm.fieldName}
                    onChange={e => setEditForm(f => ({ ...f, fieldName: e.target.value }))}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Культура</div>
                  <select
                    className="form-control"
                    value={editForm.crop_type}
                    onChange={e => setEditForm(f => ({ ...f, crop_type: e.target.value }))}
                  >
                    <option value="">— Не указана —</option>
                    <option>Пшеница яровая</option>
                    <option>Пшеница озимая</option>
                    <option>Ячмень яровой</option>
                    <option>Кукуруза</option>
                    <option>Подсолнечник</option>
                    <option>Соя</option>
                    <option>Рапс</option>
                    <option>Горох</option>
                    <option>Гречиха</option>
                    <option>Лён масличный</option>
                    <option>Рожь</option>
                    <option>Овёс</option>
                    <option>Просо</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Статус</div>
                  <select
                    className="form-control"
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">Активное</option>
                    <option value="PENDING">Планируется</option>
                    <option value="INACTIVE">Неактивное</option>
                    <option value="FALLOW">Под паром</option>
                  </select>
                </div>
              </div>
              {fieldError && <div style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 8 }}>{fieldError}</div>}
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSaveField} disabled={savingField}>
                  <Save size={11} /> {savingField ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingField(false); setFieldError(null) }}>
                  <X size={11} /> Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <InfoRow label="Название" value={field.fieldName} />
              <InfoRow label="Культура" value={field.crop_type || '—'} />
              <InfoRow label="Статус" value={getFieldStatusLabel(field.status)} />
              <InfoRow label="Площадь" value={`${field.areaHectares} га`} />
              <InfoRow label="Точек контура" value={String(field.coordinates.length)} />
              {field.regionName && <InfoRow label="Регион" value={field.regionName} />}
            </>
          )}
        </div>

        <div className="card card-padding">
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Текущий NDVI</div>
          {loadingNdvi ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 13 }}>
              <div className="spinner" /> Загрузка...
            </div>
          ) : ndviError || !currentNdvi ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{ndviError ?? 'Нет данных'}</div>
          ) : (
            <>
              <div style={{ fontSize: 40, fontWeight: 800, color: getNdviColor(currentNdvi.mean), lineHeight: 1, marginBottom: 6 }}>
                {currentNdvi.mean.toFixed(3)}
              </div>
              <div style={{ marginBottom: 8 }}>{getNdviBadge(currentNdvi.mean)}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                {getNdviLabel(currentNdvi.mean)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {fmtDate(currentNdvi.date)} · {currentNdvi.source === 'GEE_SENTINEL2' ? '🛰️ Sentinel-2' : '📡 AgroMonitoring'}
              </div>
            </>
          )}
        </div>

        <div className="card card-padding">
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>NDVI за 12 месяцев</div>
          {loadingNdvi ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 13 }}>
              <div className="spinner" /> Загрузка...
            </div>
          ) : ndviHistory.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Нет истории</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 24, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Макс</div>
                  <div style={{ fontWeight: 700, color: maxNdvi != null ? getNdviColor(maxNdvi) : undefined }}>
                    {maxNdvi?.toFixed(3) ?? '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Мин</div>
                  <div style={{ fontWeight: 700, color: minNdvi != null ? getNdviColor(minNdvi) : undefined }}>
                    {minNdvi?.toFixed(3) ?? '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Замеров</div>
                  <div style={{ fontWeight: 700 }}>{ndviHistory.length}</div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '4px 8px' }}
                onClick={() => field && loadNdvi(field.coordinates)}
              >
                <RefreshCw size={11} /> Обновить
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── NDVI График + Карта ── */}
      <div className={ndviHistory.length > 0 ? 'grid-2' : ''} style={{ gap: 16 }}>
        {ndviHistory.length > 0 && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: 14 }}>
              📈 История NDVI — последние 12 месяцев
            </div>
            <div style={{ padding: '16px 16px 4px', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                {/* @ts-ignore — recharts onClick */}
                <AreaChart
                    data={ndviHistory}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                    style={{ cursor: 'pointer' }}
                    onClick={(d: any) => {
                      console.log('[NDVI chart click]', d)
                      let rec: NdviRecord | null = null
                      if (d?.activePayload?.[0]?.payload) {
                        rec = d.activePayload[0].payload as NdviRecord
                      } else if (d?.activeTooltipIndex != null && ndviHistory[d.activeTooltipIndex]) {
                        rec = ndviHistory[d.activeTooltipIndex]
                      }
                      console.log('[NDVI chart click] rec:', rec)
                      if (rec) {
                        setSelectedNdviRecord(rec)
                        setSelectedDate(rec.date)
                        loadImageForDate(rec.date)
                      }
                    }}
                  >
                  <defs>
                    <linearGradient id="ndviGradDetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2d7a45" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2d7a45" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} width={36} />
                  <Tooltip content={<NdviChartTooltip />} />
                  <ReferenceLine y={0.5} stroke="#f39c12" strokeDasharray="4 4" label={{ value: '0.5', position: 'right', fontSize: 10 }} />
                  <ReferenceLine y={0.3} stroke="#e74c3c" strokeDasharray="4 4" label={{ value: '0.3', position: 'right', fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="mean"
                    stroke="#2d7a45"
                    strokeWidth={2}
                    fill="url(#ndviGradDetail)"
                    dot={{ fill: '#2d7a45', r: 3 }}
                    activeDot={{ r: 6, fill: '#2d7a45', stroke: 'white', strokeWidth: 2, cursor: 'pointer' }}
                  />
                  {selectedNdviRecord && (
                    <ReferenceDot
                      x={selectedNdviRecord.date}
                      y={selectedNdviRecord.mean}
                      r={6}
                      fill={getNdviColor(selectedNdviRecord.mean)}
                      stroke="white"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', padding: '4px 0 10px' }}>
              Кликните по точке графика — карта NDVI обновится автоматически
            </div>
          </div>
        )}

        {/* Карта NDVI */}
        <div className="card" style={{ overflow: 'hidden', height: 300 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              🗺️ Карта NDVI
              {selectedNdviRecord && (
                <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                  — {new Date(selectedNdviRecord.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {availableDates.length > 0 ? (
                <select
                  className="form-control"
                  style={{ width: 'auto', fontSize: 12, padding: '2px 6px' }}
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); setNdviImage(null) }}
                >
                  {availableDates.slice().reverse().map(d => (
                    <option key={d} value={d}>
                      {new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 130, fontSize: 12 }}
                  value={selectedDate}
                  max={todayStr()}
                  onChange={e => { setSelectedDate(e.target.value); setNdviImage(null) }}
                />
              )}
              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => loadImageForDate(selectedDate)}
                disabled={loadingImage}
              >
                <Satellite size={12} /> {loadingImage ? '...' : 'Загрузить'}
              </button>
            </div>
          </div>
          <div style={{ height: 'calc(100% - 46px)', position: 'relative' }}>
            {field && (
              <MapContainer
                center={[field.coordinates[0][1], field.coordinates[0][0]]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" maxZoom={20} />
                <FitBoundsField field={field} />
                <LeafletPolygon
                  positions={
                    field.holes && field.holes.length > 0
                      ? [
                          field.coordinates.map(c => [c[1], c[0]] as [number, number]),
                          ...field.holes.map(h => h.map(c => [c[1], c[0]] as [number, number])),
                        ]
                      : field.coordinates.map(c => [c[1], c[0]] as [number, number])
                  }
                  pathOptions={{ color: '#ffffff', weight: 2, fill: false, dashArray: '5 5' }}
                />
                {ndviImage?.imageUrl && ndviImage.bbox && (
                  <NdviImageLayer imageUrl={ndviImage.imageUrl} bbox={ndviImage.bbox} />
                )}
              </MapContainer>
            )}
            <LoadingOverlay visible={loadingImage} message="Загрузка NDVI..." />
            {!ndviImage?.imageUrl && !loadingImage && (
              <div style={{
                position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '5px 12px',
                fontSize: 11, color: 'var(--color-text-muted)', zIndex: 500, whiteSpace: 'nowrap',
              }}>
                {ndviImage?.error
                  ? `Нет снимка: ${ndviImage.error}`
                  : 'Кликните по точке графика или нажмите «Загрузить»'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Погода ── */}
      <WeatherWidget lat={lat} lon={lon} title={`🌤️ Погода — ${field.fieldName}`} />

      {/* ── Почвенные данные ── */}
      <div className="card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>🧪 Почвенные данные</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {soilData && (
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {soilData.source === 'AUTO' ? '🛰️ SoilGrids' : soilData.source === 'MANUAL' ? '✏️ Вручную' : '🔀 Смешанный'}
                {soilData.confidence != null && ` · ${soilData.confidence.toFixed(0)}%`}
              </span>
            )}
            <button
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11 }}
              onClick={handleFetchSoilGrids}
              disabled={fetchingSoil}
              data-tooltip="Автоматически загрузить показатели почвы по координатам поля из базы SoilGrids"
            >
              {fetchingSoil ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Download size={12} />}
              SoilGrids
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11 }}
              onClick={() => {
                setSoilForm({
                  nitrogenN: soilData?.nitrogenN ?? undefined,
                  phosphorusP: soilData?.phosphorusP ?? undefined,
                  potassiumK: soilData?.potassiumK ?? undefined,
                  phLevel: soilData?.phLevel ?? undefined,
                  organicMatter: soilData?.organicMatter ?? undefined,
                  cec: soilData?.cec ?? undefined,
                  bulkDensity: soilData?.bulkDensity ?? undefined,
                  notes: soilData?.notes ?? undefined,
                })
                setShowSoilEdit(v => !v)
                setSoilError(null)
              }}
            >
              <Pencil size={12} /> Редактировать
            </button>
          </div>
        </div>

        {soilError && (
          <div style={{ padding: '8px 16px', color: 'var(--color-danger)', fontSize: 12 }}>{soilError}</div>
        )}

        {/* Форма ручного редактирования */}
        {showSoilEdit && (
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-primary-light)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Редактировать показатели почвы</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
              {([
                { key: 'nitrogenN', label: 'Азот N, кг/га', step: 0.1 },
                { key: 'phosphorusP', label: 'Фосфор P, кг/га', step: 0.1 },
                { key: 'potassiumK', label: 'Калий K, кг/га', step: 0.1 },
                { key: 'phLevel', label: 'pH', step: 0.1, min: 0, max: 14 },
                { key: 'organicMatter', label: 'Орг. вещество %', step: 0.01 },
                { key: 'cec', label: 'ЕКО (CEC)', step: 0.1 },
                { key: 'bulkDensity', label: 'Плотность г/см³', step: 0.01 },
              ] as const).map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>{f.label}</div>
                  <input
                    type="number"
                    className="form-control"
                    step={(f as any).step}
                    min={(f as any).min}
                    max={(f as any).max}
                    value={(soilForm as any)[f.key] ?? ''}
                    onChange={e => setSoilForm(prev => ({ ...prev, [f.key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                  />
                </div>
              ))}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Примечание</div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Необязательно"
                  value={soilForm.notes ?? ''}
                  onChange={e => setSoilForm(prev => ({ ...prev, notes: e.target.value || undefined }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSaveSoil} disabled={savingSoil}>
                <Save size={12} /> {savingSoil ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowSoilEdit(false); setSoilError(null) }}>
                <X size={12} /> Отмена
              </button>
            </div>
          </div>
        )}

        {loadingSoil ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div className="spinner" style={{ marginBottom: 8 }} /> Загрузка...
          </div>
        ) : !soilData ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <FlaskConical size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontSize: 13, marginBottom: 8 }}>Нет данных почвы</div>
            <div style={{ fontSize: 12 }}>Нажмите «SoilGrids» для автозагрузки или «Редактировать» для ввода вручную</div>
          </div>
        ) : (
          <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {([
              { key: 'nitrogenN', label: 'Азот (N)', unit: 'кг/га', decimals: 1 },
              { key: 'phosphorusP', label: 'Фосфор (P)', unit: 'кг/га', decimals: 1 },
              { key: 'potassiumK', label: 'Калий (K)', unit: 'кг/га', decimals: 1 },
              { key: 'phLevel', label: 'pH почвы', unit: '', decimals: 1 },
              { key: 'organicMatter', label: 'Орг. вещество', unit: '%', decimals: 2 },
              { key: 'cec', label: 'ЕКО (CEC)', unit: 'мг-экв/100г', decimals: 1 },
              { key: 'bulkDensity', label: 'Плотность', unit: 'г/см³', decimals: 2 },
              { key: 'soilTexture', label: 'Текстура', unit: '', decimals: 0, isString: true },
            ] as const).map(f => {
              const val = (soilData as any)[f.key]
              return (
                <div key={f.key} style={{ background: 'var(--color-bg-subtle)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{f.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: val != null ? 'var(--color-text)' : 'var(--color-text-placeholder)' }}>
                    {val != null
                      ? ((f as any).isString ? (f.key === 'soilTexture' ? getSoilTextureLabel(val) : val) : `${typeof val === 'number' ? val.toFixed(f.decimals) : val}${f.unit ? ' ' + f.unit : ''}`)
                      : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {soilData?.lastSyncedAt && (
          <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
            Последнее обновление: {new Date(soilData.lastSyncedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* ── История посевов ── */}
      <div className="card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>🌱 История посевов</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ fontSize: 11 }}
              onClick={() => { setShowAddForm(v => !v); setHistoryError(null); setAddForm({ plantingStatus: PlantingStatus.HARVESTED }) }}
            >
              <Plus size={12} /> Добавить посев
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11 }}
              onClick={() => navigate('/crop-history')}
            >
              <ExternalLink size={12} /> Все посевы
            </button>
          </div>
        </div>

        {/* Inline-форма добавления */}
        {showAddForm && (
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-primary-light)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Новая запись посева</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Культура *</div>
                <select
                  className="form-control"
                  value={addForm.cropTypeId ?? ''}
                  onChange={e => setAddForm(f => ({ ...f, cropTypeId: Number(e.target.value) }))}
                >
                  <option value="">— Выберите —</option>
                  {cropTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Дата посева *</div>
                <input
                  type="date" className="form-control"
                  value={addForm.plantingDate ?? ''}
                  max={todayStr()}
                  onChange={e => setAddForm(f => ({ ...f, plantingDate: e.target.value }))}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Дата уборки</div>
                <input
                  type="date" className="form-control"
                  value={addForm.actualHarvestDate ?? ''}
                  max={todayStr()}
                  onChange={e => setAddForm(f => ({ ...f, actualHarvestDate: e.target.value }))}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Статус</div>
                <select
                  className="form-control"
                  value={addForm.plantingStatus ?? PlantingStatus.HARVESTED}
                  onChange={e => setAddForm(f => ({ ...f, plantingStatus: e.target.value as PlantingStatus }))}
                >
                  <option value={PlantingStatus.HARVESTED}>Собрано</option>
                  <option value={PlantingStatus.GROWING}>Растёт</option>
                  <option value={PlantingStatus.PLANTED}>Посажено</option>
                  <option value={PlantingStatus.PLANNED}>Запланировано</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Урожай, кг (факт)</div>
                <input
                  type="number" className="form-control" placeholder="0"
                  value={addForm.actualYieldKg ?? ''}
                  onChange={e => setAddForm(f => ({ ...f, actualYieldKg: Number(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Примечание</div>
                <input
                  type="text" className="form-control" placeholder="Необязательно"
                  value={addForm.notes ?? ''}
                  onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            {historyError && <div style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 8 }}>{historyError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSaveHistory} disabled={savingHistory}>
                <Save size={12} /> {savingHistory ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddForm(false); setHistoryError(null) }}>
                <X size={12} /> Отмена
              </button>
            </div>
          </div>
        )}

        {loadingHistory ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div className="spinner" style={{ marginBottom: 8 }} />
            Загрузка...
          </div>
        ) : cropHistories.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
            <div>История посевов отсутствует</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Культура</th>
                  <th>Сорт</th>
                  <th>Посев</th>
                  <th>Уборка</th>
                  <th>Статус</th>
                  <th>Урожай</th>
                  <th>NDVI на дату посева</th>
                </tr>
              </thead>
              <tbody>
                {cropHistories.map(h => {
                  const ndviOnDate = ndviHistory.find(r => r.date >= h.plantingDate && (!h.actualHarvestDate || r.date <= h.actualHarvestDate))
                  return (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 500 }}>{h.cropTypeName}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{h.cropVarietyName || '—'}</td>
                      <td>{fmtDate(h.plantingDate)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {h.actualHarvestDate ? fmtDate(h.actualHarvestDate) : (h.expectedHarvestDate ? `~${fmtDate(h.expectedHarvestDate)}` : '—')}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: `${STATUS_COLORS[h.plantingStatus]}20`,
                          color: STATUS_COLORS[h.plantingStatus],
                        }}>
                          {STATUS_LABELS[h.plantingStatus]}
                        </span>
                      </td>
                      <td>
                        {h.actualYieldKg != null
                          ? <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{h.actualYieldKg.toLocaleString()} кг</span>
                          : h.expectedYieldKg != null
                            ? <span style={{ color: 'var(--color-text-muted)' }}>~{h.expectedYieldKg.toLocaleString()} кг</span>
                            : <span style={{ color: 'var(--color-text-placeholder)' }}>—</span>
                        }
                      </td>
                      <td>
                        {ndviOnDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, color: getNdviColor(ndviOnDate.mean) }}>
                              {ndviOnDate.mean.toFixed(3)}
                            </span>
                            {getNdviBadge(ndviOnDate.mean)}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-placeholder)', fontSize: 12 }}>нет данных</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── конец TAB ОБЗОР ── */}
      </>}

      {/* ══════════════════════════════════════════════════════════════════════
          ── TAB: ОПЕРАЦИИ ──
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'operations' && <>
        {/* Выбор посева */}
        <div className="card card-padding" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Посев</div>
            <select className="form-control" value={selectedCropHistoryId ?? ''} onChange={e => setSelectedCropHistoryId(Number(e.target.value) || null)}>
              <option value="">— выберите посев —</option>
              {cropHistories.map(h => <option key={h.id} value={h.id}>{h.cropTypeName} ({h.plantingDate?.slice(0,10)})</option>)}
            </select>
          </div>
        </div>

        {/* Под-таб удобрения / защита */}
        <div className="tabs-bar">
          <button className={`tab-btn${opsTab === 'fertilizer' ? ' active' : ''}`} onClick={() => setOpsTab('fertilizer')}>
            <Beaker size={14} /> Удобрения
          </button>
          <button className={`tab-btn${opsTab === 'protection' ? ' active' : ''}`} onClick={() => setOpsTab('protection')}>
            <ShieldCheck size={14} /> Защита растений
          </button>
          <div style={{ marginLeft: 'auto' }}>
            {opsTab === 'fertilizer' && selectedCropHistoryId && (
              <button className="btn btn-primary btn-sm" onClick={() => { setEditFertId(null); setFertForm({ cropHistoryId: selectedCropHistoryId, applicationDate: todayStr(), fertilizerType: '' }); setFertError(null); setShowFertForm(v => !v) }}>
                <Plus size={14} /> Добавить
              </button>
            )}
            {opsTab === 'protection' && selectedCropHistoryId && (
              <button className="btn btn-primary btn-sm" onClick={() => { setEditProtId(null); setProtForm({ cropHistoryId: selectedCropHistoryId, operationDate: todayStr(), operationType: ProtectionOperationType.HERBICIDE, productName: '' }); setProtError(null); setShowProtForm(v => !v) }}>
                <Plus size={14} /> Добавить
              </button>
            )}
          </div>
        </div>

        {/* ── Удобрения ── */}
        {opsTab === 'fertilizer' && <>
          {showFertForm && (
            <div className="card card-padding">
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{editFertId ? 'Редактировать внесение' : 'Новое внесение удобрения'}</div>
              {fertError && <div style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 8 }}>{fertError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Дата*</div><input type="date" className="form-control" value={fertForm.applicationDate} onChange={e => setFertForm(f => ({ ...f, applicationDate: e.target.value }))} /></div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Тип удобрения*</div><input className="form-control" placeholder="Карбамид, Аммофос…" value={fertForm.fertilizerType} onChange={e => setFertForm(f => ({ ...f, fertilizerType: e.target.value }))} /></div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Формула (NPK)</div><input className="form-control" placeholder="46-0-0…" value={fertForm.formulation ?? ''} onChange={e => setFertForm(f => ({ ...f, formulation: e.target.value || undefined }))} /></div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Метод</div>
                  <select className="form-control" value={fertForm.applicationMethod ?? ''} onChange={e => setFertForm(f => ({ ...f, applicationMethod: (e.target.value as ApplicationMethod) || undefined }))}>
                    <option value="">— не указан —</option>
                    {Object.values(ApplicationMethod).map(m => <option key={m} value={m}>{METHOD_LABELS_FERT[m]}</option>)}
                  </select>
                </div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Доза (кг/га)</div><input type="number" step="0.1" className="form-control" value={fertForm.doseKgPerHa ?? ''} onChange={e => setFertForm(f => ({ ...f, doseKgPerHa: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Площадь (га)</div><input type="number" step="0.1" className="form-control" value={fertForm.totalAreaHa ?? ''} onChange={e => setFertForm(f => ({ ...f, totalAreaHa: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Фаза BBCH</div><input type="number" min={0} max={99} className="form-control" value={fertForm.bbchPhase ?? ''} onChange={e => setFertForm(f => ({ ...f, bbchPhase: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Примечание</div><input className="form-control" value={fertForm.notes ?? ''} onChange={e => setFertForm(f => ({ ...f, notes: e.target.value || undefined }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSaveFert} disabled={savingFert}><Save size={12} /> {savingFert ? 'Сохранение…' : 'Сохранить'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowFertForm(false)}><X size={12} /> Отмена</button>
              </div>
            </div>
          )}
          {fertLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={28} className="spin" /></div>
          ) : !selectedCropHistoryId ? (
            <div className="card card-padding" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}><Beaker size={36} style={{ opacity: 0.3, marginBottom: 8 }} /><div>Выберите посев</div></div>
          ) : fertItems.length === 0 ? (
            <div className="card card-padding" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Нет записей о внесении удобрений</div>
          ) : (
            <div className="table-wrapper"><table className="data-table">
              <thead><tr><th>Дата</th><th>Удобрение</th><th>NPK</th><th>Доза кг/га</th><th>Метод</th><th>BBCH</th><th></th></tr></thead>
              <tbody>{fertItems.map(item => (
                <tr key={item.id}>
                  <td>{item.applicationDate}</td>
                  <td style={{ fontWeight: 500 }}>{item.fertilizerType}</td>
                  <td>{item.formulation ?? '—'}</td>
                  <td>{item.doseKgPerHa ?? '—'}</td>
                  <td>{item.applicationMethod ? METHOD_LABELS_FERT[item.applicationMethod] : '—'}</td>
                  <td>{item.bbchPhase ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setFertForm({ cropHistoryId: item.cropHistoryId, applicationDate: item.applicationDate, fertilizerType: item.fertilizerType, formulation: item.formulation, doseKgPerHa: item.doseKgPerHa, totalAreaHa: item.totalAreaHa, totalAmountKg: item.totalAmountKg, applicationMethod: item.applicationMethod, bbchPhase: item.bbchPhase, costPerHa: item.costPerHa, totalCost: item.totalCost, weatherTempC: item.weatherTempC, weatherHumidity: item.weatherHumidity, windSpeed: item.windSpeed, notes: item.notes }); setEditFertId(item.id); setFertError(null); setShowFertForm(true) }}><Pencil size={14} /></button>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={async () => { if (!confirm('Удалить?')) return; await fertilizerApplicationService.delete(item.id); reloadFert() }}><X size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </>}

        {/* ── Защита растений ── */}
        {opsTab === 'protection' && <>
          {showProtForm && (
            <div className="card card-padding">
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{editProtId ? 'Редактировать обработку' : 'Новая обработка'}</div>
              {protError && <div style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 8 }}>{protError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Дата*</div><input type="date" className="form-control" value={protForm.operationDate} onChange={e => setProtForm(f => ({ ...f, operationDate: e.target.value }))} /></div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Тип*</div>
                  <select className="form-control" value={protForm.operationType} onChange={e => setProtForm(f => ({ ...f, operationType: e.target.value as ProtectionOperationType }))}>
                    {Object.values(ProtectionOperationType).map(t => <option key={t} value={t}>{PROT_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Препарат*</div><input className="form-control" placeholder="Гранстар, Амистар…" value={protForm.productName} onChange={e => setProtForm(f => ({ ...f, productName: e.target.value }))} /></div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Действующее вещество</div><input className="form-control" value={protForm.activeIngredient ?? ''} onChange={e => setProtForm(f => ({ ...f, activeIngredient: e.target.value || undefined }))} /></div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Объект обработки</div><input className="form-control" placeholder="Бурая ржавчина…" value={protForm.targetPest ?? ''} onChange={e => setProtForm(f => ({ ...f, targetPest: e.target.value || undefined }))} /></div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Зараж.</div>
                  <select className="form-control" value={protForm.infestationLevel ?? ''} onChange={e => setProtForm(f => ({ ...f, infestationLevel: (e.target.value as InfestationLevel) || undefined }))}>
                    <option value="">—</option>
                    {Object.values(InfestationLevel).map(l => <option key={l} value={l}>{INFESTATION_LABELS[l]}</option>)}
                  </select>
                </div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Норма л/га</div><input type="number" step="0.01" className="form-control" value={protForm.doseLPerHa ?? ''} onChange={e => setProtForm(f => ({ ...f, doseLPerHa: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Фаза BBCH</div><input type="number" min={0} max={99} className="form-control" value={protForm.bbchPhase ?? ''} onChange={e => setProtForm(f => ({ ...f, bbchPhase: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>ОЖЗ (дней)</div><input type="number" className="form-control" value={protForm.phiDays ?? ''} onChange={e => setProtForm(f => ({ ...f, phiDays: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Примечание</div><input className="form-control" value={protForm.notes ?? ''} onChange={e => setProtForm(f => ({ ...f, notes: e.target.value || undefined }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSaveProt} disabled={savingProt}><Save size={12} /> {savingProt ? 'Сохранение…' : 'Сохранить'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowProtForm(false)}><X size={12} /> Отмена</button>
              </div>
            </div>
          )}
          {protLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={28} className="spin" /></div>
          ) : !selectedCropHistoryId ? (
            <div className="card card-padding" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}><ShieldCheck size={36} style={{ opacity: 0.3, marginBottom: 8 }} /><div>Выберите посев</div></div>
          ) : protItems.length === 0 ? (
            <div className="card card-padding" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Нет записей об обработках</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {protItems.map(item => (
                <div key={item.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ background: PROT_TYPE_COLORS[item.operationType], color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        {PROT_TYPE_LABELS[item.operationType]}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.productName}
                          {item.activeIngredient && <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 6 }}>({item.activeIngredient})</span>}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                          {item.operationDate}
                          {item.targetPest && <span style={{ marginLeft: 8 }}>· {item.targetPest}</span>}
                          {item.bbchPhase != null && <span style={{ marginLeft: 8 }}>· BBCH {item.bbchPhase}</span>}
                          {item.doseLPerHa != null && <span style={{ marginLeft: 8 }}>· {item.doseLPerHa} л/га</span>}
                        </div>
                        {item.phiDays != null && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 2 }}>ОЖЗ: {item.phiDays} дн.</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setProtForm({ cropHistoryId: item.cropHistoryId, operationDate: item.operationDate, operationType: item.operationType, productName: item.productName, activeIngredient: item.activeIngredient, mechanismOfAction: item.mechanismOfAction, doseLPerHa: item.doseLPerHa, targetPest: item.targetPest, infestationLevel: item.infestationLevel, bbchPhase: item.bbchPhase, phiDays: item.phiDays, notes: item.notes }); setEditProtId(item.id); setProtError(null); setShowProtForm(true) }}><Pencil size={14} /></button>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={async () => { if (!confirm('Удалить?')) return; await plantProtectionService.delete(item.id); reloadProt() }}><X size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}
      </>}

      {/* ══════════════════════════════════════════════════════════════════════
          ── TAB: БОЛЕЗНИ (ML) ──
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'diseases' && <>
        <div className="card card-padding">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Культура</div>
              <select className="form-control" value={diseaseCrop} onChange={e => setDiseaseCrop(e.target.value)}>
                {DISEASE_CROPS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Фаза роста</div>
              <select className="form-control" value={diseaseStage} onChange={e => setDiseaseStage(e.target.value as any)}>
                {DISEASE_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Температура, °C</div>
              <input type="number" className="form-control" value={diseaseTemp} min={-10} max={45} step={0.5} onChange={e => setDiseaseTemp(Number(e.target.value))} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Влажность, %</div>
              <input type="number" className="form-control" value={diseaseHumidity} min={0} max={100} step={1} onChange={e => setDiseaseHumidity(Number(e.target.value))} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Осадки за 7 дней, мм</div>
              <input type="number" className="form-control" value={diseaseRainfall} min={0} max={300} step={5} onChange={e => setDiseaseRainfall(Number(e.target.value))} />
            </div>
          </div>

          {diseaseForecastDays.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={12} /> Прогноз на 7 дней — выберите дату
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {diseaseForecastDays.map((day, i) => {
                  const isSelected = i === diseaseDayIdx
                  const d = new Date(day.date)
                  const label = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : d.toLocaleDateString('ru-RU', { weekday: 'short' })
                  return (
                    <button key={day.date} onClick={() => { setDiseaseDayIdx(i); applyDiseaseDay(diseaseForecastDays, i); setDiseaseResult(null) }}
                      style={{ flexShrink: 0, cursor: 'pointer', padding: '7px 10px', borderRadius: 10, textAlign: 'center', minWidth: 68, outline: 'none', transition: 'all 0.15s', background: isSelected ? 'var(--color-primary)' : 'var(--color-bg)', color: isSelected ? '#fff' : 'var(--color-text)', border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`, boxShadow: isSelected ? '0 2px 8px rgba(45,122,69,0.25)' : 'none' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
                      <div style={{ fontSize: 18 }}>{weatherIcon(day)}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>{day.tempMean?.toFixed(0) ?? '—'}°</div>
                      <div style={{ fontSize: 9, opacity: 0.75, marginTop: 1 }}>{(day.precipitation ?? 0).toFixed(0)}мм</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleDiseasePredict} disabled={diseaseLoading}>
              {diseaseLoading ? <Loader2 size={16} className="spin" /> : <Bug size={16} />} Прогнозировать
            </button>
            {diseaseWeatherLoading && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Загрузка погоды…</span>}
            {diseaseWeatherSource && !diseaseWeatherLoading && (
              <span style={{ fontSize: 12, color: 'var(--color-primary)' }}>📍 Погода: {diseaseWeatherSource}</span>
            )}
            {diseaseNdvi !== null && (
              <span style={{ fontSize: 12, color: getNdviColor(diseaseNdvi) }}>NDVI {diseaseNdvi.toFixed(2)}</span>
            )}
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>RandomForest · 29 болезней</span>
          </div>
        </div>

        {diseaseError && (
          <div className="card card-padding" style={{ borderLeft: '3px solid var(--color-danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)' }}>
              <AlertTriangle size={16} /> {diseaseError}
            </div>
          </div>
        )}

        {diseaseNdvi !== null && diseaseNdvi < 0.3 && diseaseResult && (
          <div className="card card-padding" style={{ borderLeft: '3px solid #f39c12', background: '#fffbf0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#856404' }}>
              <AlertTriangle size={15} /> Низкий NDVI ({diseaseNdvi.toFixed(2)}) — стресс растений повышает восприимчивость к болезням
            </div>
          </div>
        )}

        {diseaseResult && diseaseRisk && <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12 }}>
            <div className="card card-padding" style={{ textAlign: 'center' }}><Sprout size={18} color="var(--color-primary)" /><div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{diseaseCropLabel}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{diseaseStageLabel}</div></div>
            <div className="card card-padding" style={{ textAlign: 'center' }}><Thermometer size={18} color="#e67e22" /><div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{diseaseTemp}°C</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Температура</div></div>
            <div className="card card-padding" style={{ textAlign: 'center' }}><Droplets size={18} color="#3498db" /><div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{diseaseHumidity}%</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Влажность</div></div>
            <div className="card card-padding" style={{ textAlign: 'center' }}><CloudRain size={18} color="#2980b9" /><div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{diseaseRainfall} мм</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Осадки</div></div>
          </div>

          <div className="card card-padding" style={{ borderLeft: `4px solid ${diseaseRisk.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {diseaseResult.disease === 'none' ? <ShieldCheck size={28} color="#27ae60" /> : <Bug size={28} color={diseaseRisk.color} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{diseaseResult.disease === 'none' ? 'Болезнь не обнаружена' : diseaseResult.disease}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>Уверенность модели: {(diseaseResult.disease_confidence * 100).toFixed(1)}%</div>
              </div>
              <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: diseaseRisk.color, background: diseaseRisk.bg, border: `1px solid ${diseaseRisk.color}30` }}>
                Риск: {diseaseRisk.label}
              </span>
            </div>
          </div>

          <div className="card card-padding">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Activity size={16} color={diseaseRisk.color} /><span style={{ fontWeight: 600, fontSize: 14 }}>Наиболее вероятные болезни</span></div>
            {diseaseResult.top3_diseases.map((d, i) => {
              const pct = d.probability * 100
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', background: i === 0 ? diseaseRisk.color : i === 1 ? '#95a5a6' : '#bdc3c7', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.disease === 'none' ? 'Нет болезни' : d.disease}</div>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 3, background: d.disease === 'none' ? '#27ae60' : diseaseRisk.color, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, minWidth: 50, textAlign: 'right' }}>{pct.toFixed(1)}%</div>
                </div>
              )
            })}
          </div>

          {/* Рекомендация по препарату */}
          {diseaseRecLoading && <div className="card card-padding" style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}><Loader2 size={16} style={{ display: 'inline', marginRight: 6 }} /> Загрузка рекомендации…</div>}
          {diseaseRecData && !diseaseRecLoading && (
            <div className="card" style={{ borderLeft: `4px solid ${diseaseRecData.opColor}` }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20 }}>{diseaseRecData.opEmoji}</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Рекомендуемая защита</span>
                <span style={{ background: diseaseRecData.opColor, color: '#fff', borderRadius: 20, padding: '2px 12px', fontSize: 12, fontWeight: 600 }}>{diseaseRecData.opLabel}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{diseaseCropLabel}</span>
              </div>
              <div style={{ padding: '10px 20px', fontSize: 13, color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>{diseaseRecData.reason}</div>
              {diseaseRecData.products.map((p, i) => (
                <div key={i} style={{ padding: '14px 20px', borderBottom: i < diseaseRecData.products.length - 1 ? '1px solid var(--color-border)' : undefined, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: '#fff', background: diseaseRecData.opColor, borderRadius: 4, padding: '1px 7px' }}>{p.mechanism}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 5 }}>{p.activeIngredient}</div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                      <span style={{ color: diseaseRecData.opColor, fontWeight: 700 }}>{p.dose}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>📅 {p.timing}</span>
                      {p.phiDays > 0 && <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>⏳ ОЖЗ {p.phiDays} дн.</span>}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ flexShrink: 0, fontSize: 12 }} onClick={() => handleScheduleFromDisease(p, diseaseRecData)}>
                    <ClipboardList size={14} /> Запланировать
                  </button>
                </div>
              ))}
            </div>
          )}
        </>}

        {!diseaseResult && !diseaseLoading && !diseaseError && (
          <div className="card card-padding" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔬</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>ML-прогнозирование болезней</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>Погода подтянута автоматически по координатам поля. Нажмите «Прогнозировать».</div>
          </div>
        )}
      </>}

      {/* ══════════════════════════════════════════════════════════════════════
          ── TAB: ФЕНОЛОГИЯ ──
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'phenology' && <>
        <div className="card card-padding" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Посев</div>
            <select className="form-control" value={phenoHistoryId ?? ''} onChange={e => setPhenoHistoryId(Number(e.target.value) || null)}>
              <option value="">— выберите посев —</option>
              {cropHistories.map(h => <option key={h.id} value={h.id}>{h.cropTypeName} ({h.plantingDate?.slice(0,10)})</option>)}
            </select>
          </div>
          {phenoHistoryId && (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditPhenoId(null); setPhenoForm({ cropHistoryId: phenoHistoryId, observationDate: todayStr(), bbchScale: 0, bbchDescription: '', observationMethod: ObservationMethod.VISUAL, notes: '', weatherConditions: '' }); setPhenoError(null); setShowPhenoForm(v => !v) }}>
              <Plus size={14} /> Добавить наблюдение
            </button>
          )}
        </div>

        {showPhenoForm && (
          <div className="card card-padding">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{editPhenoId ? 'Редактировать наблюдение' : 'Новое BBCH-наблюдение'}</div>
            {phenoError && <div style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 8 }}>{phenoError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
              <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Дата*</div><input type="date" className="form-control" value={phenoForm.observationDate} onChange={e => setPhenoForm(f => ({ ...f, observationDate: e.target.value }))} /></div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Метод</div>
                <select className="form-control" value={phenoForm.observationMethod ?? ''} onChange={e => setPhenoForm(f => ({ ...f, observationMethod: e.target.value as ObservationMethod }))}>
                  {Object.values(ObservationMethod).map(m => <option key={m} value={m}>{BBCH_METHOD_LABELS[m]}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>BBCH-код*</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="number" className="form-control" min={0} max={99} style={{ width: 70 }} value={phenoForm.bbchScale} onChange={e => setPhenoForm(f => ({ ...f, bbchScale: Number(e.target.value) }))} />
                  <select className="form-control" value="" onChange={e => { const val = Number(e.target.value); if (val != null) { const p = BBCH_PRESETS.find(p => p.code === val); setPhenoForm(f => ({ ...f, bbchScale: val, bbchDescription: p ? p.label.split(' — ')[1] : f.bbchDescription })) } }}>
                    <option value="">— быстрый выбор —</option>
                    {BBCH_PRESETS.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Описание фазы</div><input className="form-control" placeholder="Начало кущения…" value={phenoForm.bbchDescription ?? ''} onChange={e => setPhenoForm(f => ({ ...f, bbchDescription: e.target.value }))} /></div>
              <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Погода</div><input className="form-control" placeholder="Темп. 12°C, после дождя…" value={phenoForm.weatherConditions ?? ''} onChange={e => setPhenoForm(f => ({ ...f, weatherConditions: e.target.value }))} /></div>
              <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3 }}>Примечание</div><input className="form-control" value={phenoForm.notes ?? ''} onChange={e => setPhenoForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSavePheno} disabled={savingPheno}><Save size={12} /> {savingPheno ? 'Сохранение…' : 'Сохранить'}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPhenoForm(false)}><X size={12} /> Отмена</button>
            </div>
          </div>
        )}

        {phenoLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={28} className="spin" /></div>
        ) : !phenoHistoryId ? (
          <div className="card card-padding" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 48 }}>
            <Leaf size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div>Выберите посев для просмотра фенологических наблюдений</div>
          </div>
        ) : phenoObservations.length === 0 ? (
          <div className="card card-padding" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Нет наблюдений. Добавьте первое BBCH-наблюдение.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {phenoObservations.map(obs => (
              <div key={obs.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: 8, width: 52, height: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{obs.bbchScale}</span>
                  <span style={{ fontSize: 9, opacity: 0.8 }}>BBCH</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{obs.bbchDescription || `BBCH ${obs.bbchScale}`}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {obs.observationDate}
                    {obs.observationMethod && <span style={{ marginLeft: 8 }}>· {BBCH_METHOD_LABELS[obs.observationMethod]}</span>}
                    {obs.weatherConditions && <span style={{ marginLeft: 8 }}>· {obs.weatherConditions}</span>}
                  </div>
                  {obs.notes && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{obs.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setPhenoForm({ cropHistoryId: obs.cropHistoryId, observationDate: obs.observationDate, bbchScale: obs.bbchScale, bbchDescription: obs.bbchDescription ?? '', observationMethod: obs.observationMethod, notes: obs.notes ?? '', weatherConditions: obs.weatherConditions ?? '' }); setEditPhenoId(obs.id); setPhenoError(null); setShowPhenoForm(true) }}><Pencil size={14} /></button>
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDeletePheno(obs.id)}><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>}

    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 0', borderBottom: '1px solid var(--color-border)',
      fontSize: 13,
    }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}
