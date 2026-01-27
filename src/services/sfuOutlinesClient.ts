import type { OutlinesListItem, OutlinesSectionDetail } from '../types/sfuOutlines'

const BASE_URL = 'https://www.sfu.ca/bin/wcm/course-outlines'
const TTL_MS = 24 * 60 * 60 * 1000

type CacheEntry<T> = { timestamp: number; data: T }

const memoryCache = new Map<string, CacheEntry<unknown>>()

const getStorageKey = (url: string) => `plan4sfu.outlines.${url}`

async function cachedFetch<T>(url: string): Promise<T> {
  const now = Date.now()
  const memEntry = memoryCache.get(url)
  if (memEntry && now - memEntry.timestamp < TTL_MS) {
    return memEntry.data as T
  }

  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(getStorageKey(url))
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CacheEntry<T>
        if (now - parsed.timestamp < TTL_MS) {
          memoryCache.set(url, parsed as CacheEntry<unknown>)
          return parsed.data
        }
      } catch {
        // ignore invalid cache
      }
    }
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Outlines API error: ${response.status}`)
  }
  const data = (await response.json()) as T
  const entry: CacheEntry<T> = { timestamp: now, data }
  memoryCache.set(url, entry as CacheEntry<unknown>)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(getStorageKey(url), JSON.stringify(entry))
  }
  return data
}

export function getYears() {
  return cachedFetch<OutlinesListItem[]>(BASE_URL)
}

export function getTerms(year: number) {
  return cachedFetch<OutlinesListItem[]>(`${BASE_URL}/${year}`)
}

export function getDepartments(year: number, term: string) {
  return cachedFetch<OutlinesListItem[]>(`${BASE_URL}/${year}/${term}`)
}

export function getCourseNumbers(year: number, term: string, dept: string) {
  return cachedFetch<OutlinesListItem[]>(
    `${BASE_URL}/${year}/${term}/${dept}`,
  )
}

export function getSections(
  year: number,
  term: string,
  dept: string,
  courseNumber: string,
) {
  return cachedFetch<OutlinesListItem[]>(
    `${BASE_URL}/${year}/${term}/${dept}/${courseNumber}`,
  )
}

export function getSectionDetail(
  year: number,
  term: string,
  dept: string,
  courseNumber: string,
  section: string,
) {
  return cachedFetch<OutlinesSectionDetail>(
    `${BASE_URL}/${year}/${term}/${dept}/${courseNumber}/${section}`,
  )
}
