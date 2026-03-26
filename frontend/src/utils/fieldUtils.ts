export const SOIL_TEXTURE_LABELS: Record<string, string> = {
  'clay':              'Глина',
  'silty clay':        'Иловато-глинистая',
  'sandy clay':        'Песчано-глинистая',
  'clay loam':         'Глинисто-суглинистая',
  'silty clay loam':   'Иловато-глинисто-суглинистая',
  'sandy clay loam':   'Песчано-глинисто-суглинистая',
  'loam':              'Суглинок',
  'silt loam':         'Иловато-суглинистая',
  'silt':              'Ил',
  'sandy loam':        'Супесчано-суглинистая',
  'loamy sand':        'Суглинисто-песчаная',
  'sand':              'Песок',
  'chernozem':         'Чернозём',
  'solonetz':          'Солонец',
  'solonchak':         'Солончак',
  'solod':             'Солодь',
  'loamy':             'Суглинок',
  'peat':              'Торфяная',
  'peaty':             'Торфяно-болотная',
}

export function getSoilTextureLabel(texture: string | null | undefined): string {
  if (!texture) return '—'
  return SOIL_TEXTURE_LABELS[texture.toLowerCase().trim()] ?? texture
}

export const FIELD_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активное',
  INACTIVE: 'Неактивное',
  FALLOW: 'Под паром',
  PENDING: 'Планируется',
}

export function getFieldStatusLabel(status: string | undefined | null): string {
  if (!status) return '—'
  return FIELD_STATUS_LABELS[status] ?? status
}
